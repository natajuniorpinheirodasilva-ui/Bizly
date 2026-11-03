from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.db.client import db
from app.core.deps import get_current_user
from app.api.settings import require_company, require_admin

router = APIRouter(prefix="/services", tags=["Services"])


class ServiceInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    duration: int = Field(ge=5, le=480)
    price: float = Field(ge=0)


class ServiceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    duration: int
    price: float


def serialize(s) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "description": s.description,
        "duration": s.duration,
        "price": s.price,
    }


async def get_owned_service(service_id: str, company_id: str):
    service = await db.service.find_first(where={"id": service_id, "companyId": company_id})
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")
    return service


@router.get("", response_model=List[ServiceResponse])
async def list_services(current_user: dict = Depends(get_current_user)):
    company_id = require_company(current_user)
    services = await db.service.find_many(where={"companyId": company_id}, order={"name": "asc"})
    return [serialize(s) for s in services]


@router.post("", response_model=ServiceResponse)
async def create_service(data: ServiceInput, current_user: dict = Depends(get_current_user)):
    company_id = require_admin(current_user)
    service = await db.service.create(
        data={
            "name": data.name.strip(),
            "description": data.description or None,
            "duration": data.duration,
            "price": data.price,
            "companyId": company_id,
        }
    )
    return serialize(service)


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(service_id: str, data: ServiceInput, current_user: dict = Depends(get_current_user)):
    company_id = require_admin(current_user)
    await get_owned_service(service_id, company_id)
    service = await db.service.update(
        where={"id": service_id},
        data={
            "name": data.name.strip(),
            "description": data.description or None,
            "duration": data.duration,
            "price": data.price,
        },
    )
    return serialize(service)


@router.delete("/{service_id}")
async def delete_service(service_id: str, current_user: dict = Depends(get_current_user)):
    company_id = require_admin(current_user)
    await get_owned_service(service_id, company_id)

    in_use = await db.appointment.count(where={"serviceId": service_id})
    if in_use:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This service is used by {in_use} appointment(s) and can't be deleted.",
        )

    await db.service.delete(where={"id": service_id})
    return {"message": "Service deleted."}
