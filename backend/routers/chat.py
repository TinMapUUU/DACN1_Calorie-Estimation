from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, desc
from models.schemas import ChatRequest
from models.db_models import MealLog, User
from database.connection import get_session
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Thêm các thư viện AI
try:
    from llama_index.llms.ollama import Ollama
    _ollama_available = True
except Exception as e:
    logger.warning(f"Ollama import failed: {str(e)}")
    _ollama_available = False
    Ollama = None  # type: ignore

router = APIRouter(prefix="/ai", tags=["Chat AI"])

# Khởi tạo Ollama (Model llama3 hoặc mistral) - nếu available
llm: Optional[Any] = None
if _ollama_available and Ollama is not None:
    try:
        llm = Ollama(model="llama3", request_timeout=120.0)  # type: ignore
        logger.info("✅ Ollama initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Ollama: {str(e)}")
        llm = None

# Định nghĩa "Tính cách" cho AI (System Prompt)
SYSTEM_PROMPT = """Bạn là một chuyên gia dinh dưỡng và huấn luyện viên cá nhân (PT) chuyên nghiệp.
Dưới đây là dữ liệu sức khỏe của khách hàng:
{context}

Nhiệm vụ của bạn:
1. Trả lời các câu hỏi của khách hàng dựa trên dữ liệu thực tế của họ.
2. Nếu họ ăn quá nhiều calo, hãy cảnh báo nhẹ nhàng và đưa ra giải pháp tập luyện.
3. Nếu thiếu protein, hãy gợi ý món ăn cụ thể.
4. Luôn giữ thái độ tích cực, động viên và chuyên nghiệp.
5. Tuyệt đối không trả lời các vấn đề ngoài sức khỏe và dinh dưỡng.
6. Trả lời ngắn gọn, súc tích bằng tiếng Việt."""

def get_meal_insight(meals: List[MealLog]) -> str:
    """Tạo insight từ lịch sử ăn uống khi Ollama không available"""
    if not meals:
        return "Bạn chưa có lịch sử ăn uống nào. Hãy bắt đầu ghi nhận các bữa ăn để tôi có thể tư vấn tốt hơn!"
    
    total_cal = sum(m.calories for m in meals)
    avg_cal = total_cal / len(meals)
    total_protein = sum(m.protein_g for m in meals if m.protein_g)
    total_carbs = sum(m.carbs_g for m in meals if m.carbs_g)
    total_fat = sum(m.fat_g for m in meals if m.fat_g)
    
    insights = [f"Dựa trên {len(meals)} bữa ăn gần đây:"]
    insights.append(f"• Trung bình calo: {avg_cal:.0f} kcal/bữa (tổng: {total_cal:.0f} kcal)")
    insights.append(f"• Tổng protein: {total_protein:.1f}g (trung bình: {total_protein/len(meals):.1f}g/bữa)")
    insights.append(f"• Tổng carbs: {total_carbs:.1f}g")
    insights.append(f"• Tổng fat: {total_fat:.1f}g")
    
    # Gợi ý dựa trên dữ liệu
    if avg_cal > 2000:
        insights.append("\n💡 Lời khuyên: Bạn tiêu thụ nhiều calo. Hãy tập luyện thêm hoặc giảm khẩu phần!")
    if total_protein / len(meals) < 20:
        insights.append("💡 Lời khuyên: Protein của bạn thấp. Hãy ăn thêm trứng, thịt, hay đậu!")
    
    return "\n".join(insights)

@router.post("/chat")
async def chat_with_ai(request: ChatRequest, session: Session = Depends(get_session)) -> Dict[str, Any]:
    try:
        # 1. Lấy dữ liệu thực tế từ Database (Context)
        user = session.get(User, request.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Lấy lịch sử ăn uống gần đây (sắp xếp mới nhất trước)
        statement = select(MealLog).where(MealLog.user_id == request.user_id).order_by(desc(MealLog.scanned_at)).limit(10)
        meals = session.exec(statement).all()

        # 2. Chuyển dữ liệu DB thành văn bản để AI hiểu
        if meals:
            meal_context = "\n".join([
                f"- {m.food_name}: {m.calories}kcal, P:{m.protein_g}g, C:{m.carbs_g}g, F:{m.fat_g}g" 
                for m in meals
            ])
        else:
            meal_context = "Chưa có lịch sử ăn uống"
        
        user_context = f"""User: {user.full_name or 'Người dùng'} ({user.email})
Meals (10 recent): {meal_context}"""

        # 3. TRY Ollama trước
        reply: Optional[str] = None
        if llm is not None:
            try:
                full_prompt = SYSTEM_PROMPT.format(context=user_context) + f"\n\nQuestion: {request.message}"
                logger.info(f"Sending to Ollama: {full_prompt[:100]}...")
                response = llm.complete(full_prompt)  # type: ignore
                reply = response.text
                if reply:
                    logger.info(f"✅ Ollama response: {reply[:100]}...")
            except Exception as ollama_err:
                logger.error(f"❌ Ollama error: {str(ollama_err)}")
                reply = None
        
        # 4. Fallback: dùng logic đơn giản nếu Ollama không hoạt động
        if reply is None:
            logger.info("Using fallback insight generation")
            reply = get_meal_insight(list(meals))
            if request.message.lower() in ["xin chào", "hello", "hi"]:
                reply = f"Xin chào! Tôi là AI Dinh Dưỡng của bạn. {reply}"
        
        return {
            "reply": reply,
            "status": "success",
            "ollama_available": llm is not None
        }
    
    except Exception as e:
        logger.error(f"Chat API Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)[:100]}")