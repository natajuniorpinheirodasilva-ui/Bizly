from fastapi import APIRouter, Depends, HTTPException, status
from app.db.client import db
from app.core.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    company_id: str | None = current_user.get("company_id")

    if not company_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    total_clients = await db.customer.count(where={"companyId": company_id})
    total_appointments = await db.appointment.count(where={"companyId": company_id})

    revenue_result = await db.appointment.find_many(where={"companyId": company_id})
    total_revenue = sum(a.priceAtBooking for a in revenue_result)

    return {
        "total_clients": total_clients,
        "total_appointments": total_appointments,
        "total_revenue": total_revenue,
    }
