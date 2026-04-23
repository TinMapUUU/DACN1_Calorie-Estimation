from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# Import đúng chuẩn của SQLModel
from sqlmodel import Session, select
from database.connection import get_session
from models.db_models import User

# Thay "login" bằng đường dẫn API đăng nhập của bạn
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/login")

# Cấu hình băm mật khẩu
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Cấu hình Token (JWT)
SECRET_KEY = "SIEURE_GREENHOUSE_KEY" # Bạn có thể đổi cái này thành chuỗi bất kỳ
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # Token có hiệu lực 7 ngày

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# HÀM MỚI: Bắt token từ Request, giải mã và tìm User trong DB
def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực thông tin (Token không hợp lệ hoặc đã hết hạn)",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Giải mã token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Vì lúc đăng nhập bạn truyền user.id vào "sub", nên ở đây ta lấy ra user_id
        user_id_str: str = payload.get("sub") 
        if user_id_str is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
        
    # Truy vấn DB tìm user theo ID bằng sqlmodel
    user = session.exec(select(User).where(User.id == int(user_id_str))).first()
    
    if user is None:
        raise credentials_exception
        
    return user