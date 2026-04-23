import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from models.db_models import User

from models.schemas import UserCreate, UserLogin, Token
from security import get_password_hash, verify_password, create_access_token, get_current_user
from database.connection import engine, get_session

router = APIRouter(
    prefix="/api/v1",
    tags=["Authentication"]
)

# ==================== 1. API ĐĂNG KÝ (REGISTER) ====================
@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, session: Session = Depends(get_session)):
    statement = select(User).where(
        (User.email == user_data.email) | (User.phone_number == user_data.phone_number)
    )
    existing_user = session.exec(statement).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email hoặc số điện thoại đã được đăng ký."
        )

    hashed_password = get_password_hash(user_data.password)

    new_user = User(
        email=user_data.email,
        phone_number=user_data.phone_number,
        password_hash=hashed_password,
        full_name=user_data.full_name
    )
    
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    return {"message": "Đăng ký tài khoản thành công!", "user_id": new_user.id}


# ==================== 2. API ĐĂNG NHẬP (LOGIN) ====================
@router.post("/login", response_model=Token)
def login_user(user_data: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == user_data.email)).first()
    
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác."
        )

    # Vẫn giữ nguyên việc lưu ID vào sub
    access_token = create_access_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "full_name": user.full_name
    }


# ==================== 3. API LẤY THÔNG TIN USER HIỆN TẠI ====================
@router.get("/users/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "created_at": current_user.created_at
    }

# ==================== 4. API YÊU CẦU QUÊN MẬT KHẨU (GỬI LINK) ====================
@router.post("/forgot-password")
def forgot_password(data: dict, session: Session = Depends(get_session)):
    email = data.get("email")
    user = session.exec(select(User).where(User.email == email)).first()
    
    if not user:
        return {"message": "Nếu email tồn tại, link đặt lại mật khẩu đã được gửi!"}
    
    # Tạo Token ngẫu nhiên và lưu vào DB (Hạn 15 phút)
    reset_token = str(uuid.uuid4())
    user.reset_code = reset_token
    user.reset_code_expires = datetime.utcnow() + timedelta(minutes=15)
    
    session.add(user)
    session.commit()
    
    reset_link = f"http://localhost:3000/reset-password?token={reset_token}"
    
    print("\n" + "="*50)
    print(f"🔥 [MÔ PHỎNG EMAIL] Xin chào {user.full_name or 'bạn'},")
    print(f"Vui lòng click vào link sau để đặt lại mật khẩu:")
    print(f"👉 {reset_link}")
    print("="*50 + "\n")
    
    return {"message": "Link đặt lại mật khẩu đã được gửi tới email của bạn!"}


# ==================== 5. API ĐẶT LẠI MẬT KHẨU (NHẬN TOKEN TỪ URL) ====================
@router.post("/reset-password")
def reset_password(data: dict, session: Session = Depends(get_session)):
    token = data.get("token")
    new_password = data.get("new_password")
    
    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Thiếu token hoặc mật khẩu mới!")

    user = session.exec(select(User).where(User.reset_code == token)).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Đường link không hợp lệ!")
    
    if user.reset_code_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Đường link đã hết hạn!")
    
    # Đổi pass và xóa Token
    user.password_hash = get_password_hash(new_password)
    user.reset_code = None
    user.reset_code_expires = None
    
    session.add(user)
    session.commit()
    
    return {"message": "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay."}