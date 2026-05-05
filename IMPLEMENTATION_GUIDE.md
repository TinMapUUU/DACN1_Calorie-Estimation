# Implementation Guide - Age & Gender Feature with Smart Calorie Calculation

## ✅ Implementation Summary

All changes have been completed successfully across frontend and backend!

### **What Was Added**

#### **Backend Changes**
1. **Database Model** ([backend/models/db_models.py](backend/models/db_models.py))
   - Added `age: int` field to User model (required)
   - Added `gender: Gender` enum field to User model (required, options: male, female, other)
   - Added `Gender` enum with three options: male, female, other
   - Added `activity_level: float` field to UserProfile (default 1.5 for moderate activity)

2. **Pydantic Schemas** ([backend/models/schemas.py](backend/models/schemas.py))
   - Updated `UserCreate` schema with age (validated 10-150) and gender (required)
   - Created new `UserResponse` schema that returns user data including age and gender
   - Updated `Token` schema to include age and gender in login response

3. **Calorie Calculator** (New file: [backend/utils/calorie_calculator.py](backend/utils/calorie_calculator.py))
   - Implemented **Mifflin-St Jeor formula** for accurate BMR calculation
   - `calculate_bmr()` - calculates Basal Metabolic Rate based on age, weight, height, gender
   - `calculate_tdee()` - calculates Total Daily Energy Expenditure with activity level
   - `calculate_daily_calories()` - calculates daily calorie target with goal adjustments (lose/maintain/gain)
   - Includes safety minimums (1200 kcal for females, 1500 kcal for males)

4. **Auth Router** ([backend/routers/auth.py](backend/routers/auth.py))
   - `/register` endpoint now accepts and stores age and gender
   - `/login` endpoint returns age and gender in Token response
   - `/users/me` endpoint returns UserResponse model with age and gender

5. **BMI Router** ([backend/routers/bmi.py](backend/routers/bmi.py))
   - Replaced hardcoded calorie values (2000/1500/2500) with **Mifflin-St Jeor formula**
   - Calorie targets now based on actual user age, weight, height, gender, and goal
   - Uses activity level (default 1.5) for TDEE calculation

#### **Frontend Changes**
1. **Register Form** ([frontend/src/app/register/page.tsx](frontend/src/app/register/page.tsx))
   - Added age input field (type="number", min 10, max 150, required)
   - Added gender dropdown with options: Male (Nam), Female (Nữ), Other (Khác)
   - Client-side validation for age range
   - Both fields are required before form submission

2. **Profile Page** ([frontend/src/app/profile/page.tsx](frontend/src/app/profile/page.tsx))
   - Fetches age and gender from `/users/me` API endpoint
   - Displays age and gender in profile information section
   - Shows gender in Vietnamese: "Nam" (Male), "Nữ" (Female), "Khác" (Other)

---

## 🚀 Next Steps: Database Setup

### **Option 1: Fresh Start (Recommended for Testing)**
If you don't have important data in the database, the easiest approach:

```bash
# 1. Drop the existing DACN2 database
# In pgAdmin or psql:
DROP DATABASE DACN2;

# 2. Restart the backend - it will auto-create the database with correct schema
# The backend will call create_db_and_tables() on startup
```

### **Option 2: Database Migration (For Existing Data)**
If you have important data in the database, use database migration:

```bash
# Install alembic (if not already installed)
pip install alembic sqlalchemy

# In backend directory:
cd backend

# Initialize alembic (if not already done)
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Add age and gender fields to User"

# Apply migration
alembic upgrade head
```

### **Option 3: Manual SQL (Quickest if database is small)**
```sql
-- Connect to your DACN2 database and run:
ALTER TABLE "user" ADD COLUMN age INTEGER NOT NULL DEFAULT 18;
ALTER TABLE "user" ADD COLUMN gender VARCHAR NOT NULL DEFAULT 'male';

-- Update gender enum in db_models if needed
-- PostgreSQL doesn't auto-create enums, so the above uses VARCHAR for compatibility
```

---

## ✅ Testing Checklist

### **Backend Testing**

1. **Start Backend**
   ```bash
   cd backend
   source .venv/Scripts/activate  # Windows
   uvicorn main:app --reload
   ```
   - Check console for `✅ Database ready!`
   - No error messages should appear

2. **Test Registration Endpoint**
   ```bash
   curl -X POST http://localhost:8000/api/v1/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "testuser@example.com",
       "phone_number": "09123456789",
       "password": "TestPassword123",
       "full_name": "Test User",
       "age": 25,
       "gender": "male"
     }'
   ```
   - Response: `{"message": "Đăng ký tài khoản thành công!", "user_id": X}`

3. **Test Login Endpoint**
   ```bash
   curl -X POST http://localhost:8000/api/v1/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "testuser@example.com",
       "password": "TestPassword123"
     }'
   ```
   - Response should include `access_token`, `full_name`, `age`, and `gender`

4. **Test Get User Endpoint**
   ```bash
   curl -X GET http://localhost:8000/api/v1/users/me \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
   ```
   - Response should include age and gender fields

