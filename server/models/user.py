from pydantic import BaseModel, EmailStr
from typing import Literal

Role = Literal["admin", "contributor"]


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserInDB(BaseModel):
    email: str
    hashed_password: str
    role: Role = "contributor"


class UserResponse(BaseModel):
    email: str
    role: Role


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
