# Quick Reference: Testing AI Coach Optimizations

## 🚀 Quick Test Commands

### Test 1: Run the Backend
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

### Test 2: Test Cache (Same Message Twice)
```bash
# Terminal 1: Watch logs
tail -f logs.txt | grep -E "Cache|Template"

# Terminal 2: Make requests
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Tôi ăn bao nhiêu calo?"}'

# Wait 2 seconds, run same command again
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Tôi ăn bao nhiêu calo?"}'

# Expected in logs:
# 1st call:  "✓ Template matched: calories"
# 2nd call:  "✓ Cache HIT for key: xxxxxxx..."
```

### Test 3: Test Template Responses (No API Call)
```bash
# These should all trigger templates and NOT call API

# Calories question
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Hôm nay tôi ăn bao nhiêu kcal?"}'

# Greeting
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Hello"}'

# More food
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Tôi còn được ăn không?"}'

# Expected in logs: "✓ Template matched: {template_name}"
```

### Test 4: Test Rate Limiting
```bash
# Make 6 requests rapidly from same user
for i in {1..6}; do
  curl -X POST http://localhost:8000/api/v1/chat \
    -H "Content-Type: application/json" \
    -d '{"user_id": 1, "message": "Test request '$i'"}'
  echo "Request $i sent"
done

# Expected:
# Requests 1-5: HTTP 200 or 503 (API calls)
# Request 6: HTTP 503 with "Tạm thời quá nhiều yêu cầu"
# In logs: "🚫 Rate limit exceeded for user 1"
```

### Test 5: Test Different Users (Independent Rate Limits)
```bash
# User 1 makes 3 requests
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Hello from user 1"}'

# User 2 makes 3 requests (should NOT be rate limited)
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 2, "message": "Hello from user 2"}'

curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 2, "message": "Another from user 2"}'

# Expected: All should work (rate limit is per user, not global)
```

### Test 6: Test Error Scenarios
```bash
# Test with invalid user (should still work with defaults)
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 999, "message": "Test"}'

# Expected: Should return template or graceful error
```

---

## 📊 Monitoring Logs

### What to Look For

```bash
# Good signs (optimization working):
grep "Cache HIT" logs.txt           # Cache is being used
grep "Template matched" logs.txt    # Templates are reducing API calls
grep "API call successful on attempt 1" logs.txt  # Fast API responses

# Expected patterns:
grep "Rate limit exceeded" logs.txt # Rate limiting is active (good!)
grep "Cache EXPIRED" logs.txt       # TTL working (normal)

# Bad signs (problems):
grep "Quota Exceeded" logs.txt      # API quota being hit (means optimizations not enough)
grep "ResourceExhausted" logs.txt   # Same as above
grep "Google API Error" logs.txt    # API configuration issue
```

### Parse Logs for Stats

```bash
# Count cache hits
grep -c "Cache HIT" logs.txt

# Count templates matched
grep -c "Template matched" logs.txt

# Count quota exceeded
grep -c "Quota Exceeded" logs.txt

# Calculate cache hit rate
HITS=$(grep -c "Cache HIT" logs.txt)
TOTAL=$(grep -c "generate_chat_response" logs.txt)
echo "Cache hit rate: $((HITS * 100 / TOTAL))%"
```

---

## 🔍 Frontend Testing

### Test with React/Next.js Frontend

