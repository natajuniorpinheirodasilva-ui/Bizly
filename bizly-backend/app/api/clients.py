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

class ClientUpdate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    status: str

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
                "status": c.status,
                "created_at": c.createdAt.strftime("%b %d, %Y").lower() if c.createdAt else "n/a"
            }
            for c in customers
        ]
    except Exception as e:
        print(f"Search error, try again later. ({e})")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Intern error.")

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
            "status": new_customer.status,
            "created_at": new_customer.createdAt.strftime("%b %d, %Y").lower() if new_customer.createdAt else "n/a"
        }
    except Exception as e:
        print(f"Create error, try again later: ({e})")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(client_id: str, client: ClientUpdate, current_user: dict = Depends(get_current_user)):
    company_id: str | None = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")

    try:
        existing = await db.customer.find_first(
            where={
                "id": client_id,
                "companyId": company_id
            }
        )
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="client not found")

        updated_customer = await db.customer.update(
            where={"id": client_id},
            data={
                "name": client.name,
                "email": client.email,
                "phone": client.phone,
                "status": client.status
            }
        )

        if not updated_customer:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="failed to update client" )

        return {
            "id": str(updated_customer.id),
            "name": updated_customer.name,
            "email": updated_customer.email,
            "phone": updated_customer.phone,
            "status": updated_customer.status,
            "created_at": updated_customer.createdAt.strftime("%b %d, %Y").lower() if updated_customer.createdAt else "n/a"
        }

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(get_current_user)):
    company_id: str | None = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")

    try:
        existing = await db.customer.find_first(
            where={
                "id": client_id,
                "companyId": company_id
            }
        )
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="client not found")

        await db.customer.delete(where={"id": client_id})
        return {"message": "client deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

