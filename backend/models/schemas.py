from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from enum import Enum

class Gender(str, Enum):
    male = "male"
    female = "female"
    other = "other"

# Màng lọc cho dữ liệu Đăng ký
class UserCreate(BaseModel):
    email: EmailStr
    phone_number: str
    password: str
    full_name: Optional[str] = None
    birth_year: int = Field(..., ge=1950, le=2016)
    gender: Gender

# Màng lọc cho dữ liệu Đăng nhập
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Màng lọc trả về thông tin người dùng
class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    birth_year: int
    gender: Gender
    phone_number: str
    created_at: str

# Màng lọc trả về Token
class Token(BaseModel):
    access_token: str
    token_type: str
    full_name: Optional[str] = None
    birth_year: int
    gender: Gender