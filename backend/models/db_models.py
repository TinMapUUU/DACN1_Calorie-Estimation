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

# ===================== MODELS =====================
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    phone_number: str = Field(unique=True, index=True) 
    password_hash: str
    full_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
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
    daily_calorie_goal: int
    current_bmi: float
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    user: User = Relationship(back_populates="profile")


class MealLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    food_name: str
    calories: float
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    meal_type: MealType
    scanned_at: datetime = Field(default_factory=datetime.utcnow)
    
    user: User = Relationship(back_populates="meals")