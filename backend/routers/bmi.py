from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import datetime
from dateutil.relativedelta import relativedelta

# Import các file cấu hình của bạn
from database.connection import get_session
from models.db_models import User, UserProfile, GoalType, Gender
from security import get_current_user
from utils.calorie_calculator import calculate_daily_calories, calculate_daily_calories_with_target

# Tạo router
router = APIRouter()

# Schema để kiểm tra dữ liệu từ Frontend gửi lên
class ProfileUpdate(BaseModel):
    weight_kg: float
    height_cm: float
    goal_type: GoalType
    target_weight: float = None  # Mục tiêu cân nặng (kg)
    goal_duration_months: int = None  # Thời lượng (3, 6, 9, 12)

@router.post("/profile/bmi")
def update_user_bmi_and_goal(
    data: ProfileUpdate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Tính toán BMI
    height_m = data.height_cm / 100
    if height_m <= 0:
        raise HTTPException(status_code=400, detail="Chiều cao không hợp lệ")
    
    calculated_bmi = round(data.weight_kg / (height_m * height_m), 1)

    # 2. Tính lượng Calo mục tiêu
    if data.goal_type == GoalType.maintain_weight:
        target_calories = calculate_daily_calories(
            weight_kg=data.weight_kg,
            height_cm=data.height_cm,
            birth_year=current_user.birth_year,
            gender=current_user.gender,
            goal_type=data.goal_type,
            activity_level=1.5
        )
    else:
        if not data.target_weight or not data.goal_duration_months:
            raise HTTPException(
                status_code=400, 
                detail="Vui lòng cung cấp cân nặng mục tiêu và thời lượng khi không phải duy trì"
            )
        
        if data.goal_duration_months not in [3, 6, 9, 12]:
            raise HTTPException(
                status_code=400,
                detail="Thời lượng phải là 3, 6, 9 hoặc 12 tháng"
            )
        
        target_calories = calculate_daily_calories_with_target(
            weight_kg=data.weight_kg,
            height_cm=data.height_cm,
            birth_year=current_user.birth_year,
            gender=current_user.gender,
            goal_type=data.goal_type,
            target_weight=data.target_weight,
            goal_duration_months=data.goal_duration_months,
            activity_level=1.5
        )

    # 3. Tìm Profile hiện tại của user trong database
    profile = session.exec(select(UserProfile).where(UserProfile.user_id == current_user.id)).first()
    
    if profile:
        profile.weight_kg = data.weight_kg
        profile.height_cm = data.height_cm
        profile.goal_type = data.goal_type
        profile.target_weight = data.target_weight
        profile.goal_duration_months = data.goal_duration_months
        profile.start_date = datetime.utcnow()
        profile.current_bmi = calculated_bmi
        profile.daily_calorie_goal = target_calories
        profile.updated_at = datetime.utcnow()
    else:
        profile = UserProfile(
            user_id=current_user.id,
            weight_kg=data.weight_kg,
            height_cm=data.height_cm,
            goal_type=data.goal_type,
            target_weight=data.target_weight,
            goal_duration_months=data.goal_duration_months,
            start_date=datetime.utcnow(),
            current_bmi=calculated_bmi,
            daily_calorie_goal=target_calories
        )
        session.add(profile)
        
    session.commit()
    session.refresh(profile)
    
    end_date = None
    if profile.start_date and profile.goal_duration_months:
        end_date = profile.start_date + relativedelta(months=profile.goal_duration_months)
    
    return {
        "message": "Cập nhật thành công", 
        "current_bmi": profile.current_bmi,
        "daily_calorie_goal": profile.daily_calorie_goal,
        "target_weight": profile.target_weight,
        "goal_duration_months": profile.goal_duration_months,
        "start_date": profile.start_date.isoformat() if profile.start_date else None,
        "end_date": end_date.isoformat() if end_date else None
    }


@router.get("/profile/bmi")  # ← THÊM MỚI: frontend gọi GET /api/v1/profile/bmi
def get_bmi_profile(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Trả về thông tin BMI + mục tiêu để BmiPage tự load khi vào trang"""
    profile = session.exec(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Chưa có hồ sơ")

    end_date = None
    if profile.start_date and profile.goal_duration_months:
        end_date = profile.start_date + relativedelta(months=profile.goal_duration_months)

    return {
        "weight_kg":            profile.weight_kg,
        "height_cm":            profile.height_cm,
        "goal_type":            profile.goal_type,
        "target_weight":        profile.target_weight,
        "goal_duration_months": profile.goal_duration_months,
        "daily_calorie_goal":   profile.daily_calorie_goal,
        "start_date":           profile.start_date.isoformat() if profile.start_date else None,
        "end_date":             end_date.isoformat() if end_date else None,
    }


@router.get("/profile")
def get_user_profile(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Lấy profile của user hiện tại"""
    profile = session.exec(select(UserProfile).where(UserProfile.user_id == current_user.id)).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile chưa được thiết lập. Vui lòng cập nhật thông tin cá nhân.")
    
    return {
        "user_id":            profile.user_id,
        "height_cm":          profile.height_cm,
        "weight_kg":          profile.weight_kg,
        "current_bmi":        profile.current_bmi,
        "daily_calorie_goal": profile.daily_calorie_goal,
        "goal_type":          profile.goal_type,
        "activity_level":     profile.activity_level,
        "updated_at":         profile.updated_at.isoformat() if profile.updated_at else None
    }