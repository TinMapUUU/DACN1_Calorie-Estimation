from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
from enum import Enum



# ===================== ENUMS =====================
class GoalType(str, Enum):
    lose_weight = "lose_weight"
    maintain_weight = "maintain_weight"
    gain_weight = "gain_weight"

class MealType(str, Enum):
    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"
    snack = "snack"

class Gender(str, Enum):
    male = "male"
    female = "female"
    other = "other"

# ===================== MODELS =====================
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    phone_number: str = Field(unique=True, index=True) 
    password_hash: str
    full_name: Optional[str] = None
    birth_year: int
    gender: Gender
    created_at: datetime = Field(default_factory=datetime.now)
    
    # Cột phục vụ Quên mật khẩu
    reset_code: Optional[str] = None
    reset_code_expires: Optional[datetime] = None
    
    # Quan hệ
    profile: Optional["UserProfile"] = Relationship(back_populates="user")
    meals: List["MealLog"] = Relationship(back_populates="user")


class UserProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    height_cm: float
    weight_kg: float
    goal_type: GoalType = GoalType.maintain_weight
    
    # Mục tiêu cụ thể
    target_weight: Optional[float] = None  # Cân nặng mục tiêu (kg)
    goal_duration_months: Optional[int] = None  # Thời lượng: 3, 6, 9, 12 tháng
    start_date: Optional[datetime] = None  # Ngày bắt đầu (khi user nhấn "Lưu")
    
    daily_calorie_goal: int
    current_bmi: float
    activity_level: float = 1.5
    updated_at: datetime = Field(default_factory=datetime.now)
    
    user: User = Relationship(back_populates="profile")


class MealLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    
    # Thông tin thức ăn
    food_name: str = Field(index=True)
    calories: float
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    meal_type: MealType = Field(index=True)
    
    # Timestamp
    scanned_at: datetime = Field(default_factory=datetime.now, index=True)
    
    # Ảnh - được upload từ /api/v1/scan
    image_url: Optional[str] = Field(default=None, max_length=500, index=True)
    image_uploaded_at: Optional[datetime] = Field(default=None)  # Khi nào ảnh được upload
    original_filename: Optional[str] = Field(default=None, max_length=255)  # Tên file gốc của user
    
    # Đánh giá & Ghi chú
    rating: Optional[int] = Field(default=None, ge=1, le=5)  # Đánh giá 1-5 sao
    notes: Optional[str] = Field(default=None, max_length=500)  # Ghi chú bữa ăn
    
    # Quan hệ
    user: User = Relationship(back_populates="meals")