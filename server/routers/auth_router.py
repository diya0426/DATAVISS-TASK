from fastapi import APIRouter, Depends, HTTPException, status
from database import get_database
from auth import get_password_hash, verify_password, create_access_token
from models import UserCreate, UserResponse, Token

router = APIRouter()


@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    db = await get_database()
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    doc = {
        "email": user.email,
        "hashed_password": get_password_hash(user.password),
        "role": "admin",  # first user is admin; change to "contributor" if you want
    }
    await db.users.insert_one(doc)
    return UserResponse(email=user.email, role=doc["role"])


@router.post("/login", response_model=Token)
async def login(user: UserCreate):
    db = await get_database()
    found = await db.users.find_one({"email": user.email})
    if not found or not verify_password(user.password, found["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token({"sub": found["email"]}, role=found["role"])
    return Token(access_token=token)
