from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from app.db.client import db 
from app.core.deps import get_current_user

router = APIRouter(prefix="/clients", tags=["clients"])

class ClientCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None

class ClientResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    status: str
    created_at: str

@router.get("", response_model=List[ClientResponse])
async def get_clients(current_user: dict = Depends(get_current_user)):
    company_id: str | None = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    try:
        customers = await db.customer.find_many(
            where={"companyId": company_id},
            order={"createdAt": "desc"}
        )
        
        return [
            {
                "id": str(c.id),
                "name": c.name,
                "email": c.email,
                "phone": c.phone if c.phone else "n/a",
                "status": "Active",
                "created_at": c.createdAt.strftime("%b %d, %Y").lower() if c.createdAt else "n/a"
            }
            for c in customers
        ]
    except Exception as e:
        print(f"Search error, try again later. ({e})")
        raise HTTPException(status_code=500, detail="Intern error.")

@router.post("", response_model=ClientResponse)
async def create_client(client: ClientCreate, current_user: dict = Depends(get_current_user)):
    company_id: str | None = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    try:
        new_customer = await db.customer.create(
            data={
                "name": client.name,
                "email": client.email,
                "phone": client.phone,
                "companyId": company_id
            }
        )
        
        return {
            "id": str(new_customer.id),
            "name": new_customer.name,
            "email": new_customer.email,
            "phone": new_customer.phone if new_customer.phone else "n/a",
            "status": "Active",
            "created_at": new_customer.createdAt.strftime("%b %d, %Y").lower() if new_customer.createdAt else "n/a"
        }
    except Exception as e:
        print(f"Create error, try again later: ({e})")
        raise HTTPException(status_code=400, detail=str(e))
