"""Manual money entries: expenses (costs) and incomes (revenue outside the schedule)."""
from datetime import datetime
from typing import Callable, List, Literal
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.db.client import db
from app.core.deps import get_current_user
from app.api.settings import require_admin

ExpenseCategory = Literal["RENT", "SALARIES", "SUPPLIES", "MARKETING", "UTILITIES", "TAXES", "OTHER"]
IncomeCategory = Literal["SERVICES", "PRODUCTS", "SUBSCRIPTIONS", "OTHER"]


class EntryResponse(BaseModel):
    id: str
    description: str
    category: str
    amount: float
    date: str


def parse_date(value: str) -> datetime:
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date. Use YYYY-MM-DD.")


def serialize(e) -> dict:
    return {
        "id": e.id,
        "description": e.description,
        "category": e.category,
        "amount": e.amount,
        "date": e.date.strftime("%Y-%m-%d"),
    }


def make_router(prefix: str, label: str, model: Callable, category_type) -> APIRouter:
    """Same CRUD for expenses and incomes; `model` returns the prisma accessor (db.expense / db.income)."""
    router = APIRouter(prefix=prefix, tags=[label.title() + "s"])

    class EntryInput(BaseModel):
        description: str = Field(min_length=1, max_length=200)
        category: category_type = "OTHER"  # type: ignore[valid-type]
        amount: float = Field(gt=0)
        date: str  # YYYY-MM-DD

    async def get_owned(entry_id: str, company_id: str):
        entry = await model().find_first(where={"id": entry_id, "companyId": company_id})
        if not entry:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{label.title()} not found.")
        return entry

    @router.get("", response_model=List[EntryResponse])
    async def list_entries(current_user: dict = Depends(get_current_user)):
        company_id = require_admin(current_user)
        entries = await model().find_many(where={"companyId": company_id}, order={"date": "desc"}, take=200)
        return [serialize(e) for e in entries]

    @router.post("", response_model=EntryResponse)
    async def create_entry(data: EntryInput, current_user: dict = Depends(get_current_user)):
        company_id = require_admin(current_user)
        entry = await model().create(data={
            "description": data.description.strip(),
            "category": data.category,
            "amount": data.amount,
            "date": parse_date(data.date),
            "companyId": company_id,
        })
        return serialize(entry)

    @router.put("/{entry_id}", response_model=EntryResponse)
    async def update_entry(entry_id: str, data: EntryInput, current_user: dict = Depends(get_current_user)):
        company_id = require_admin(current_user)
        await get_owned(entry_id, company_id)
        entry = await model().update(where={"id": entry_id}, data={
            "description": data.description.strip(),
            "category": data.category,
            "amount": data.amount,
            "date": parse_date(data.date),
        })
        return serialize(entry)

    @router.delete("/{entry_id}")
    async def delete_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
        company_id = require_admin(current_user)
        await get_owned(entry_id, company_id)
        await model().delete(where={"id": entry_id})
        return {"message": f"{label.title()} deleted."}

    return router


router = make_router("/expenses", "expense", lambda: db.expense, ExpenseCategory)
income_router = make_router("/incomes", "income", lambda: db.income, IncomeCategory)
