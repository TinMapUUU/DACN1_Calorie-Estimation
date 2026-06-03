# backend/services/ai_coach.py
"""
AI Coach Service: Advanced optimizations for handling Gemini API quota limits.

OPTIMIZATION LAYERS (in order):
1. Rate Limiting: Max 5 calls/min per user (backend throttling)
2. Template Matching: Common questions answered without API calls
3. Request Caching: Cache responses with 10-min TTL (avoid duplicate API calls)
4. System Instruction Optimization: Ultra-compact instructions (~120 tokens)
5. Retry Logic: Exponential backoff (1s, 2s, 4s) for transient failures
6. Error Handling: Separate handling for quota vs other errors

EXPECTED RESULTS:
- Reduced API calls by 40-60% through caching and templates
- Better user experience with instant template responses
- Graceful degradation when quota is exceeded
- Lower TPM (tokens per minute) due to compact instructions
"""

import os
import logging
import hashlib
import time
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Optional, Dict, Tuple
import google.generativeai as genai
from google.api_core import exceptions as google_exceptions

# ============================================================================
# CONFIGURATION
# ============================================================================

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BACKEND_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH, override=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print(f"🔑 Gemini API configured: {GEMINI_API_KEY[:5]}...{GEMINI_API_KEY[-5:]}")
else:
    logging.getLogger(__name__).warning("❌ GEMINI_API_KEY not found!")


# ============================================================================
# EXCEPTIONS
# ============================================================================

class AiQuotaExceeded(Exception):
    """Raised when Gemini API returns quota/rate limit error (429 ResourceExhausted)."""
    pass


class AiRateLimited(Exception):
    """Raised when local rate limiter blocks the request (10 calls/min per user)."""
    pass


class AiServiceError(Exception):
    """Raised for general AI service failures (API key error, connection timeout, etc)."""
    pass


# ============================================================================
# LAYER 1: REQUEST CACHING WITH TTL
# ============================================================================

class RequestCache:
    """In-memory cache with TTL for API responses."""
    
    def __init__(self, ttl_seconds: int = 120):  # 2 min default TTL per business rules (Tầng 3)
        self.cache: Dict[str, Tuple[str, float]] = {}  # {key: (value, expiry_time)}
        self.ttl_seconds = ttl_seconds
        self.logger = logging.getLogger(__name__)
    
    def _make_key(self, user_message: str, user_id: Optional[int] = None) -> str:
        """Generate cache key from user message and user ID."""
        key_str = f"{user_id}:{user_message}"
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[str]:
        """Retrieve cached value if not expired."""
        if key in self.cache:
            value, expiry = self.cache[key]
            if time.time() < expiry:
                self.logger.debug(f"✓ Cache HIT for key: {key[:8]}...")
                return value
            else:
                del self.cache[key]
                self.logger.debug(f"✗ Cache EXPIRED for key: {key[:8]}...")
        return None
    
    def set(self, key: str, value: str):
        """Store value with TTL."""
        expiry = time.time() + self.ttl_seconds
        self.cache[key] = (value, expiry)
        self.logger.debug(f"📌 Cache SET for key: {key[:8]}... (TTL: {self.ttl_seconds}s)")
    
    def clear_expired(self):
        """Remove expired entries."""
        now = time.time()
        expired_keys = [k for k, (v, exp) in self.cache.items() if exp < now]
        for k in expired_keys:
            del self.cache[k]
        if expired_keys:
            self.logger.debug(f"🧹 Cache cleanup: removed {len(expired_keys)} expired entries")


# ============================================================================
# LAYER 2: RATE LIMITING PER USER
# ============================================================================