```javascript
// Test cache (send same message twice quickly)
async function testCache() {
  const response1 = await fetch('/api/v1/chat', {
    method: 'POST',
    body: JSON.stringify({
      user_id: 1,
      message: 'Tôi ăn bao nhiêu calo?'
    })
  });
  console.log('Response 1:', await response1.json());
  
  // Same message, should be faster (cached)
  const response2 = await fetch('/api/v1/chat', {
    method: 'POST',
    body: JSON.stringify({
      user_id: 1,
      message: 'Tôi ăn bao nhiêu calo?'
    })
  });
  console.log('Response 2 (cached):', await response2.json());
}

// Test rate limiting
async function testRateLimit() {
  for (let i = 0; i < 6; i++) {
    const response = await fetch('/api/v1/chat', {
      method: 'POST',
      body: JSON.stringify({
        user_id: 1,
        message: `Request ${i}`
      })
    });
    console.log(`Request ${i}: ${response.status}`, await response.json());
  }
}

// Test templates
async function testTemplates() {
  const questions = [
    'Hôm nay tôi ăn bao nhiêu calo?',
    'Hello',
    'Tôi còn được ăn không?'
  ];
  
  for (const q of questions) {
    const response = await fetch('/api/v1/chat', {
      method: 'POST',
      body: JSON.stringify({
        user_id: 1,
        message: q
      })
    });
    console.log(`Question: "${q}" - Status: ${response.status}`);
  }
}
```

---

## 🎯 Performance Expectations

### Before Optimization
- Cache hit rate: 0%
- Template matching: 0%
- API quota errors (429): 15-25% under normal load
- Response time: 2-3 seconds average
- Max users before quota: ~5-10 concurrent

### After Optimization
- Cache hit rate: 30-40% (if users repeat messages)
- Template matching: 15-25%
- API quota errors (429): <5% under normal load
- Response time: 200-500ms (templates), 1-2s (API calls)
- Max users before quota: 50-100+ concurrent (depends on message patterns)

---

## 🐛 Debugging Specific Issues

### Issue: Still seeing too many 429 errors

**Check 1: Is cache working?**
```bash
grep "Cache HIT" logs.txt | wc -l  # Should be >30% of requests
```

**Check 2: Is rate limiting triggering?**
```bash
grep "Rate limit exceeded" logs.txt | wc -l  # Should see some
```

**Check 3: Is template matching working?**
```bash
grep "Template matched" logs.txt | wc -l  # Should be >15% of requests
```

**Solution**: If any are 0, check that `user_id` is being passed to the service.

### Issue: Cache not working

**Check**: Is `user_id` being passed?
```python
# In chat.py, verify this line exists:
ai_reply = ai_coach_service.generate_chat_response(
    ...
    user_id=payload.user_id  # ← Must have this
)
```

### Issue: Templates always triggering, even for complex questions

**Check**: Is template matching too aggressive?
```python
# In ai_coach.py, keywords_map might be too broad
# Reduce keywords or make matching stricter:
keywords_map = {
    "calories": ["calo", "kcal"],  # Fewer keywords = less false positives
    ...
}
```

---

## 📈 Fine-Tuning Configuration

### Adjust Cache TTL (in ai_coach.py)

```python
# Default: 600 seconds (10 minutes)
# For interactive sessions (users chat quickly): 300s (5 min)
# For casual usage (users chat slowly): 1800s (30 min)
ai_coach_service = AiCoachService(
    cache_ttl=300  # Change this
)
```

### Adjust Rate Limit (in ai_coach.py)

```python
# Default: 5 calls per minute per user
# For power users: 10 calls per minute
# For conservative: 3 calls per minute
ai_coach_service = AiCoachService(
    rate_limit_calls_per_min=10  # Change this
)
```

---

## 🧪 Production Readiness Checklist

- [ ] All 6 optimization layers implemented
- [ ] `user_id` parameter being passed to service
- [ ] Cache is working (verify in logs)
- [ ] Templates are matching (verify in logs)
- [ ] Rate limiting is active (verify in logs)
- [ ] Error responses have correct HTTP codes (429, 503, 500)
- [ ] Frontend handles rate limit message gracefully
- [ ] Monitoring/alerting set up for 429 errors
- [ ] Team trained on new optimization features
- [ ] Documentation updated

---

## 📞 Rollback Plan

If optimizations cause issues:

```bash
# Revert to previous ai_coach.py
git checkout backend/services/ai_coach.py

# Revert chat.py changes
git checkout backend/routers/chat.py

# Restart service
python -m uvicorn main:app --reload
```

All changes are isolated to these 2 files, so rollback is simple.
