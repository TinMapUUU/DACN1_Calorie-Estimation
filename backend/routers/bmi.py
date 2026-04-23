from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import datetime

# Import các file cấu hình của bạn
from database.connection import get_session
from models.db_models import User, UserProfile, GoalType
from security import get_current_user

# Tạo router
router = APIRouter()

# Schema để kiểm tra dữ liệu từ Frontend gửi lên
class ProfileUpdate(BaseModel):
    weight_kg: float
    height_cm: float
    goal_type: GoalType

@router.post("/profile/bmi")
def update_user_bmi_and_goal(
    data: ProfileUpdate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user) # Bắt buộc phải có token hợp lệ
):
    # 1. Tính toán BMI
    height_m = data.height_cm / 100
    if height_m <= 0:
        raise HTTPException(status_code=400, detail="Chiều cao không hợp lệ")
    
    calculated_bmi = round(data.weight_kg / (height_m * height_m), 1)

    # 2. Tính lượng Calo mục tiêu (Bạn có thể tinh chỉnh công thức này sau)
    target_calories = 2000 
    if data.goal_type == GoalType.lose_weight:
        target_calories = 1500
    elif data.goal_type == GoalType.gain_weight:
        target_calories = 2500

    # 3. Tìm Profile hiện tại của user trong database
    profile = session.exec(select(UserProfile).where(UserProfile.user_id == current_user.id)).first()
    
    if profile:
        # Nếu đã có -> Cập nhật dữ liệu mới
        profile.weight_kg = data.weight_kg
        profile.height_cm = data.height_cm
        profile.goal_type = data.goal_type
        profile.current_bmi = calculated_bmi
        profile.daily_calorie_goal = target_calories
        profile.updated_at = datetime.utcnow()
    else:
        # Nếu chưa có -> Tạo dòng mới
        profile = UserProfile(
            user_id=current_user.id,
            weight_kg=data.weight_kg,
            height_cm=data.height_cm,
            goal_type=data.goal_type,
            current_bmi=calculated_bmi,
            daily_calorie_goal=target_calories
        )
        session.add(profile)
        
    # Lưu vào pgAdmin
    session.commit()
    session.refresh(profile)
    
    # Trả kết quả về cho Frontend để hiển thị Alert
    return {
        "message": "Cập nhật thành công", 
        "current_bmi": profile.current_bmi,
        "daily_calorie_goal": profile.daily_calorie_goal
    }