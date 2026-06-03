# Quick Reference: AI Coach Optimization Commands

## 🚀 Quick Start

### Start Backend Server
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

### Watch Logs for Optimization Signals
```bash
# Terminal 1: Watch for cache, templates, and rate limiting
tail -f logs.txt | grep -E "Cache|Template|Rate|Quota|API call"

# Terminal 2: Make test requests
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Hello"}'
```

---

## 📋 Test Request Examples

### Test 1: Template Response (No API Call)
```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Hôm nay tôi ăn bao nhiêu calo?"}'

# Expected: 
# - Instant response (no API delay)
# - Log shows: "✓ Template matched: calories"
```

### Test 2: Cached Response (No API Call)
```bash
# First request
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Hello from Minh"}'

# Second identical request
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Hello from Minh"}'

# Expected:
# - Second is instant
# - Log shows: "✓ Cache HIT for key: abc123..."
```

### Test 3: Rate Limiting (Should Fail on 6th Request)
```bash
# Rapid fire 6 requests
for i in {1..6}; do
  echo "=== Request $i ===" 
  curl -X POST http://localhost:8000/api/v1/chat \
    -H "Content-Type: application/json" \
    -d '{"user_id": 1, "message": "Test request '$i'"}'
  sleep 0.1
done

# Expected:
# Requests 1-5: HTTP 200 or 503 (API calls)
# Request 6: HTTP 503 with detail: "Tạm thời quá nhiều yêu cầu..."
```

### Test 4: Different Users (Independent Rate Limits)
```bash
# User 1 - multiple requests
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "From user 1"}'

# User 2 - different user, not rate limited
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 2, "message": "From user 2"}'

curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 2, "message": "From user 2 again"}'

# Expected: All succeed (rate limit is per-user)
```

---

## 📊 Log Interpretation

| Log Message | Meaning | Status |
|---|---|---|
| `✓ Cache HIT for key: abc123...` | Cached response returned (no API call) | ✅ Good |
| `✗ Cache EXPIRED for key: abc123...` | TTL expired, will make API call | ℹ️ Normal |
| `📌 Cache SET for key: abc123...` | Response cached for future use | ℹ️ Normal |
| `✓ Template matched: calories` | Common question, instant response (no API) | ✅ Good |
| `✓ Template matched: greeting` | Greeting matched, instant response | ✅ Good |
| `🚫 Rate limit exceeded for user 5` | User hit rate limit, blocked | ℹ️ Working as intended |
| `✓ API call successful on attempt 1` | Normal API call succeeded | ℹ️ Normal |
| `⚠️ API call successful on attempt 2` | Transient error, but retry succeeded | ℹ️ Normal |
| `🚨 Gemini API Quota Exceeded (429)` | Hard quota hit (rare with optimizations) | ⚠️ Concerning |

---

## 🔍 Monitoring Commands

### Count Cache Hits
```bash
grep -c "Cache HIT" logs.txt
```

### Count Template Matches
```bash
grep -c "Template matched" logs.txt
```

### Count Rate Limit Triggers
```bash
grep -c "Rate limit exceeded" logs.txt
```

### Count Quota Errors
```bash
grep -c "Quota Exceeded" logs.txt
```

### Calculate Cache Hit Rate
```bash
HITS=$(grep -c "Cache HIT" logs.txt 2>/dev/null || echo 0)
REQUESTS=$(grep -c "generate_chat_response" logs.txt 2>/dev/null || echo 1)
RATE=$((HITS * 100 / REQUESTS))
echo "Cache hit rate: $RATE%"
```

### Calculate Template Match Rate
```bash
TEMPLATES=$(grep -c "Template matched" logs.txt 2>/dev/null || echo 0)
REQUESTS=$(grep -c "generate_chat_response" logs.txt 2>/dev/null || echo 1)
RATE=$((TEMPLATES * 100 / REQUESTS))
echo "Template match rate: $RATE%"
```

### Show Last 10 Quota Errors
```bash
grep "Quota Exceeded" logs.txt | tail -10
```

### Real-time Log Watch
```bash
# Watch for any optimization events
tail -f logs.txt | grep -E "Cache HIT|Template matched|Rate limit|Quota"
```

---

## 🎯 Performance Targets

### Expected Metrics After Optimization

| Metric | Target | How to Verify |
|---|---|---|
| Cache hit rate | >30% | `grep "Cache HIT"` |
| Template match rate | >15% | `grep "Template matched"` |
| Rate limit triggers | 1-3% | `grep "Rate limit exceeded"` |
| 429 error rate | <5% | `grep "Quota Exceeded"` |
| Response time (template/cache) | <300ms | Via curl timing |
| Response time (API) | 1-2s | Via curl timing |
| Concurrent users supported | 50-100 | Load test |

---

## ⚙️ Configuration Tweaks

