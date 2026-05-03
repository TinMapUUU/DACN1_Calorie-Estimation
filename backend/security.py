# security.py
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import hashlib
import base64
import os

# ===================== CONFIG =====================
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 ngày

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ===================== PASSWORD =====================
def _prepare_password(password: str) -> str:
    """SHA256 trước khi đưa vào bcrypt → tránh giới hạn 72 bytes."""
    digest = hashlib.sha256(password.encode("utf-8")).digest()
    return base64.b64encode(digest).decode("utf-8")  # luôn là 44 ký tự

def get_password_hash(password: str) -> str:
    """Hash password mới dùng SHA256 + bcrypt"""
    return pwd_context.hash(_prepare_password(password))

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    ✅ Verify password - support cả 2 method:
    1. SHA256 + bcrypt (mới)
    2. Bcrypt trực tiếp (cũ - backup)
    """
    # Method 1: Thử SHA256 + bcrypt (mới)
    try:
        prepared = _prepare_password(plain_password)
        if pwd_context.verify(prepared, hashed_password):
            return True
    except Exception:
        pass
    
    # Method 2: Thử bcrypt trực tiếp với truncate (cũ - backward compatibility)
    try:
        # Truncate password to 72 bytes (bcrypt limit)
        truncated = plain_password[:72]
        if pwd_context.verify(truncated, hashed_password):
            return True
    except Exception:
        pass
    
    # Cả 2 cách đều fail
    return False


# ===================== JWT =====================
def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ===================== GET CURRENT USER =====================
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from database.connection import get_session

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token không hợp lệ hoặc đã hết hạn",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: int = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    from models.db_models import User
    user = session.get(User, int(user_id))
    if user is None:
        raise credentials_exception
    return user