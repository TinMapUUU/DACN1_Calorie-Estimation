# 🧪 Hướng dẫn Kiểm thử - Guardrail & Meal Listing

## 🚀 Bước 1: Khởi động Backend

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

Nếu thành công, sẽ thấy:
```
INFO:     Started server process [1234]
INFO:     Uvicorn running on http://127.0.0.1:8000
```

---

## 📋 Bước 2: Kiểm thử các Scenario

### Test 1: OFF-TOPIC Question (Guardrail)
❌ **Câu hỏi nằm ngoài phạm vi** → Phải trả về guardrail response

```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Viết code giúp tôi"}'
```

**Expected Output:**
```json
{
  "reply": "Những gì bạn hỏi nằm ngoài vùng xử lý của tôi, xin mời bạn hỏi lại."
}
```

**Check Logs:**
```
🚫 Off-topic question detected: Viết code giúp tôi
```

---

### Test 2: ON-TOPIC Question (Normal Processing)
✅ **Câu hỏi về dinh dưỡng** → Xử lý bình thường

```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Hôm nay tôi đã ăn gì?"}'
```

**Expected Output:**
```json
{
  "reply": "Hôm nay bạn đã ăn:\n- Phở bò (450 kcal)\n- Cơm tấm (600 kcal)\nTổng: 1050/2000 kcal. Còn 950 kcal nữa! 💪"
}
```

**Check Logs:**
```
✓ API call successful on attempt 1
```

---

### Test 3: Template Match (Instant Response)
⚡ **Câu hỏi về calo** → Match template, không gọi API

```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Tôi ăn bao nhiêu calo rồi?"}'
```

**Expected Output:**
```json
{
  "reply": "Hôm nay bạn đã nạp 1050/2000 kcal. Còn 950 kcal nữa thôi! 💪 Hãy ăn uống hợp lý nhé!"
}
```

**Check Logs:**
```
✓ Template matched: calories
```

---

### Test 4: Cached Response (Even Faster)
💨 **Câu hỏi giống hệt** → Return từ cache

```bash
# Lần 1: Cache MISS
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Bạn có lời khuyên không?"}'

# Lần 2: Cache HIT (ngay lập tức)
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Bạn có lời khuyên không?"}'
```

**Check Logs:**
```
1st: ✓ API call successful on attempt 1
2nd: ✓ Cache HIT for key: abc123...
```

---

## 🔍 Danh sách OFF-TOPIC Keywords để Test

```bash
# Test 1: Lập trình
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Code Python thế nào?"}'

# Test 2: Địa lý
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Thủ đô của Pháp là gì?"}'

# Test 3: Tiếng Anh
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Tiếng anh là gì?"}'

# Test 4: Toán
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "2 + 2 bằng mấy?"}'

# Test 5: Thời tiết
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Thời tiết hôm nay thế nào?"}'
```

**Expected:** Tất cả trả về guardrail response

---

## 📊 Danh sách ON-TOPIC Keywords để Test

```bash
# Test 1: Calo
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Bao nhiêu calo?"}'

# Test 2: Lịch sử ăn uống
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Lịch sử ăn uống hôm nay"}'

# Test 3: Sáng/Trưa/Tối
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Sáng nay tôi ăn gì?"}'

# Test 4: Protein/Carbs/Fat
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Protein hôm nay bao nhiêu?"}'

# Test 5: BMI & Sức khỏe
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "BMI của tôi tốt không?"}'
```

**Expected:** Xử lý bình thường (có thể template/cache/API)

---

## 📈 Monitoring Logs

### Watch thời gian thực
```bash
# Terminal khác, watch logs
tail -f logs.txt | grep -E "Template|Off-topic|Cache|API call"
```

### Statistics
```bash
# Count off-topic detections
grep "Off-topic" logs.txt | wc -l

# Count template matches
grep "Template matched" logs.txt | wc -l

# Count API calls
grep "API call successful" logs.txt | wc -l

# Count cache hits
grep "Cache HIT" logs.txt | wc -l
```

---

## ✅ Verification Checklist

Để xác nhận implementation hoạt động:

- [ ] OFF-TOPIC question → Trả về: "Những gì bạn hỏi nằm ngoài vùng xử lý..."
- [ ] ON-TOPIC question → Xử lý bình thường (có danh sách món ăn)
- [ ] Template match → Instant response (không gọi API)
- [ ] Cached response → Instant, có log "Cache HIT"
- [ ] Logs có "🚫 Off-topic question detected" message
- [ ] System instruction chứa danh sách chi tiết món ăn
- [ ] Guardrail rules có trong system instruction

---

## 🐛 Troubleshooting

| Issue | Nguyên nhân | Giải pháp |
|---|---|---|
| Guardrail không chặn | Keywords thiếu | Thêm từ khóa vào OFF_TOPIC_KEYWORDS |
| Danh sách món ăn trống | Không có data trong meallog | Insert test meals vào meallog table |
| Template response không hiện | Keywords không match | Check _detect_template_match logic |
| Quá nhiều false positives | OFF_TOPIC_KEYWORDS quá rộng | Refine keywords, test specific ones |
| API error 429 | Vẫn gặp quota issues | Check guardrail hit rate (nên >20%) |

---

## 📝 Test Results Template

```
Test Date: 2026-06-04
Backend Version: [version]

RESULTS:
┌─────────────────────────────────────────────────────┐
│ Guardrail Test                                      │
├─────────────────────────────────────────────────────┤
│ OFF-TOPIC questions blocked: ✅ YES / ❌ NO         │
│ Guardrail response correct: ✅ YES / ❌ NO          │
│ Response time: [time]ms                             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Meal Listing Test                                   │
├─────────────────────────────────────────────────────┤
│ Meals appear in response: ✅ YES / ❌ NO            │
│ Meal list format correct: ✅ YES / ❌ NO            │
│ Calorie data accurate: ✅ YES / ❌ NO               │
│ Response time: [time]ms                             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Performance Test                                    │
├─────────────────────────────────────────────────────┤
│ Template match response: [time]ms                   │
│ Cached response: [time]ms                           │
│ API call response: [time]ms                         │
│ Guardrail response: [time]ms                        │
└─────────────────────────────────────────────────────┘

NOTES:
- [Write any findings or issues]
```

---

## 🎯 Next Steps

1. ✅ Run all test scenarios above
2. ✅ Verify logs show expected behavior
3. ✅ Fine-tune keywords if needed
4. ✅ Prepare for production deployment
5. ✅ Document any custom keywords added

---

**Status**: 🧪 **READY FOR TESTING**
