from datetime import datetime, timedelta
from typing import Any, List, Optional, cast
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.db.client import db
from app.core.deps import get_current_user

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
