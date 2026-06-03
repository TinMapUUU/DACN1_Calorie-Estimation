# Cập nhật AI Coach - Danh sách Món Ăn & Guardrail

## 📋 Tóm tắt các thay đổi

### Tính năng 1: Liệt kê Danh sách Món Ăn ✅
Hệ thống giờ đây sẽ:
- Đọc **tất cả** các món ăn từ bảng `meallog` (giới hạn 10 món để tránh vượt token)
- Liệt kê chi tiết trong **System Instruction** của Gemini
- Khi người dùng hỏi "Hôm nay tôi ăn gì?", AI sẽ liệt kê danh sách từ dữ liệu database

**Ví dụ System Instruction:**
```
[DỮ LIỆU ĐƯỢC CẤP TỪ DATABASE]:
- Tổng calo hôm nay: 1050/2000 kcal
- Còn lại: 950 kcal
- Danh sách lịch sử món ăn hôm nay:
  • Phở bò: 450 kcal
  • Cơm tấm: 600 kcal
```

### Tính năng 2: Guardrail (Bộ lọc Phạm vi) ✅
Hệ thống giờ đây sẽ:
- **Kiểm tra** mỗi câu hỏi có nằm trong phạm vi dinh dưỡng/sức khỏe không
- Nếu **OFF-TOPIC**: Trả về ngay câu trả lời cố định (không gọi API)
- Nếu **ON-TOPIC**: Tiếp tục xử lý bình thường

**Guardrail Response:**
```
"Những gì bạn hỏi nằm ngoài vùng xử lý của tôi, xin mời bạn hỏi lại."
```

---

## 🔧 Các thay đổi kỹ thuật

### File: `backend/services/ai_coach.py`

#### 1. Thêm Guardrail Keywords (Dòng ~130-180)
```python
# Từ khóa ON-TOPIC (Dinh dưỡng/Sức khỏe)
ON_TOPIC_KEYWORDS = [
    "calo", "kcal", "năng lượng", "nạp", "ăn", "lịch sử",
    "protein", "carbs", "fat", "bmi", "sức khỏe", ...
]

# Từ khóa OFF-TOPIC (Ngoài phạm vi)
OFF_TOPIC_KEYWORDS = [
    "code", "lập trình", "thủ đô", "tiếng anh", "toán",
    "phim", "nhạc", "game", "thời tiết", ...
]

# Guardrail Response (cố định)
GUARDRAIL_RESPONSE = "Những gì bạn hỏi nằm ngoài vùng xử lý của tôi, xin mời bạn hỏi lại."
```

#### 2. Thêm Hàm Guardrail Detection (Dòng ~180-210)
```python
def _is_off_topic(user_message: str) -> bool:
    """
    Kiểm tra xem câu hỏi có OFF-TOPIC không
    Returns True: OFF-TOPIC → trả về guardrail response
    Returns False: ON-TOPIC → tiếp tục xử lý bình thường
    """
```

#### 3. Thêm Guardrail Check trong `generate_chat_response` (Layer 2B)
```python
# ✅ LAYER 2B: Guardrail Check (Scope validation)
if _is_off_topic(user_message):
    self.logger.info(f"🚫 Off-topic question detected: {user_message[:50]}")
    return GUARDRAIL_RESPONSE
```

#### 4. Cập nhật `_build_system_instruction()` - Chi tiết Cấu trúc
```python
def _build_system_instruction(self, user_data: dict, meals: list) -> str:
    """
    Xây dựng system instruction với:
    1. Danh sách chi tiết món ăn
    2. Dữ liệu calo từ DB
    3. Strict Guardrail Instructions
    """
    
    # STEP 1: Build detailed meal list
    # Liệt kê từng món: "• Phở bò: 450 kcal"
    
    # STEP 2: Calculate totals
    # Tổng calo, calo mục tiêu, calo còn lại
    
    # STEP 3: Build STRICT system instruction
    # Gồm 3 phần: Role definition + Data + Guardrail rules
```

---

## 📊 System Instruction Mới - Cấu trúc

### Phần 1: Role Definition
```
Bạn là một Chuyên gia Dinh dưỡng AI giới hạn nghiêm ngặt.
Bạn CHỈ được phép xử lý 3 nhiệm vụ sau:
1. [func1]: Tính toán calo
2. [meallog]: Liệt kê danh sách món ăn
3. [macro]: Tư vấn về Protein, Carbs, Fat
```