5. **Test BMI Calculation (with age-aware calories)**
   ```bash
   curl -X POST http://localhost:8000/api/v1/profile/bmi \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
     -d '{
       "weight_kg": 70,
       "height_cm": 175,
       "goal_type": "maintain_weight"
     }'
   ```
   - Response should show calculated daily_calorie_goal based on Mifflin-St Jeor formula
   - Compare with online TDEE calculators to verify accuracy

### **Frontend Testing**

1. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Test Registration Form**
   - Navigate to http://localhost:3000/register
   - Fill in all fields:
     - Full Name: "John Doe"
     - Phone: "0912345678"
     - Age: "25"
     - Gender: "Male"
     - Email: "johndoe@example.com"
     - Password: "SecurePass123"
   - Click Register
   - Should redirect to login page with success message

3. **Test Login**
   - Use the credentials from step 2 to login
   - Should display user dashboard

4. **Test Profile Page**
   - After login, navigate to Profile
   - Should display:
     - Full Name
     - Email
     - Age: "25"
     - Gender: "Nam" (Vietnamese translation of Male)
   - Verify all fields load correctly

---

## 📊 Calorie Calculation Formula Verification

### **Test Case: 25-year-old male, 70kg, 175cm, moderate activity**

**Mifflin-St Jeor Formula:**
- BMR = (10×70) + (6.25×175) - (5×25) + 5 = 1687.5 kcal/day
- TDEE = 1687.5 × 1.55 = 2615.6 kcal/day

**Daily Calorie Targets:**
- **Maintain Weight:** 2615 kcal/day
- **Lose Weight:** 2115 kcal/day (2615 - 500)
- **Gain Weight:** 3115 kcal/day (2615 + 500)

**Verification:**
Compare the calculated values in your API response with online TDEE calculators:
- [IIFYM.com TDEE Calculator](https://iifym.com/tdee-calculator/)
- [Calculator.net BMR Calculator](https://www.calculator.net/bmr-calculator.html)

They should match within ±50 kcal (rounding differences).

---

## 🔍 Troubleshooting

### **Issue: "age field not found" error when registering**
- **Cause:** Database schema not updated yet
- **Solution:** Follow Option 1 (drop database) or Option 2 (migration) above

### **Issue: Gender enum error**
- **Cause:** PostgreSQL enum not created
- **Solution:** Use Option 3 (manual SQL) to add gender as VARCHAR, or recreate database

### **Issue: Frontend age/gender not displaying in profile**
- **Cause:** API endpoint not returning new fields
- **Cause:** Browser cache of old API response
- **Solution:** 
  - Clear browser cache (Ctrl+Shift+Delete)
  - Verify backend is running latest code
  - Check browser console (F12) for API errors

### **Issue: Calorie calculation shows wrong values**
- **Cause:** Activity_level not set correctly or old hardcoded formula still running
- **Solution:**
  - Restart backend (`uvicorn main:app --reload`)
  - Verify bmi.py imports calorie_calculator correctly
  - Check UserProfile has activity_level field

---

## 📁 Modified Files Summary

| File | Changes | Status |
|------|---------|--------|
| [backend/models/db_models.py](backend/models/db_models.py) | Added age, gender to User; activity_level to UserProfile | ✅ |
| [backend/models/schemas.py](backend/models/schemas.py) | Added age/gender to UserCreate; created UserResponse; updated Token | ✅ |
| [backend/utils/calorie_calculator.py](backend/utils/calorie_calculator.py) | **NEW** - Mifflin-St Jeor formula implementation | ✅ |
| [backend/utils/__init__.py](backend/utils/__init__.py) | **NEW** - Empty init file | ✅ |
| [backend/routers/auth.py](backend/routers/auth.py) | Updated register/login/users-me endpoints | ✅ |
| [backend/routers/bmi.py](backend/routers/bmi.py) | Replaced hardcoded calories with formula-based calculation | ✅ |
| [frontend/src/app/register/page.tsx](frontend/src/app/register/page.tsx) | Added age and gender input fields | ✅ |
| [frontend/src/app/profile/page.tsx](frontend/src/app/profile/page.tsx) | Display age and gender in profile | ✅ |

---

## 🎯 Key Features Implemented

✅ **Age requirement:** Users must provide age during registration (10-150 years)  
✅ **Gender tracking:** Male, Female, or Other options for accurate calorie calculation  
✅ **Mifflin-St Jeor formula:** Accurate BMR and TDEE calculation based on scientific formulas  
✅ **Age-aware calories:** Daily calorie targets now properly adjusted for user age, weight, height, gender  
✅ **Goal-based adjustments:** Different calorie targets for weight loss (-500), maintenance (0), or gain (+500)  
✅ **Activity level support:** Default 1.5 (moderate) with extensibility for future customization  
✅ **Frontend validation:** Age range validation (10-150) on registration form  
✅ **Full-stack integration:** All backend changes reflected in API responses and frontend display  

---

## 🚀 Ready to Deploy!

Once you complete the database setup (choose one of the 3 options above) and pass all tests, the feature is ready for production!

