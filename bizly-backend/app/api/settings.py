import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.db.client import db
from app.core.deps import get_current_user
from app.api.auth import pwd_context

router = APIRouter(prefix="/settings", tags=["Settings"])

TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
SUPPORTED_CURRENCIES = {"BRL", "USD", "EUR", "GBP"}


def require_company(current_user: dict) -> str:
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")
    return company_id


def require_admin(current_user: dict) -> str:
    company_id = require_company(current_user)
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can change company settings.")
    return company_id


# ---------- company profile & preferences ----------

class CompanySettings(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=30)
    address: Optional[str] = Field(default=None, max_length=255)
    website: Optional[str] = Field(default=None, max_length=255)
    taxId: Optional[str] = Field(default=None, max_length=30)
    currency: str = "BRL"
    timezone: str = "America/Sao_Paulo"
    defaultDuration: int = Field(default=60, ge=5, le=480)

    @field_validator("email", "phone", "address", "website", "taxId", mode="before")
    @classmethod
    def empty_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("currency")
    @classmethod
    def valid_currency(cls, v: str):
        if v not in SUPPORTED_CURRENCIES:
            raise ValueError(f"Currency must be one of {sorted(SUPPORTED_CURRENCIES)}")
        return v


def serialize_company(c) -> dict:
    return {
        "name": c.name,
        "email": c.email,
        "phone": c.phone,
        "address": c.address,
        "website": c.website,
        "taxId": c.taxId,
        "currency": c.currency,
        "timezone": c.timezone,
        "defaultDuration": c.defaultDuration,
    }


@router.get("/company")
async def get_company(current_user: dict = Depends(get_current_user)):
    company_id = require_company(current_user)
    company = await db.company.find_unique(where={"id": company_id})
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")
    return serialize_company(company)


@router.put("/company")
async def update_company(data: CompanySettings, current_user: dict = Depends(get_current_user)):
    company_id = require_admin(current_user)
    updated = await db.company.update(
        where={"id": company_id},
        data={
            "name": data.name.strip(),
            "email": data.email,
            "phone": data.phone,
            "address": data.address,
            "website": data.website,
            "taxId": data.taxId,
            "currency": data.currency,
            "timezone": data.timezone,
            "defaultDuration": data.defaultDuration,
        },
    )
    return serialize_company(updated)


# ---------- business hours ----------

class BusinessHour(BaseModel):
    dayOfWeek: int = Field(ge=0, le=6)  # 0 = Sunday ... 6 = Saturday
    startTime: str
    endTime: str

    @field_validator("startTime", "endTime")
    @classmethod
    def valid_time(cls, v: str):
        if not TIME_RE.match(v):
            raise ValueError("Time must be in HH:MM format.")
        return v


@router.get("/hours", response_model=List[BusinessHour])
async def get_hours(current_user: dict = Depends(get_current_user)):
    company_id = require_company(current_user)
    rows = await db.availability.find_many(
        where={"companyId": company_id},
        order={"dayOfWeek": "asc"},
    )
    return [{"dayOfWeek": r.dayOfWeek, "startTime": r.startTime, "endTime": r.endTime} for r in rows]


@router.put("/hours", response_model=List[BusinessHour])
async def update_hours(hours: List[BusinessHour], current_user: dict = Depends(get_current_user)):
    """Replaces the whole week. Days that are not sent are considered closed."""
    company_id = require_admin(current_user)

    days = [h.dayOfWeek for h in hours]
    if len(days) != len(set(days)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Each day can only appear once.")

    for h in hours:
        if h.startTime >= h.endTime:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Opening time must be before closing time.",
            )

    async with db.tx() as tx:
        await tx.availability.delete_many(where={"companyId": company_id})
        for h in hours:
            await tx.availability.create(
                data={
                    "dayOfWeek": h.dayOfWeek,
                    "startTime": h.startTime,
                    "endTime": h.endTime,
                    "companyId": company_id,
                }
            )

    return sorted(hours, key=lambda h: h.dayOfWeek)


# ---------- user account ----------

class AccountUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr


class PasswordChange(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=8, max_length=128)


@router.get("/account")
async def get_account(current_user: dict = Depends(get_current_user)):
    user = await db.user.find_unique(where={"id": current_user.get("sub")})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return {"name": user.name, "email": user.email, "role": user.role}


@router.put("/account")
async def update_account(data: AccountUpdate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub")

    taken = await db.user.find_first(where={"email": data.email, "NOT": [{"id": user_id}]})
    if taken:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This email is already in use.")

    user = await db.user.update(
        where={"id": user_id},
        data={"name": data.name.strip(), "email": data.email},
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return {"name": user.name, "email": user.email, "role": user.role}


@router.put("/account/password")
async def change_password(data: PasswordChange, current_user: dict = Depends(get_current_user)):
    user = await db.user.find_unique(where={"id": current_user.get("sub")})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if not pwd_context.verify(data.currentPassword, user.password):
        # 400 instead of 401 so the frontend doesn't log the user out
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")

    await db.user.update(
        where={"id": user.id},
        data={"password": pwd_context.hash(data.newPassword)},
    )
    return {"message": "Password updated."}