### Phần 2: Dữ Liệu từ Database
```
[HỒ SƠ NGƯỜI DÙNG]:
- Tên: {name}
- Mục tiêu: {goal}

[DỮ LIỆU ĐƯỢC CẤP TỪ DATABASE]:
- Tổng calo: {total_eaten}/{target} kcal
- Còn lại: {remaining} kcal
- Danh sách lịch sử món ăn:
  • Phở bò: 450 kcal
  • Cơm tấm: 600 kcal
  ...
```

### Phần 3: Guardrail Rules (Bắt buộc)
```
[QUY TẮC BẮT BUỘC]:
- Nếu câu hỏi KHÔNG liên quan đến 3 nhiệm vụ hoặc nằm ngoài 
  sức khỏe/dinh dưỡng → PHẢI ĐÁP: 
  "Những gì bạn hỏi nằm ngoài vùng xử lý của tôi, xin mời bạn hỏi lại"
```

---

## 🧪 Ví dụ Kịch bản Kiểm thử

### Kịch bản 1: Hỏi về Danh sách Món Ăn ✅
**Input:** "Hôm nay tôi đã ăn những gì?"  
**Process:**
1. Layer 2: Template check → No match
2. Layer 2B: Guardrail check → ON-TOPIC (keyword: "ăn")
3. Layer 3: Cache check → No cache
4. Layer 4: Build system instruction
   - Thêm danh sách chi tiết món ăn
   - Gửi đến Gemini với guardrail rules
5. **Output:** 
```json
{
  "reply": "Hôm nay bạn đã ăn:\n- Phở bò (450 kcal)\n- Cơm tấm (600 kcal)\nTổng: 1050/2000 kcal. Còn 950 kcal nữa! 💪"
}
```

### Kịch bản 2: Hỏi OFF-TOPIC ❌
**Input:** "Viết code giúp tôi"  
**Process:**
1. Layer 2: Template check → No match
2. Layer 2B: Guardrail check → OFF-TOPIC (keyword: "code")
   - Detect ngay tại layer 2B
   - **Không gọi API**
   - Return guardrail response
3. **Output:**
```json
{
  "reply": "Những gì bạn hỏi nằm ngoài vùng xử lý của tôi, xin mời bạn hỏi lại."
}
```

### Kịch bản 3: Hỏi về Calo (Template Match) ⚡
**Input:** "Tôi ăn bao nhiêu calo rồi?"  
**Process:**
1. Layer 2: Template check → **MATCHED: "calories"**
   - Detect ngay
   - Return template response immediately
   - **Không gọi API, không cache, cực nhanh**
2. **Output:**
```json
{
  "reply": "Hôm nay bạn đã nạp 1050/2000 kcal. Còn 950 kcal nữa thôi! 💪 Hãy ăn uống hợp lý nhé!"
}
```

---

## 📝 Danh sách Từ Khóa

### ON-TOPIC Keywords (Cho phép xử lý)
- **Calo & Năng lượng**: calo, kcal, năng lượng, nạp, ăn, thực phẩm
- **Lịch sử Ăn uống**: lịch sử, hôm nay, sáng, trưa, tối, bữa, đã ăn
- **Macro & Dinh dưỡng**: protein, carbs, fat, đường, muối, vitamin, khoáng, chất, dinh dưỡng
- **Sức khỏe & BMI**: bmi, sức khỏe, cân nặng, chiều cao, mục tiêu, giảm, tăng
- **Tư vấn**: tư vấn, nên, không nên, hợp lý, tốt, xấu, ăn gì

### OFF-TOPIC Keywords (Từ chối xử lý)
- **Lập trình**: code, lập trình, Python, JavaScript, PHP, SQL
- **Khoa học**: toán, vật lý, hóa, sinh
- **Địa lý & Lịch sử**: thủ đô, nước, địa lý, lịch sử
- **Ngôn ngữ**: tiếng anh, ngữ pháp, dịch
- **Giải trí**: game, phim, nhạc, bóng đá, xe, meme
- **Thời tiết & Tin tức**: thời tiết, tin tức

---

## 🔄 Quy Trình Xử Lý (Flow)

```
User Question
    ↓
[Layer 1] Rate Limit Check
    ↓ (Allowed)
[Layer 2] Template Match?
    ├─ YES → Return template (instant)
    └─ NO → Continue
    ↓
[Layer 2B] Guardrail Check (NEW!)
    ├─ OFF-TOPIC → Return guardrail response (instant)
    └─ ON-TOPIC → Continue
    ↓
[Layer 3] Cache Check
    ├─ HIT → Return cached (instant)
    └─ MISS → Continue
    ↓
[Layer 4] Build System Instruction (with detailed meals list)
    ↓
[Layer 5] Call Gemini API (with retry logic)
    ↓
[Layer 6] Cache Response
    ↓
Return to User
```
