import io
from datetime import datetime, timedelta
from typing import Any, List, Literal, Optional, cast

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.deps import get_current_user
from app.db.client import db

router = APIRouter(prefix="/appointments", tags=["appointments"])

Status = Literal["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]
# appointments with these statuses don't hold the time slot
INACTIVE_STATUSES = ["CANCELLED", "NO_SHOW"]

DATE_FMT = "%Y-%m-%d"
TIME_FMT = "%H:%M"


# ---------- schemas ----------

class AppointmentInput(BaseModel):
    # either an existing client or a walk-in name
    customerId: Optional[str] = None
    clientName: Optional[str] = Field(default=None, max_length=120)
    serviceId: Optional[str] = None
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    duration: Optional[int] = Field(default=None, ge=5, le=720)  # minutes; defaults to the service duration
    price: Optional[float] = Field(default=None, ge=0)  # defaults to the service price
    status: Status = "SCHEDULED"
    notes: Optional[str] = Field(default=None, max_length=1000)
    allowOutsideHours: bool = False


class StatusUpdate(BaseModel):
    status: Status


class AppointmentResponse(BaseModel):
    id: str
    customerId: Optional[str]
    clientName: str
    clientEmail: Optional[str]
    clientPhone: Optional[str]
    serviceId: str
    serviceName: str
    date: str
    time: str
    endTime: str
    duration: int
    price: float
    status: str
    notes: Optional[str]


# ---------- helpers ----------

def require_ids(current_user: dict) -> tuple[str, str]:
    company_id = current_user.get("company_id")
    user_id = current_user.get("sub")
    if not company_id or not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")
    return company_id, user_id


def parse_start(date: str, time: str) -> datetime:
    try:
        return datetime.strptime(f"{date} {time}", f"{DATE_FMT} {TIME_FMT}")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date or time. Use YYYY-MM-DD and HH:MM.")


def parse_day(value: str) -> datetime:
    try:
        return datetime.strptime(value, DATE_FMT)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date. Use YYYY-MM-DD.")


def serialize(apt) -> dict:
    duration = int((apt.endTime - apt.startTime).total_seconds() // 60)
    return {
        "id": apt.id,
        "customerId": apt.customerId,
        "clientName": apt.customer.name if apt.customer else apt.clientName,
        "clientEmail": apt.customer.email if apt.customer else None,
        "clientPhone": apt.customer.phone if apt.customer and apt.customer.phone != "n/a" else None,
        "serviceId": apt.serviceId,
        "serviceName": apt.service.name if apt.service else "Service",
        "date": apt.startTime.strftime(DATE_FMT),
        "time": apt.startTime.strftime(TIME_FMT),
        "endTime": apt.endTime.strftime(TIME_FMT),
        "duration": duration,
        "price": apt.priceAtBooking,
        "status": apt.status,
        "notes": apt.notes,
    }


INCLUDE = {"customer": True, "service": True}


async def get_owned(appointment_id: str, company_id: str):
    apt = await db.appointment.find_first(where={"id": appointment_id, "companyId": company_id}, include=INCLUDE)
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
    return apt


async def resolve_client(data: AppointmentInput, company_id: str) -> tuple[Optional[str], str]:
    if data.customerId:
        customer = await db.customer.find_first(where={"id": data.customerId, "companyId": company_id})
        if not customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")
        return customer.id, customer.name

    name = (data.clientName or "").strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a client or type a name.")
    return None, name


async def resolve_service(service_id: Optional[str], company_id: str):
    if service_id:
        service = await db.service.find_first(where={"id": service_id, "companyId": company_id})
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")
        return service

    # companies without a catalog still need to be able to book
    service = await db.service.find_first(where={"companyId": company_id, "name": "General Appointment"})
    if service:
        return service
    company = await db.company.find_unique(where={"id": company_id})
    return await db.service.create(
        data={
            "name": "General Appointment",
            "duration": company.defaultDuration if company else 60,
            "price": 0.0,
            "companyId": company_id,
        }
    )


async def ensure_no_conflict(company_id: str, start: datetime, end: datetime, exclude_id: Optional[str] = None):
    where: dict[str, Any] = {
        "companyId": company_id,
        "status": {"not_in": INACTIVE_STATUSES},
        "startTime": {"lt": end},
        "endTime": {"gt": start},
    }
    if exclude_id:
        where["NOT"] = [{"id": exclude_id}]

    clash = await db.appointment.find_first(where=cast(Any, where), include={"customer": True})
    if clash:
        name = clash.customer.name if clash.customer else clash.clientName
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This time overlaps with {name} "
                   f"({clash.startTime.strftime(TIME_FMT)}–{clash.endTime.strftime(TIME_FMT)}).",
        )


async def ensure_business_hours(company_id: str, start: datetime, end: datetime):
    hours = await db.availability.find_many(where={"companyId": company_id})
    if not hours:
        return  # business hours not configured: anything goes

    day = (start.weekday() + 1) % 7  # 0 = Sunday
    row = next((h for h in hours if h.dayOfWeek == day), None)
    if not row:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Your business is closed on this day.")

    crosses_midnight = end.date() != start.date()
    if crosses_midnight or start.strftime(TIME_FMT) < row.startTime or end.strftime(TIME_FMT) > row.endTime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Outside business hours ({row.startTime}–{row.endTime}).",
        )


