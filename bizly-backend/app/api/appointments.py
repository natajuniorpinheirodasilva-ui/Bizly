from datetime import datetime, timedelta
from typing import Any, List, Optional, cast
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.db.client import db
from app.core.deps import get_current_user
from fastapi.responses import StreamingResponse
import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

router = APIRouter(prefix="/appointments", tags=["appointments"])

class AppointmentCreate(BaseModel):
    clientName: str
    date: str
    time: str
    status: Optional[str] = "SCHEDULED"

class AppointmentUpdate(BaseModel):
    clientName: Optional[str] = None
    date: str
    time: str
    status: Optional[str] = "SCHEDULED"

class AppointmentResponse(BaseModel):
    id: str
    clientName: str
    date: str
    time: str
    status: str

@router.get("/export/pdf")
async def export_appointments_pdf(current_user: dict = Depends(get_current_user)):
    company_id: str | None = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    try:
        appointments = await db.appointment.find_many(
            where={"companyId": company_id},
            order={"startTime": "desc"}
        )

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
        elements = []

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor("#111827"),
            spaceAfter=15
        )

        elements.append(Paragraph("Appointments Report", title_style))
        elements.append(Spacer(1, 10))

        table_data = [["Client Name", "Date", "Time", "Status"]]
        for apt in appointments:
            table_data.append([
                str(apt.clientName or "n/a"),
                apt.startTime.strftime("%Y-%m-%d") if apt.startTime else "n/a",
                apt.startTime.strftime("%H:%M") if apt.startTime else "n/a",
                str(apt.status or "SCHEDULED")
            ])

        t = Table(table_data, colWidths=[150, 120, 100, 100])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#374151")),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor("#4B5563")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ]))

        elements.append(t)
        doc.build(elements)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=appointments-report.pdf"}
        )
    
    except Exception as e:
        print(f"PDF export error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate PDF: {str(e)}")

@router.get("", response_model=List[AppointmentResponse])
async def get_appointments(current_user: dict = Depends(get_current_user)):
    company_id: str | None = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    try:
        appointments = await db.appointment.find_many(
            where={"companyId": company_id},
            order={"startTime": "desc"},
            take=20,
            skip=0
        )

        return [
            {
                "id": apt.id,
                "clientName": apt.clientName,
                "date": apt.startTime.strftime("%Y-%m-%d"),
                "time": apt.startTime.strftime("%H:%M"),
                "status": apt.status
            }
            for apt in appointments
        ]
    
    except Exception as e:
        print(f"Error fetching appointments: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.post("", response_model=AppointmentResponse)
async def create_appointment(data: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    company_id: str | None = current_user.get("company_id")
    user_id: str | None = current_user.get("sub")

    if not company_id or not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    try:
        start_datetime = datetime.strptime(f"{data.date} {data.time}", "%Y-%m-%d %H:%M")
        end_datetime = start_datetime + timedelta(minutes=60)

        service = await db.service.find_first(where={"companyId": company_id})
        if not service:
            service = await db.service.create(
                data={
                    "name": "General Appointment",
                    "duration": 60,
                    "price": 0.0,
                    "companyId": company_id
                }
            )

        new_appointment = await db.appointment.create(
            data=cast(Any, {
                "clientName": data.clientName,
                "startTime": start_datetime,
                "endTime": end_datetime,
                "status": data.status or "SCHEDULED",
                "priceAtBooking": service.price,
                "companyId": company_id,
                "userId": user_id,
                "serviceId": service.id
            })
        )

        return {
            "id": new_appointment.id,
            "clientName": new_appointment.clientName,
            "date": new_appointment.startTime.strftime("%Y-%m-%d"),
            "time": new_appointment.startTime.strftime("%H:%M"),
            "status": new_appointment.status
        }
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date or time format. Use YYYY-MM-DD and HH:MM")
    except Exception as e:
        print(f"Error creating appointment: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(appointment_id: str, data: AppointmentUpdate, current_user: dict = Depends(get_current_user)):
    company_id: str | None = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    try:
        existing = await db.appointment.find_first(
            where={
                "id": appointment_id,
                "companyId": company_id
            }
        )

        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

        start_datetime = datetime.strptime(f"{data.date} {data.time}", "%Y-%m-%d %H:%M")
        end_datetime = start_datetime + timedelta(minutes=60)

        updated = await db.appointment.update(
            where={"id": appointment_id},
            data=cast(Any, {
                "clientName": data.clientName if data.clientName else existing.clientName,
                "startTime": start_datetime,
                "endTime": end_datetime,
                "status": data.status or existing.status
            })
        )

        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

        return {
            "id": updated.id,
            "clientName": updated.clientName,
            "date": updated.startTime.strftime("%Y-%m-%d"),
            "time": updated.startTime.strftime("%H:%M"),
            "status": updated.status
        }
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date or time format.")
    except Exception as e:
        print(f"Error updating appointment: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/{appointment_id}")
async def delete_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    company_id: str | None = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    try:
        existing = await db.appointment.find_first(
            where={
                "id": appointment_id,
                "companyId": company_id
            }
        )
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

        await db.appointment.delete(where={"id": appointment_id})
        return {"message": "Appointment deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
