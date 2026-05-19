# backend/services/ai_coach.py
import os
import logging
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai

# Định vị chính xác đường dẫn đến file .env trong thư mục backend
BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BACKEND_DIR / ".env"

# Ép load đúng file .env đó và BẮT BUỘC ghi đè lên bộ nhớ cũ
load_dotenv(dotenv_path=ENV_PATH, override=True)  # <-- Thêm override=True vào đây bạn nhé

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    # Thêm dòng này để kiểm tra xem 4 ký tự đầu và cuối của Key có đúng là Key MỚI chưa:
    print(f"🔑 Kiểm tra Key đang chạy: {GEMINI_API_KEY[:5]}...{GEMINI_API_KEY[-5:]}")
else:
    logging.getLogger(__name__).warning("❌ Không tìm thấy GEMINI_API_KEY!")


class AiCoachService:
    # 🛠️ TỐI ƯU 1: Chuyển mặc định sang 'gemini-2.0-flash' để dứt điểm hoàn toàn lỗi 404 v1beta cũ
    def __init__(self, model_name: str = 'gemini-2.0-flash'):
        self.model_name = model_name

    def generate_chat_response(self, user_data: dict, meals: list, user_message: str, chat_history: list = []) -> str:
        """
        Generates a response using fresh context-aware system instructions on every call.
        """
        if not os.getenv("GEMINI_API_KEY"):
            return "Trợ lý AI hiện đang bảo trì hệ thống kết nối. Vui lòng thử lại sau!"

        # Tính toán số liệu thực tế trong ngày (Phòng hờ DB dùng cả trường 'protein' hoặc 'protein_g')
        total_calories = sum(m.get('calories', 0) for m in meals)
        total_protein = sum(m.get('protein_g', 0) or m.get('protein', 0) for m in meals)
        total_carbs = sum(m.get('carbs_g', 0) or m.get('carbs', 0) for m in meals)
        total_fat = sum(m.get('fat_g', 0) or m.get('fat', 0) for m in meals)
        
        # 🛠️ TỐI ƯU 2: Dùng .get() thay vì trực tiếp gọi ngoặc vuông [] để phòng thủ lỗi KeyError gây sập Backend
        target_calories = user_data.get('target_calories', 2000)
        remaining_calories = target_calories - total_calories

        # Chi tiết hóa nhật ký bữa ăn bao gồm cả các chỉ số chất để AI đọc hiểu sâu hơn
        meals_summary = "\n".join([
            f"- Buổi {m.get('meal_type', 'Khác')}: {m.get('food_name')} ({m.get('calories')} kcal) "
            f"[P:{m.get('protein_g', 0) or m.get('protein', 0)}g, "
            f"C:{m.get('carbs_g', 0) or m.get('carbs', 0)}g, "
            f"F:{m.get('fat_g', 0) or m.get('fat', 0)}g]"
            for m in meals
        ])

        # 🛠️ TỐI ƯU 3: Bản cũ tính toán Macros (P, C, F) xong bỏ phí, bản mới này nạp thẳng toàn bộ vào Prompt
        system_instruction = f"""
Bạn là một chuyên gia huấn luyện dinh dưỡng (Health Coach) ảo người Việt Nam, thông minh và thân thiện.
Bạn đang chat và hỗ trợ trực tiếp cho người dùng tên {user_data.get('name', user_data.get('full_name', 'bạn'))}.

Nhiệm vụ của bạn là dựa vào THÔNG TIN DINH DƯỠNG HÔM NAY của họ để trả lời câu hỏi của họ một cách cá nhân hóa.

=== THÔNG SỐ CƠ THỂ & MỤC TIÊU ===
- Mục tiêu chung: {user_data.get('goal_type', 'Duy trì sức khỏe')}
- Calories Mục tiêu mỗi ngày: {target_calories} kcal
- Target Macros mong muốn: P:{user_data.get('target_protein', 0)}g | C:{user_data.get('target_carbs', 0)}g | F:{user_data.get('target_fat', 0)}g

=== NHẬT KÝ ĐÃ ĂN HÔM NAY ===
{meals_summary if meals else "- Chưa nạp bữa ăn nào hôm nay."}

=== TỔNG KẾT TIẾN ĐỘ HIỆN TẠI (ĐÃ NẠP VS MỤC TIÊU) ===
- Calories: {total_calories} / {target_calories} kcal (Còn lại được ăn: {remaining_calories} kcal).
- Protein: {total_protein}g / {user_data.get('target_protein', 0)}g
- Carbs: {total_carbs}g / {user_data.get('target_carbs', 0)}g
- Fat: {total_fat}g / {user_data.get('target_fat', 0)}g

NGUYÊN TẮC TRẢ LỜI:
1. Luôn nhìn vào lượng Calories "Còn lại" và cán cân các chất dinh dưỡng (Macros) hiện tại trước khi đưa ra lời khuyên nên ăn hay tránh món gì.
2. Trả lời ngắn gọn, súc tích (dưới 150 từ), đi thẳng vào vấn đề, phong cách trò chuyện tự nhiên như đang nhắn tin zalo/messenger chứ không viết sớ dài dòng.
3. Thân thiện, khích lệ và sử dụng emoji phù hợp ngữ cảnh Việt Nam.
"""

        # Định dạng lại lịch sử chat theo chuẩn cặp bài trùng (user -> model)
        contents = []
        for msg in chat_history:
            text_content = msg.get('text', '').strip()
            if not text_content:  # Bỏ qua tin nhắn rỗng tránh lỗi API
                continue
            contents.append({
                "role": "user" if msg.get('is_user') else "model",
                "parts": [text_content]
            })
        
        # 🛠️ TỐI ƯU 4: Phòng thủ lỗi logic cấu trúc lịch sử chat của Gemini 
        # (API của Google cấm tuyệt đối 2 role 'user' hoặc 2 role 'model' đứng cạnh nhau liên tiếp)
        if contents and contents[-1]["role"] == "user":
            contents[-1]["parts"][0] += f"\n{user_message}"
        else:
            contents.append({
                "role": "user",
                "parts": [user_message]
            })

        try:
            # Khởi tạo model mới cho mỗi Request nhằm cập nhật system_instruction cá nhân hóa theo thời gian thực
            model = genai.GenerativeModel(
                model_name=self.model_name,
                system_instruction=system_instruction
            )
            
            response = model.generate_content(contents)
            return response.text
        except Exception as e:
            logging.getLogger(__name__).error(f"Lỗi gọi Gemini API: {e}")
            return "Xin lỗi bạn, mình gặp chút sự cố khi kết nối bộ não AI. Bạn hỏi lại câu vừa rồi nhé!"


# Khởi tạo instance dùng chung cho toàn bộ Router
ai_coach_service = AiCoachService()