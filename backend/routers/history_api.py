# D:\Study\School_Project\Vscode\DACN1\backend\routers\history_api.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from datetime import datetime, date, timedelta
from typing import Optional
from collections import defaultdict

# Import từ project của bạn
from models.db_models import MealLog, UserProfile, User, MealType
from database.connection import get_session

router = APIRouter(prefix="/api/history", tags=["history"])

# ─── Helper ───────────────────────────────────────────────
def _start_of_day(d: date) -> datetime:
    return datetime(d.year, d.month, d.day, 0, 0, 0)

def _end_of_day(d: date) -> datetime:
    return datetime(d.year, d.month, d.day, 23, 59, 59)


# ─── 1. Dữ liệu biểu đồ 7 ngày / 30 ngày / 365 ngày ─────
@router.get("/chart/{user_id}")
def get_chart_data(
    user_id: int,
    period: str = Query("week", enum=["day", "week", "month", "year"]),
    session: Session = Depends(get_session),
):
    today = date.today()
    days = {"day": 1, "week": 7, "month": 30, "year": 365}.get(period, 7)
    start_date = today - timedelta(days=days - 1)

    # Lấy tất cả meal log trong khoảng
    statement = select(MealLog).where(
        MealLog.user_id == user_id,
        MealLog.scanned_at >= _start_of_day(start_date),
        MealLog.scanned_at <= _end_of_day(today),
    )
    logs = session.exec(statement).all()

    # Group theo ngày
    daily: dict[str, float] = defaultdict(float)
    for log in logs:
        if log.scanned_at: # Tránh lỗi nếu scanned_at bị NULL
            key = log.scanned_at.strftime("%Y-%m-%d")
            daily[key] += float(log.calories or 0.0) # Tránh lỗi nếu calories bị NULL

    # Tạo danh sách đủ các ngày (kể cả ngày không có log)
    result = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        key = d.strftime("%Y-%m-%d")
        label = d.strftime("%a") if days <= 7 else d.strftime("%b %d")
        result.append({"date": key, "label": label, "consumed": round(daily.get(key, 0.0), 1)})

    return result


# ─── 2. Tổng hợp tuần (average + % so với tuần trước) ────
@router.get("/summary/{user_id}")
def get_summary(user_id: int, session: Session = Depends(get_session)):
    today = date.today()
    this_week_start = today - timedelta(days=6)
    last_week_start = this_week_start - timedelta(days=7)

    def week_total(start: date) -> float:
        end = start + timedelta(days=6)
        stmt = select(func.sum(MealLog.calories)).where(
            MealLog.user_id == user_id,
            MealLog.scanned_at >= _start_of_day(start),
            MealLog.scanned_at <= _end_of_day(end),
        )
        # SỬA LỖI 500: Dùng .first() thay vì .one(), và xử lý giá trị None
        result = session.exec(stmt).first()
        return float(result) if result else 0.0

    this_total = week_total(this_week_start)
    last_total = week_total(last_week_start)
    avg = round(this_total / 7, 0)

    change_pct = 0.0
    direction = "Giống"
    if last_total > 0:
        change_pct = round(abs(this_total - last_total) / last_total * 100, 1)
        direction = "Thấp hơn" if this_total < last_total else "Cao hơn"

    # Lấy goal từ profile, an toàn nếu profile hoặc daily_calorie_goal bị NULL
    profile = session.exec(select(UserProfile).where(UserProfile.user_id == user_id)).first()
    goal = profile.daily_calorie_goal if (profile and profile.daily_calorie_goal) else 2000

    return {
        "weekly_avg": int(avg),
        "change_pct": change_pct,
        "direction": direction,
        "daily_goal": goal,
    }


# ─── 3. Macro balance theo ngày ───────────────────────────
@router.get("/macros/{user_id}")
def get_macros(
    user_id: int,
    target_date: Optional[date] = Query(default=None),
    session: Session = Depends(get_session),
):
    d = target_date or date.today()

    stmt = select(MealLog).where(
        MealLog.user_id == user_id,
        MealLog.scanned_at >= _start_of_day(d),
        MealLog.scanned_at <= _end_of_day(d),
    )
    logs = session.exec(stmt).all()

    # SỬA LỖI 500: Thêm `or 0` để tránh trường hợp phép cộng với NoneType
    protein = sum((l.protein_g or 0) for l in logs)
    carbs   = sum((l.carbs_g or 0) for l in logs)
    fat     = sum((l.fat_g or 0) for l in logs)

    profile = session.exec(select(UserProfile).where(UserProfile.user_id == user_id)).first()
    goal = profile.daily_calorie_goal if (profile and profile.daily_calorie_goal) else 2000

    return {
        "protein": {"current": round(protein, 1), "target": round(goal * 0.30 / 4, 0)},  
        "carbs":   {"current": round(carbs,   1), "target": round(goal * 0.50 / 4, 0)},  
        "fat":     {"current": round(fat,     1), "target": round(goal * 0.20 / 9, 0)},  
    }


# ─── 4. Meal logs theo ngày (grouped by meal_type) ────────
@router.get("/logs/{user_id}")
def get_logs(
    user_id: int,
    target_date: Optional[date] = Query(default=None),
    session: Session = Depends(get_session),
):
    d = target_date or date.today()

    stmt = select(MealLog).where(
        MealLog.user_id == user_id,
        MealLog.scanned_at >= _start_of_day(d),
        MealLog.scanned_at <= _end_of_day(d),
    ).order_by(MealLog.scanned_at)

    logs = session.exec(stmt).all()

    groups: dict[str, dict] = {}
    icons = {
        MealType.breakfast: "🥐",
        MealType.lunch:     "🥗",
        MealType.dinner:    "🍽️",
        MealType.snack:     "🥜",
    }

    for log in logs:
        # SỬA LỖI 500: An toàn khi truy xuất Enum (phòng khi Database trả về string thẳng)
        mt = log.meal_type.value if hasattr(log.meal_type, 'value') else str(log.meal_type)
        
        if mt not in groups:
            groups[mt] = {
                "type":  mt.capitalize(),
                "icon":  icons.get(log.meal_type, "🍴"),
                "time":  log.scanned_at.strftime("%I:%M %p") if log.scanned_at else "N/A",
                "total": 0.0,
                "items": [],
            }
        
        cal = float(log.calories or 0)
        groups[mt]["total"] = round(groups[mt]["total"] + cal, 1)
        groups[mt]["items"].append({
            "name": log.food_name or "Unknown",
            "cal":  round(cal, 0),
        })

    # Xử lý an toàn cho sắp xếp
    order = ["breakfast", "lunch", "dinner", "snack"]
    return [groups[k] for k in order if k in groups]