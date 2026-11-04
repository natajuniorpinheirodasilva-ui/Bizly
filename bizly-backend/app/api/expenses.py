from datetime import datetime
from typing import List, Literal
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.db.client import db
from app.core.deps import get_current_user
from app.api.settings import require_admin

router = APIRouter(prefix="/expenses", tags=["Expenses"])

Category = Literal["RENT", "SALARIES", "SUPPLIES", "MARKETING", "UTILITIES", "TAXES", "OTHER"]


class ExpenseInput(BaseModel):
    description: str = Field(min_length=1, max_length=200)
    category: Category = "OTHER"
    amount: float = Field(gt=0)
    date: str  # YYYY-MM-DD


class ExpenseResponse(BaseModel):
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


async def get_owned(expense_id: str, company_id: str):
    expense = await db.expense.find_first(where={"id": expense_id, "companyId": company_id})
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found.")
    return expense


@router.get("", response_model=List[ExpenseResponse])
async def list_expenses(current_user: dict = Depends(get_current_user)):
    company_id = require_admin(current_user)
    expenses = await db.expense.find_many(
        where={"companyId": company_id},
        order={"date": "desc"},
        take=100,
    )
    return [serialize(e) for e in expenses]


@router.post("", response_model=ExpenseResponse)
async def create_expense(data: ExpenseInput, current_user: dict = Depends(get_current_user)):
    company_id = require_admin(current_user)
    expense = await db.expense.create(
        data={
            "description": data.description.strip(),
            "category": data.category,
            "amount": data.amount,
            "date": parse_date(data.date),
            "companyId": company_id,
        }
    )
    return serialize(expense)


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(expense_id: str, data: ExpenseInput, current_user: dict = Depends(get_current_user)):
    company_id = require_admin(current_user)
    await get_owned(expense_id, company_id)
    expense = await db.expense.update(
        where={"id": expense_id},
        data={
            "description": data.description.strip(),
            "category": data.category,
            "amount": data.amount,
            "date": parse_date(data.date),
        },
    )
    return serialize(expense)


@router.delete("/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    company_id = require_admin(current_user)
    await get_owned(expense_id, company_id)
    await db.expense.delete(where={"id": expense_id})
    return {"message": "Expense deleted."}
