# AI Coach API Optimization Strategy - Complete Guide

## 🎯 Problem Statement

The application was hitting Gemini API quota limits (HTTP 429 errors) even with basic token optimization. Root cause: Free Tier has hard limit of ~60 requests/min, and requests were using too many tokens.

```
ERROR: 2026-06-04 01:48:18,813 - services.ai_coach - ERROR - 🚨 Gemini API Quota Exceeded (429)
INFO: 127.0.0.1:64918 - "POST /api/v1/chat HTTP/1.1" 429 Too Many Requests
```

## 🏗️ Solution: 6-Layer Optimization Architecture

This is NOT a single fix, but a **defense-in-depth** approach:

### Layer 1: Request Caching (TTL=10 minutes)
**Purpose**: Prevent duplicate API calls for the same question

```python
# Implementation in ai_coach.py
class RequestCache:
    - Cache key: MD5(user_id + message)
    - Value: AI response + expiry timestamp
    - TTL: 10 minutes (configurable)

# When user asks "Tôi ăn bao nhiêu calo?" twice in 10 min:
Request 1: Cache MISS → Call API → Cache response
Request 2: Cache HIT → Return cached response (NO API CALL)
```

**Expected Impact**: 30-40% reduction in duplicate requests

---

### Layer 2: Rate Limiting (5 calls/min per user)
**Purpose**: Prevent power users from exhausting shared quota

```python
# Implementation in ai_coach.py
class RateLimiter:
    - Window: 60 seconds
    - Limit: 5 API calls per user per minute
    - Action: Return friendly error, don't hit API

# When user makes 6 requests in 60 seconds:
Request 1-5: ✅ Allowed → normal flow
Request 6: ❌ Blocked → "Tạm thời quá nhiều yêu cầu. Vui lòng chờ 45s."
```

**Expected Impact**: Smoother resource distribution, prevents burst overload

---

### Layer 3: Response Templates (No API call!)
**Purpose**: Answer common questions instantly without API

```python
# Implementation in ai_coach.py
RESPONSE_TEMPLATES = {
    "calories": "Hôm nay bạn đã nạp {eaten}/{target} kcal. Còn {remaining} kcal nữa thôi! 💪",
    "greeting": "Xin chào {name}! Tôi là Health Coach của bạn. 🌟",
    "more": "Bạn vẫn có thể ăn thêm {remaining} kcal. 🥗",
    ...
}

# Example flow:
User: "Tôi ăn bao nhiêu calo hôm nay?"
System: Detects "calo" keyword → Returns template response (NO API CALL)
User: "Hello" 
System: Detects "hello" keyword → Returns template response (NO API CALL)
```

**Keywords matched**:
- "calories": calo, kcal, nạp, ăn bao nhiêu
- "more": còn được ăn, ăn thêm
- "greeting": chào, xin chào, hello, hi

**Expected Impact**: 15-25% of requests answered without API

---

### Layer 4: Ultra-Compact System Instructions
**Purpose**: Reduce tokens per request by 40-50%

```
BEFORE (300+ tokens):
"Bạn là Health Coach (chuyên gia huấn luyện dinh dưỡng) người Việt Nam.
Mục tiêu của người dùng là: Lose Weight
Calo hạn mức mỗi ngày: 1800 kcal
Tất cả các thực phẩm đã ăn hôm nay:
- Cơm trắng (150g) [P:3g, C:30g, F:0.5g]
- Cá kho (100g) [P:20g, C:0g, F:10g]
...
Trả lời bằng tiếng Việt..."

AFTER (120 tokens):
"Coach Minh: Lose Weight. Calo: 1800kcal.
Hôm nay: Cơm(200kcal), Cá(150kcal)
Nạp: 350/1800kcal (còn 1450kcal).
Trả lời <100 từ, emoji. 🎯"
```

**Changes**:
- Remove detailed explanations
- Only: name, goal, calorie target, meals summary, calorie status
- Compact format with symbols instead of words
- Instruction to keep response <100 words

**Expected Impact**: Faster responses, more quota room

---

### Layer 5: Retry Logic with Exponential Backoff
**Purpose**: Handle transient failures gracefully

```python
# Implementation in ai_coach.py
def _call_gemini_with_retry():
    Attempt 1: Try API call
    If 429 (Quota):        FAIL immediately (don't retry - quota is hard limit)
    If timeout:            Wait 1s, retry
    If connection error:   Wait 1s, retry
    If 502/503:            Wait 2s, retry
    Attempt 2:             Wait 2s, retry
    Attempt 3:             Wait 4s, retry
    After 3 attempts:      Give up with friendly error
```

**Expected Impact**: Reduced cascade failures during partial outages

---

### Layer 6: Improved Error Handling
**Purpose**: Give frontend proper HTTP status codes

```
Error Type              → HTTP Code → User Message
───────────────────────────────────────────────────────
Quota exceeded (429)    → 429       → "AI quá tải, thử lại sau 1-2 phút"
Rate limited            → 503       → "Quá nhiều yêu cầu, chờ {wait_time}s"
Invalid API key         → 503       → "API chưa được cấu hình"
Connection timeout      → 503       → "Không thể kết nối, kiểm tra mạng"
Generic error          → 500       → "Lỗi nội bộ server"
```