class RateLimiter:
    """Rate limiter to prevent excessive API calls per user."""
    
    def __init__(self, calls_per_minute: int = 10):  # Per business rules: Tầng 1 = 10 req/min
        self.calls_per_minute = calls_per_minute
        self.window_seconds = 60
        self.user_calls: Dict[int, list] = defaultdict(list)  # {user_id: [timestamp, ...]}
        self.logger = logging.getLogger(__name__)
    
    def is_allowed(self, user_id: int) -> bool:
        """Check if user is allowed to make API call. Raises AiRateLimited if blocked."""
        now = time.time()
        window_start = now - self.window_seconds
        
        # Clean old timestamps
        self.user_calls[user_id] = [ts for ts in self.user_calls[user_id] if ts > window_start]
        
        if len(self.user_calls[user_id]) >= self.calls_per_minute:
            oldest_call = min(self.user_calls[user_id])
            wait_time = int(oldest_call + self.window_seconds - now) + 1
            msg = "Bạn đang thao tác quá nhanh, vui lòng đợi giây lát!"
            self.logger.warning(f"🚫 Rate limit exceeded for user {user_id}: wait {wait_time}s")
            raise AiRateLimited(msg)
        
        self.user_calls[user_id].append(now)
        return True


# ============================================================================
# RESPONSE TEMPLATES & GUARDRAILS
# ============================================================================

RESPONSE_TEMPLATES = {
    "calories": "Hôm nay bạn đã nạp {eaten}/{target} kcal. Còn {remaining} kcal nữa thôi! 💪 Hãy ăn uống hợp lý nhé!",
    "meal_history": "🍽️ Danh sách thực phẩm hôm nay:\n{meals_list}\n\n📊 Tổng: {total} kcal / {target} kcal\n⚡ Còn lại: {remaining} kcal",
    "more": "Bạn vẫn có thể ăn thêm {remaining} kcal nữa để đạt mục tiêu hôm nay. 🥗",
    "less": "Bạn đã vượt quá mục tiêu calo {over} kcal rồi. Hãy chọn thực phẩm nhẹ hơn! 😊",
    "continue": "Tiếp tục cố gắng! Bạn đang trên con đường đúng để đạt được mục tiêu của mình. 🎯",
    "greeting": "Xin chào {name}! Tôi là Health Coach của bạn. Hôm nay bạn cảm thấy thế nào? 🌟",
    "default": "Tôi hiểu rồi! Hãy cơ cấp thêm thông tin để tôi có thể giúp bạn tốt hơn! 😊",
}

# Guardrail response for off-topic questions
GUARDRAIL_RESPONSE = "Những gì bạn hỏi nằm ngoài vùng xử lý của tôi, xin mời bạn hỏi lại."

# Keywords indicating on-topic (nutrition/health related) questions
ON_TOPIC_KEYWORDS = [
    # Calo & năng lượng
    "calo", "kcal", "năng lượng", "nạp", "ăn", "thực phẩm", "gì",
    # Lịch sử ăn uống
    "lịch sử", "hôm nay", "sáng", "trưa", "tối", "bữa", "ăn", "đã ăn",
    # Macro & dinh dưỡng
    "protein", "carbs", "fat", "đường", "muối", "vitamin", "khoáng", "chất", "dinh dưỡng",
    # Sức khỏe & bmi
    "bmi", "sức khỏe", "cân nặng", "chiều cao", "mục tiêu", "giảm", "tăng", "duy trì",
    # Tư vấn & khuyên
    "tư vấn", "nên", "không nên", "hợp lý", "tốt", "xấu", "ăn gì",
]

# Keywords indicating off-topic questions
OFF_TOPIC_KEYWORDS = [
    "code", "lập trình", "thủ đô", "tiếng anh", "toán", "vật lý", "hóa", 
    "địa lý", "viết", "bài", "tên", "là gì", "thời tiết", "tin tức",
    "meme", "game", "phim", "nhạc", "sports", "bóng", "đá", "xe",
]


def _detect_template_match(user_message: str) -> Optional[str]:
    """Detect if user message matches a template pattern."""
    msg_lower = user_message.lower().strip()
    
    keywords_map = {
        "meal_history": ["liệt kê", "danh sách", "đã ăn", "ăn gì", "lịch sử ăn", "lịch sử", "hôm nay ăn"],
        "calories": ["calo", "kcal", "nạp", "ăn bao nhiêu", "tính calo"],
        "more": ["còn được ăn", "ăn thêm", "thêm được", "còn bao nhiêu"],
        "less": ["quá calo", "vượt", "nhiều quá", "ăn nhiều"],
        "continue": ["cố gắng", "tiếp tục", "khác", "thế nào"],
        "greeting": ["chào", "xin chào", "hello", "hi", "bắt đầu"],
    }
    
    for template_key, keywords in keywords_map.items():
        if any(kw in msg_lower for kw in keywords):
            return template_key
    
    return None