async def build_data(data: AppointmentInput, company_id: str, exclude_id: Optional[str] = None) -> dict:
    customer_id, client_name = await resolve_client(data, company_id)
    service = await resolve_service(data.serviceId, company_id)

    start = parse_start(data.date, data.time)
    duration = data.duration or service.duration
    end = start + timedelta(minutes=duration)

    if data.status not in INACTIVE_STATUSES:
        await ensure_no_conflict(company_id, start, end, exclude_id)
        if not data.allowOutsideHours:
            await ensure_business_hours(company_id, start, end)

    return {
        "clientName": client_name,
        "customerId": customer_id,
        "serviceId": service.id,
        "startTime": start,
        "endTime": end,
        "priceAtBooking": data.price if data.price is not None else service.price,
        "status": data.status,
        "notes": (data.notes or "").strip() or None,
    }


# ---------- routes ----------

@router.get("", response_model=List[AppointmentResponse])
async def list_appointments(
    start: Optional[str] = Query(None, description="YYYY-MM-DD, inclusive"),
    end: Optional[str] = Query(None, description="YYYY-MM-DD, inclusive"),
    current_user: dict = Depends(get_current_user),
):
    company_id, _ = require_ids(current_user)

    if start and end:
        range_start = parse_day(start)
        range_end = parse_day(end) + timedelta(days=1)
        if range_end <= range_start:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End must be after start.")
        if (range_end - range_start).days > 93:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Range can't be longer than 3 months.")

        appointments = await db.appointment.find_many(
            where={"companyId": company_id, "startTime": {"gte": range_start, "lt": range_end}},
            include=INCLUDE,
            order={"startTime": "asc"},
        )
    else:
        # no range: most recent first (used by the overview page)
        appointments = await db.appointment.find_many(
            where={"companyId": company_id},
            include=INCLUDE,
            order={"startTime": "desc"},
            take=50,
        )

    return [serialize(a) for a in appointments]


@router.post("", response_model=AppointmentResponse)
async def create_appointment(data: AppointmentInput, current_user: dict = Depends(get_current_user)):
    company_id, user_id = require_ids(current_user)
    payload = await build_data(data, company_id)

    created = await db.appointment.create(
        data=cast(Any, {**payload, "companyId": company_id, "userId": user_id}),
        include=INCLUDE,
    )
    return serialize(created)


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(appointment_id: str, data: AppointmentInput, current_user: dict = Depends(get_current_user)):
    company_id, _ = require_ids(current_user)
    await get_owned(appointment_id, company_id)
    payload = await build_data(data, company_id, exclude_id=appointment_id)

    updated = await db.appointment.update(where={"id": appointment_id}, data=cast(Any, payload), include=INCLUDE)
    return serialize(updated)


@router.patch("/{appointment_id}/status", response_model=AppointmentResponse)
async def update_status(appointment_id: str, data: StatusUpdate, current_user: dict = Depends(get_current_user)):
    company_id, _ = require_ids(current_user)
    apt = await get_owned(appointment_id, company_id)

    # re-activating a cancelled appointment must not double-book the slot
    if apt.status in INACTIVE_STATUSES and data.status not in INACTIVE_STATUSES:
        await ensure_no_conflict(company_id, apt.startTime, apt.endTime, exclude_id=apt.id)

    updated = await db.appointment.update(where={"id": appointment_id}, data={"status": data.status}, include=INCLUDE)
    return serialize(updated)


@router.delete("/{appointment_id}")
async def delete_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    company_id, _ = require_ids(current_user)
    await get_owned(appointment_id, company_id)
    await db.appointment.delete(where={"id": appointment_id})
    return {"message": "Appointment deleted."}


@router.get("/export/pdf")
async def export_appointments_pdf(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    company_id, _ = require_ids(current_user)

    where: dict[str, Any] = {"companyId": company_id}
    title = "Appointments Report"
    if start and end:
        where["startTime"] = {"gte": parse_day(start), "lt": parse_day(end) + timedelta(days=1)}
        title = f"Appointments · {start} to {end}"

    appointments = await db.appointment.find_many(where=cast(Any, where), include=INCLUDE, order={"startTime": "asc"})

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("ReportTitle", parent=styles["Heading1"], fontSize=18,
                                 textColor=colors.HexColor("#111827"), spaceAfter=15)

    rows = [["Date", "Time", "Client", "Service", "Status", "Price"]]
    for a in appointments:
        s = serialize(a)
        rows.append([s["date"], f'{s["time"]}–{s["endTime"]}', s["clientName"], s["serviceName"],
                     s["status"].replace("_", " ").title(), f'{s["price"]:.2f}'])

    table = Table(rows, colWidths=[70, 75, 120, 120, 75, 60])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#374151")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("ALIGN", (-1, 0), (-1, -1), "RIGHT"),
        ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#4B5563")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
    ]))

    doc.build([Paragraph(title, title_style), Spacer(1, 10), table])
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=appointments-report.pdf"},
    )
