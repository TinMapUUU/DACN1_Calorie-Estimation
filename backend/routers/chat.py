"""Backend chat router: provide /api/v1/chat endpoint backed by ai_coach_service.

This module previously imported helpers from the wrong place and referenced
nonexistent model attributes. Updated to use `database.connection.get_session`
and `models.db_models` types, and to query `MealLog.scanned_at` for today's
meals. Also constructs a safe `user_data` payload for the AI service.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from database.connection import get_session
from services.ai_coach import ai_coach_service, AiQuotaExceeded, AiRateLimited, AiServiceError
from models.db_models import User, MealLog, UserProfile
from pydantic import BaseModel
from datetime import date, datetime
from typing import List, Optional

router = APIRouter(prefix="/api/v1", tags=["Chatbot"])


# Schema tiếp nhận từ Frontend
class ChatRequest(BaseModel):
    user_id: int  # Sau này có auth thì lấy từ JWT token, tạm thời truyền trực tiếp
    message: str
    history: Optional[List[dict]] = []  # [{ "is_user": True, "text": "..." }]


class MealHistoryResponse(BaseModel):
    """Response model for meal history"""
    user_id: int
    total_calories: int
    target_calories: int
    meals: List[dict]


@router.post("/chat")
def chat_with_coach(payload: ChatRequest, session: Session = Depends(get_session)):
    # 1. Lấy thông tin User từ DB
    user = session.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User không tồn tại")

    # Lấy profile (nếu có) để đọc mục tiêu calo / mục tiêu macros
    profile = getattr(user, "profile", None)
    if profile is None:
        profile = session.exec(select(UserProfile).where(UserProfile.user_id == user.id)).first()

    # Chuẩn bị user_data cho AI (sử dụng fallback nếu thiếu thông tin)
    user_data = {
        "name": getattr(user, "full_name", "Bạn"),
        "goal_type": getattr(profile, "goal_type", "maintain_weight"),
        "target_calories": getattr(profile, "daily_calorie_goal", 2000),
        "target_protein": getattr(profile, "target_protein", 150),
        "target_carbs": getattr(profile, "target_carbs", 200),
        "target_fat": getattr(profile, "target_fat", 60),
    }

    # 2. Lấy danh sách các món ăn HÔM NAY của User này (dựa vào `scanned_at`)
    today = date.today()
    start_dt = datetime(today.year, today.month, today.day, 0, 0, 0)
    end_dt = datetime(today.year, today.month, today.day, 23, 59, 59)

    statement = select(MealLog).where(
        MealLog.user_id == payload.user_id,
        MealLog.scanned_at >= start_dt,
        MealLog.scanned_at <= end_dt,
    ).order_by(MealLog.scanned_at)

    meals_db = session.exec(statement).all()

    # Convert dữ liệu DB thành list dict cho service xử lý
    meals = []
    for m in meals_db:
        meals.append({
            "food_name": m.food_name,
            "calories": m.calories,
            "protein": getattr(m, "protein_g", 0),
            "carbs": getattr(m, "carbs_g", 0),
            "fat": getattr(m, "fat_g", 0),
            "meal_type": m.meal_type.value if hasattr(m.meal_type, "value") else str(m.meal_type),
        })

    # 3. Gửi toàn bộ context qua Service và lấy kết quả từ Gemini
    try:
        ai_reply = ai_coach_service.generate_chat_response(
            user_data=user_data,
            meals=meals,
            user_message=payload.message,
            chat_history=payload.history or [],
            user_id=payload.user_id  # Enable rate limiting & caching
        )
        return {"reply": ai_reply}
    except AiRateLimited as rl:
        # Local rate limit exceeded (10 calls/min per user)
        raise HTTPException(status_code=429, detail=str(rl))
    except AiQuotaExceeded as qe:
        # Trả về status 429 khi provider báo quota/rate-limit
        raise HTTPException(status_code=429, detail=str(qe))
    except AiServiceError as se:
        # Lỗi dịch vụ AI chung (v.d. key missing, config issue)
        raise HTTPException(status_code=503, detail=str(se))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Lỗi nội bộ server")


@router.get("/meal-history/{user_id}")
def get_meal_history(user_id: int, session: Session = Depends(get_session)):
    """
    Lấy danh sách chi tiết các món ăn của user theo ngày hôm nay.
    Endpoint này phục vụ UI hiển thị lịch sử ăn uống chi tiết.
    """
    # Kiểm tra user tồn tại
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User không tồn tại")

    # Lấy profile để lấy target calories
    profile = session.exec(select(UserProfile).where(UserProfile.user_id == user_id)).first()
    target_calories = getattr(profile, "daily_calorie_goal", 2000) if profile else 2000

    # Lấy danh sách các món ăn HÔM NAY
    today = date.today()
    start_dt = datetime(today.year, today.month, today.day, 0, 0, 0)
    end_dt = datetime(today.year, today.month, today.day, 23, 59, 59)

    statement = select(MealLog).where(
        MealLog.user_id == user_id,
        MealLog.scanned_at >= start_dt,
        MealLog.scanned_at <= end_dt,
    ).order_by(MealLog.scanned_at)

    meals_db = session.exec(statement).all()

    # Format response
    meals = []
    total_calories = 0
    
    for m in meals_db:
        meal_data = {
            "id": m.id,
            "food_name": m.food_name,
            "calories": m.calories,
            "protein": getattr(m, "protein_g", 0),
            "carbs": getattr(m, "carbs_g", 0),
            "fat": getattr(m, "fat_g", 0),
            "meal_type": m.meal_type.value if hasattr(m.meal_type, "value") else str(m.meal_type),
            "scanned_at": m.scanned_at.isoformat() if m.scanned_at else None,
        }
        meals.append(meal_data)
        total_calories += m.calories

    return MealHistoryResponse(
        user_id=user_id,
        total_calories=total_calories,
        target_calories=target_calories,
        meals=meals
    )