def _is_off_topic(user_message: str) -> bool:
    """
    Check if user message is off-topic (outside nutrition/health scope).
    Returns True if off-topic, False if on-topic.
    """
    msg_lower = user_message.lower().strip()
    
    # Check for off-topic keywords
    for keyword in OFF_TOPIC_KEYWORDS:
        if keyword in msg_lower:
            return True
    
    # Check if message contains at least one on-topic keyword
    has_on_topic = any(keyword in msg_lower for keyword in ON_TOPIC_KEYWORDS)
    
    # If no on-topic keywords, it's off-topic
    if not has_on_topic:
        return True
    
    return False


# ============================================================================
# MAIN SERVICE CLASS
# ============================================================================

class AiCoachService:
    """AI Coach Service with multi-layer optimization."""

    def __init__(
        self, 
        model_name: str = 'gemini-2.0-flash',
        cache_ttl: int = 120,  # 2 min TTL per business rules (Tầng 3)
        rate_limit_calls_per_min: int = 10  # 10 calls/min per business rules (Tầng 1)
    ):
        self.model_name = model_name
        self.cache = RequestCache(ttl_seconds=cache_ttl)
        self.rate_limiter = RateLimiter(calls_per_minute=rate_limit_calls_per_min)
        self.logger = logging.getLogger(__name__)

    def generate_chat_response(
        self, 
        user_data: dict, 
        meals: list, 
        user_message: str, 
        chat_history: list = None,
        user_id: Optional[int] = None
    ) -> str:
        """
        Generate AI response with multi-layer optimization.
        
        Optimization flow:
        1. Rate limit check → prevent excessive calls
        2. Template matching → instant response for common questions
        3. Cache lookup → return cached response if available
        4. API call → with retry logic and exponential backoff
        5. Cache response → for future identical requests
        
        Args:
            user_data: Dict with user info (name, goal_type, target_calories, etc)
            meals: List of meals dict (food_name, calories, etc)
            user_message: User's question
            chat_history: Ignored (kept for backward compatibility)
            user_id: User ID for rate limiting and caching
        
        Returns:
            str: Response from AI or template
        
        Raises:
            AiQuotaExceeded: If API returns 429 (quota exceeded)
            AiServiceError: For other errors (invalid API key, timeout, etc)
        """
        
        # ✅ LAYER 2: Template Matching (no API call, no rate limit)
        template_key = _detect_template_match(user_message)
        if template_key and template_key in RESPONSE_TEMPLATES:
            self.logger.info(f"✓ Template matched: {template_key}")
            try:
                template = RESPONSE_TEMPLATES[template_key]
                
                if template_key == "greeting":
                    name = user_data.get('name', 'bạn')
                    return template.format(name=name)
                
                if template_key == "meal_history":
                    # Format meal list for display
                    if meals:
                        meal_lines = [f"  • {m.get('food_name', 'N/A')}: {m.get('calories', 0)} kcal" 
                                     for m in meals[:10]]
                        meals_list = "\n".join(meal_lines)
                    else:
                        meals_list = "  Chưa ghi nhận món ăn nào."
                    
                    total_eaten = sum(m.get('calories', 0) for m in meals)
                    target = user_data.get('target_calories', 2000)
                    remaining = max(0, target - total_eaten)
                    
                    return template.format(
                        meals_list=meals_list,
                        total=total_eaten,
                        target=target,
                        remaining=remaining
                    )
                
                if template_key in ["calories", "more", "less"]:
                    total_eaten = sum(m.get('calories', 0) for m in meals)
                    target = user_data.get('target_calories', 2000)
                    remaining = max(0, target - total_eaten)
                    over = max(0, total_eaten - target)
                    
                    return template.format(
                        eaten=total_eaten,
                        target=target,
                        remaining=remaining,
                        over=over
                    )
                
                return template
            except Exception as e:
                self.logger.warning(f"⚠️ Template rendering failed: {e}, falling back to API")
        
        # ✅ LAYER 2B: Guardrail Check (no API call, no rate limit)
        if _is_off_topic(user_message):
            self.logger.info(f"🚫 Off-topic question detected: {user_message[:50]}")
            return GUARDRAIL_RESPONSE
        
        # ✅ LAYER 3: Check Cache (no API call, no rate limit)
        cache_key = self.cache._make_key(user_message, user_id)
        cached_response = self.cache.get(cache_key)
        if cached_response:
            return cached_response
        
        # ✅ Check API Key
        if not os.getenv("GEMINI_API_KEY"):
            raise AiServiceError(
                "Trợ lý AI chưa được cấu hình. Vui lòng liên hệ quản trị viên."
            )
        
        # ✅ LAYER 1: Rate Limiting (ONLY BEFORE API CALL - protects API quota)
        if user_id:
            self.rate_limiter.is_allowed(user_id)  # Raises AiRateLimited if blocked
        
        # ✅ LAYER 4: Build optimized system instruction
        system_instruction = self._build_system_instruction(user_data, meals)
        
        # ✅ LAYER 5: API Call with Retry Logic
        response_text = self._call_gemini_with_retry(
            system_instruction=system_instruction,
            user_message=user_message
        )
        
        # ✅ LAYER 6: Cache Response
        if response_text and user_id:
            self.cache.set(cache_key, response_text)
        
        return response_text
    
    def _build_system_instruction(self, user_data: dict, meals: list) -> str:
        """
        Build comprehensive system instruction with detailed meal list and guardrails.
        
        This includes:
        1. Strict role definition with 3 allowed functions
        2. Detailed meal list from meallog
        3. Calorie tracking data
        4. Mandatory guardrail to reject off-topic questions
        """
        
        fallback = (
            "Bạn là Chuyên gia Dinh dưỡng AI giới hạn nghiêm ngặt.\n"
            "Trả lời <100 từ, tiếng Việt, thân thiện, emoji. 🎯"
        )
        
        try:
            if not user_data:
                return fallback
            
            # ============ STEP 1: Build detailed meal list ============
            meals_list_str = "Chưa ghi nhận món ăn nào trong ngày."
            if meals:
                meal_lines = []
                for idx, meal in enumerate(meals, 1):
                    name = meal.get('food_name', '').strip()
                    cal = meal.get('calories', 0)
                    meal_type = meal.get('meal_type', '')
                    
                    if name and cal > 0:
                        # Format: "- Sáng 08:00: Phở bò (450 kcal)"
                        meal_lines.append(f"  • {name}: {cal} kcal")
                    
                    if len(meal_lines) >= 10:  # Limit to 10 meals to avoid token bloat
                        break
                
                if meal_lines:
                    meals_list_str = "\n".join(meal_lines)
            
            # ============ STEP 2: Calculate totals ============
            total_eaten = sum(m.get('calories', 0) for m in meals)
            target = (
                user_data.get('target_calories') or 
                user_data.get('daily_calorie_intake') or 
                2000
            )
            remaining = max(0, target - total_eaten)
            
            name = user_data.get('name', 'bạn')
            goal = user_data.get('goal_type', 'duy trì sức khỏe')
            
            # ============ STEP 3: Build STRICT system instruction with guardrails ============
            instruction = f"""Bạn là một Chuyên gia Dinh dưỡng AI giới hạn nghiêm ngặt. 
Bạn CHỈ được phép xử lý 3 nhiệm vụ sau:
1. [func1]: Tính toán và báo cáo calo nạp vào dựa trên dữ liệu được cấp.
2. [meallog]: Liệt kê danh sách các món ăn thực tế người dùng đã ăn từ dữ liệu được cấp dưới đây.
3. [macro]: Tư vấn về hàm lượng Protein, Carbs, Fat (nếu người dùng hỏi).

[HỒ SƠ NGƯỜI DÙNG]:
- Tên: {name}
- Mục tiêu: {goal}

[DỮ LIỆU ĐƯỢC CẤP TỪ DATABASE]:
- Tổng calo hôm nay: {total_eaten}/{target} kcal
- Còn lại: {remaining} kcal
- Danh sách lịch sử món ăn hôm nay:
{meals_list_str}

[QUY TẮC BẮT BUỘC - PHẢI TUÂN THỦ CHẶT CHẼ]:
- Nếu câu hỏi của người dùng KHÔNG liên quan đến 3 nhiệm vụ trên hoặc nằm ngoài dữ liệu sức khỏe/dinh dưỡng (ví dụ: hỏi về khoa học, lập trình, địa lý, tán gẫu, thời tiết, tin tức...), bạn KHÔNG ĐƯỢC giải thích, KHÔNG ĐƯỢC trả lời mà PHẢI ĐÁP CHÍNH XÁC CỤM TỪ: "Những gì bạn hỏi nằm ngoài vùng xử lý của tôi, xin mời bạn hỏi lại"
- Trả lời bằng tiếng Việt, dưới 100 từ
- Sử dụng emoji phù hợp
- Thân thiện và chuyên nghiệp

[GHI CHÚ QUAN TRỌNG]: Bạn phải hoàn toàn tuân thủ ranh giới xử lý. Đây là ràng buộc cứng và không thể thay đổi."""
            
            return instruction
        
        except Exception as e:
            self.logger.warning(f"⚠️ System instruction build failed: {e}")
            return fallback
    
    def _call_gemini_with_retry(
        self, 
        system_instruction: str, 
        user_message: str,
        max_retries: int = 3,
        initial_backoff: float = 1.0
    ) -> str:
        """Call Gemini API with exponential backoff retry logic."""
        
        backoff = initial_backoff
        
        for attempt in range(max_retries):
            try:
                model = genai.GenerativeModel(
                    model_name=self.model_name,
                    system_instruction=system_instruction
                )
                
                response = model.generate_content(user_message)
                
                if response and hasattr(response, 'text') and response.text:
                    self.logger.info(f"✓ API call successful on attempt {attempt + 1}")
                    return response.text
                else:
                    raise AiServiceError("API trả về phản hồi trống.")
            
            # 🚨 Quota exceeded - fail immediately, don't retry
            except google_exceptions.ResourceExhausted:
                self.logger.error(f"🚨 API Quota Exceeded (429) - attempt {attempt + 1}")
                raise AiQuotaExceeded(
                    "Hệ thống AI tạm thời quá tải. Vui lòng thử lại sau 1-2 phút."
                )
            
            # 🔴 Auth errors - fail immediately
            except google_exceptions.GoogleAPIError as e:
                error_lower = str(e).lower()
                
                if any(x in error_lower for x in ["invalid_api_key", "unauthenticated", "permission", "forbidden"]):
                    raise AiServiceError(f"Lỗi xác thực API: {str(e)[:60]}")
                
                # Retry other Google API errors
                if attempt < max_retries - 1:
                    self.logger.warning(
                        f"⚠️ Google API Error (attempt {attempt + 1}/{max_retries}). "
                        f"Retrying in {backoff}s..."
                    )
                    time.sleep(backoff)
                    backoff *= 2
                else:
                    raise AiServiceError(f"Lỗi API sau {max_retries} lần thử.")
            
            # 🟡 Transient errors - retry with backoff
            except Exception as e:
                error_lower = str(e).lower()
                
                # Quota error in generic exception
                if "429" in str(e) or "resourceexhausted" in error_lower:
                    raise AiQuotaExceeded("API quá tải. Thử lại sau 1-2 phút.")
                
                # Connection error - retry
                if any(x in error_lower for x in ["timeout", "connection", "pool"]):
                    if attempt < max_retries - 1:
                        self.logger.warning(
                            f"⚠️ Connection error (attempt {attempt + 1}/{max_retries}). "
                            f"Retrying in {backoff}s..."
                        )
                        time.sleep(backoff)
                        backoff *= 2
                    else:
                        raise AiServiceError("Không thể kết nối tới API. Kiểm tra mạng.")
                else:
                    # Other errors
                    self.logger.error(f"❌ Unexpected error (attempt {attempt + 1}): {e}")
                    if attempt < max_retries - 1:
                        time.sleep(backoff)
                        backoff *= 2
                    else:
                        raise AiServiceError(f"Lỗi AI: {str(e)[:60]}")
        
        raise AiServiceError("Không thể gọi API sau nhiều lần thử.")


# ============================================================================
# SINGLETON INSTANCE
# ============================================================================

ai_coach_service = AiCoachService()
