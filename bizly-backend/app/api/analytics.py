from collections import defaultdict
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.db.client import db
from app.core.deps import get_current_user
from app.api.settings import require_admin

router = APIRouter(prefix="/analytics", tags=["Analytics"])

CANCELLED = "CANCELLED"
ALLOWED_PERIODS = (3, 6, 12)


def month_key(d: datetime) -> str:
    return d.strftime("%Y-%m")


def period_months(months: int) -> list[str]:
    """Month keys from (months - 1) months ago up to the current month, oldest first."""
    now = datetime.now()
    year, month = now.year, now.month
    keys = []
    for _ in range(months):
        keys.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            month, year = 12, year - 1
    return list(reversed(keys))


def next_month_start(key: str) -> datetime:
    year, month = map(int, key.split("-"))
    return datetime(year + (month == 12), 1 if month == 12 else month + 1, 1)


@router.get("")
async def get_analytics(
    months: int = Query(6),
    current_user: dict = Depends(get_current_user),
):
    company_id = require_admin(current_user)
    if months not in ALLOWED_PERIODS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"months must be one of {list(ALLOWED_PERIODS)}",
        )

    keys = period_months(months)
    start = datetime.strptime(keys[0], "%Y-%m")
    end = next_month_start(keys[-1])
    in_period = {"gte": start, "lt": end}

    company = await db.company.find_unique(where={"id": company_id})
    appointments = await db.appointment.find_many(
        where={"companyId": company_id, "startTime": in_period},
        include={"service": True},
    )
    expenses = await db.expense.find_many(where={"companyId": company_id, "date": in_period})
    new_clients = await db.customer.find_many(where={"companyId": company_id, "createdAt": in_period})
    total_clients = await db.customer.count(where={"companyId": company_id})
    total_services = await db.service.count(where={"companyId": company_id})

    monthly = {k: {"month": k, "revenue": 0.0, "expenses": 0.0, "appointments": 0, "newClients": 0} for k in keys}
    by_service: dict[str, dict] = {}
    # 7 days x 24 hours, 0 = Sunday (same convention as business hours)
    heat = defaultdict(int)
    status_count = defaultdict(int)

    for apt in appointments:
        status_count[apt.status] += 1
        if apt.status == CANCELLED:
            continue

        k = month_key(apt.startTime)
        if k in monthly:
            monthly[k]["revenue"] += apt.priceAtBooking
            monthly[k]["appointments"] += 1

        day = (apt.startTime.weekday() + 1) % 7  # python: Monday = 0
        heat[(day, apt.startTime.hour)] += 1

        name = apt.service.name if apt.service else "Unknown"
        entry = by_service.setdefault(name, {"name": name, "appointments": 0, "revenue": 0.0})
        entry["appointments"] += 1
        entry["revenue"] += apt.priceAtBooking

    expenses_by_category = defaultdict(float)
    for e in expenses:
        k = month_key(e.date)
        if k in monthly:
            monthly[k]["expenses"] += e.amount
        expenses_by_category[e.category] += e.amount

    for c in new_clients:
        k = month_key(c.createdAt)
        if k in monthly:
            monthly[k]["newClients"] += 1

    monthly_list = []
    for k in keys:
        m = monthly[k]
        m["revenue"] = round(m["revenue"], 2)
        m["expenses"] = round(m["expenses"], 2)
        m["profit"] = round(m["revenue"] - m["expenses"], 2)
        monthly_list.append(m)

    revenue = round(sum(m["revenue"] for m in monthly_list), 2)
    total_expenses = round(sum(m["expenses"] for m in monthly_list), 2)

    return {
        "currency": company.currency if company else "BRL",
        "months": months,
        "totals": {
            "revenue": revenue,
            "expenses": total_expenses,
            "profit": round(revenue - total_expenses, 2),
            "appointments": sum(m["appointments"] for m in monthly_list),
            "cancelled": status_count.get(CANCELLED, 0),
            "clients": total_clients,
            "newClients": len(new_clients),
            "services": total_services,
        },
        "monthly": monthly_list,
        "peakHours": [
            {"dayOfWeek": d, "hour": h, "count": n} for (d, h), n in sorted(heat.items())
        ],
        "byService": sorted(by_service.values(), key=lambda s: s["appointments"], reverse=True),
        "expensesByCategory": sorted(
            [{"category": c, "amount": round(a, 2)} for c, a in expenses_by_category.items()],
            key=lambda x: x["amount"],
            reverse=True,
        ),
        "status": dict(status_count),
    }
