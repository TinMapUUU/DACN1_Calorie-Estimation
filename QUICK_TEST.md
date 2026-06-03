# 🎯 Bản Tham khảo Nhanh - Guardrail & Meal Listing

## 📌 2 Tính năng Chính

### 1. Danh sách Món Ăn Chi tiết ✅
- Đọc từ `meallog` table
- Liệt kê lên đến 10 món
- Format: `• Phở bò: 450 kcal`
- Nhúng trong system instruction

### 2. Guardrail Filter ✅
- Kiểm tra câu hỏi OFF-TOPIC
- Chặn trước khi gọi API
- Response cố định: "Những gì bạn hỏi nằm ngoài vùng xử lý của tôi, xin mời bạn hỏi lại."
- Tiết kiệm ~10-20% API calls

---

## 🧪 Test Nhanh

### OFF-TOPIC (Guardrail)
```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Viết code giúp tôi"}'

# Expected: Guardrail response + no API call
```

### ON-TOPIC (Normal)
```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Hôm nay tôi ăn gì?"}'

# Expected: Danh sách món ăn + calo
```

### Template (Instant)
```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Tôi ăn bao nhiêu calo?"}'

# Expected: Template response instantly
```

---

## 📊 Performance

| Type | Time | API Call |
|---|---|---|
| Guardrail | <50ms | ❌ No |
| Template | <100ms | ❌ No |
| Cached | <100ms | ❌ No |
| API | 1-2s | ✅ Yes |

---

## 🔍 Monitoring

### Watch logs real-time
```bash
tail -f logs.txt | grep -E "Template|Off-topic|Cache|API"
```

### Key log messages
- `✓ Template matched: calories` → Template response
- `🚫 Off-topic question detected` → Guardrail triggered
- `✓ Cache HIT for key` → Cached response
- `✓ API call successful` → API response

---

## 📝 Keywords

### ON-TOPIC (Allow)
calo, kcal, ăn, lịch sử, hôm nay, protein, carbs, fat, bmi, sức khỏe

### OFF-TOPIC (Block)
code, lập trình, thủ đô, tiếng anh, toán, phim, nhạc, game, thời tiết

---

## ✅ Checklist

- [ ] Backend started: `python -m uvicorn main:app --reload`
- [ ] Test OFF-TOPIC query → Guardrail response
- [ ] Test ON-TOPIC query → Normal processing
- [ ] Test Template match → Instant response
- [ ] Test Cached response → 2nd identical query
- [ ] Check logs for all expected messages
- [ ] Verify meal list appears in responses
- [ ] Ready to deploy ✅

---

## 🚀 Start Testing

1. Open terminal, start backend
2. Open another terminal, run test commands above
3. Monitor logs with `tail -f logs.txt`
4. Verify all scenarios work
5. Deploy to production

---

## 📞 Issues?

| Issue | Check |
|---|---|
| Guardrail not blocking | Keywords in OFF_TOPIC_KEYWORDS? |
| Meals not showing | Data in meallog table? |
| Template not matching | Keywords in template map? |
| Slow responses | Check API/network? |

---

**Status**: ✅ Ready to test

See: `TESTING_GUARDRAIL.md` for detailed testing guide
See: `GUARDRAIL_UPDATE.md` for technical details
See: `IMPLEMENTATION_COMPLETE.md` for full summary
