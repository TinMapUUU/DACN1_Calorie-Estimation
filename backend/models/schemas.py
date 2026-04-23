from pydantic import BaseModel, EmailStr
from typing import Optional

# Màng lọc cho dữ liệu Đăng ký
class UserCreate(BaseModel):
    email: EmailStr
    phone_number: str
    password: str
    full_name: Optional[str] = None

# Màng lọc cho dữ liệu Đăng nhập
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Màng lọc trả về Token
class Token(BaseModel):
    access_token: str
    token_type: str
    full_name: Optional[str] = None