### Adjust Cache TTL (in ai_coach.py)
```python
# Current: 600 seconds (10 minutes)
# Shorter cache: 300 seconds (5 minutes)
# Longer cache: 1800 seconds (30 minutes)

# Line: ai_coach_service = AiCoachService(
#           cache_ttl=600  ← Change this
#       )
```

### Adjust Rate Limit (in ai_coach.py)
```python
# Current: 5 calls per minute per user
# More permissive: 10 calls per minute
# More restrictive: 3 calls per minute

# Line: ai_coach_service = AiCoachService(
#           rate_limit_calls_per_min=5  ← Change this
#       )
```

---

## 🐛 Troubleshooting

### Problem: No cache hits showing up
**Check 1**: Is user_id being passed?
```bash
grep "user_id" backend/routers/chat.py
# Should see: user_id=payload.user_id
```

**Check 2**: Are requests identical?
```bash
# Cache only works for EXACT same message
# "hello" and "Hello" are different (case-sensitive)
```

**Check 3**: Is TTL expired?
```bash
# Default TTL is 10 minutes
# If you wait 11+ minutes, cache expires
```

---

### Problem: Still seeing 429 errors frequently
**Check 1**: Cache hit rate
```bash
grep "Cache HIT" logs.txt | wc -l
# Should be >30% of requests
```

**Check 2**: Template match rate
```bash
grep "Template matched" logs.txt | wc -l
# Should be >15% of requests
```

**Check 3**: Rate limiting active
```bash
grep "Rate limit exceeded" logs.txt | wc -l
# Should see some triggers (1-3% of requests)
```

**If all above are working**: Quota errors are expected under very high load (100+ concurrent users). Consider upgrading plan or implementing async queue.

---

## 📈 Load Testing

### Simple Load Test (100 requests)
```bash
# Install: apt-get install apache2-utils (or brew install httpd-tools)

ab -n 100 -c 10 \
  -p <(echo '{"user_id":1,"message":"Test"}') \
  -T application/json \
  http://localhost:8000/api/v1/chat

# Look for:
# - Failed requests: Should be <5
# - Requests per second: Should be >10
```

### Sustained Load Test (1000 requests)
```bash
ab -n 1000 -c 20 \
  -p <(echo '{"user_id":1,"message":"Test"}') \
  -T application/json \
  http://localhost:8000/api/v1/chat
```

### Simulate Real Usage (Mixed Messages)
```bash
# Create test file with different messages
cat > requests.json << 'EOF'
{"user_id":1,"message":"Tôi ăn bao nhiêu calo?"}
{"user_id":1,"message":"Tôi ăn bao nhiêu calo?"}
{"user_id":1,"message":"Hello"}
{"user_id":2,"message":"Bạn có lời khuyên không?"}
{"user_id":2,"message":"Bạn có lời khuyên không?"}
EOF

# Make 100 requests
for i in {1..100}; do
  shuf -n 1 requests.json | \
  curl -X POST http://localhost:8000/api/v1/chat \
    -H "Content-Type: application/json" \
    -d @- \
    -w "%{http_code} %{time_total}s\n" -o /dev/null
done
```

---

## 🧹 Clean Up / Reset

### Clear Logs
```bash
> logs.txt  # Truncate log file
```

### Reset Cache (requires app restart)
```bash
# Cache is in-memory, so restart the app:
# Ctrl+C to stop uvicorn
# python -m uvicorn main:app --reload  # Start again
```

### Check Current Cache Size (rough estimate)
```bash
# No direct way, but you can see hits/misses in logs:
grep "Cache" logs.txt | wc -l
```

---

## 🔄 Comparison: Before vs After

### Before Optimization
```
Request: "Tôi ăn bao nhiêu calo?"
         ↓
      [No Cache]
         ↓
      [No Template]
         ↓
      [Call API]
         ↓
    Response Time: 2-3 seconds
    API Calls: 1/1
    Risk: 429 errors
```

### After Optimization
```
Request: "Tôi ăn bao nhiêu calo?"
         ↓
      [Rate Limit OK] (Layer 1)
         ↓
      [Template Match!] (Layer 2) → Instant response
         ↓
    Response Time: <100ms
    API Calls: 0/1
    Risk: No error
```

---

## 📞 Support

If optimization isn't working as expected:

1. Verify user_id is being passed (check chat.py)
2. Check that ai_coach.py has all 6 layers (verify imports)
3. Look for Python syntax errors: `python -m py_compile backend/services/ai_coach.py`
4. Check logs for error messages
5. Restart backend service: `Ctrl+C` then `python -m uvicorn main:app --reload`

---

## 🚀 Next Steps

1. **Test locally** using commands above
2. **Monitor logs** to verify cache/template/rate-limit working
3. **Load test** to ensure stability
4. **Deploy to production**
5. **Monitor metrics** for 24 hours
6. **Tune configuration** (cache_ttl, rate_limit) based on results
7. **Document lessons learned**
