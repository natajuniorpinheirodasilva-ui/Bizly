from fastapi import APIRouter, HTTPException, status
from app.schemas.auth import RegisterRequest, LoginRequest
from passlib.context import CryptContext
from app.db.client import db

router = APIRouter(prefix="/auth", tags=["Auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/register")
async def register(data: RegisterRequest):
    existing_user = await db.user.find_unique(where={
        "email": data.email
    })

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )

    hashed_password = pwd_context.hash(data.password)

    company = await db.company.create(
        data = {"name": data.company_name}
    )

    user = await db.user.create(
        data={
            "name": data.name,
            "email": data.email,
            "password": hashed_password,
            "company": {
                "connect": {
                    "id": company.id
                }
            }
        }
    )

    return {
        "message": "Account created"
    }

@router.post("/login")
async def login(data: LoginRequest):

    user = await db.user.find_unique(where={
        "email": data.email
    })

    if not user or not pwd_context.verify(data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    from app.core.security import create_access_token
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    }