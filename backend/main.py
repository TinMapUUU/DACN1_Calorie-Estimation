# fastapi core
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# module nội bộ
from database.connection import create_db_and_tables
# 1. THÊM Ở ĐÂY: import thêm history_api
from routers import auth, bmi, scanner, history_api 

app = FastAPI(title="Greenhouse API")

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Cho phép frontend Next.js gọi API
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo DB khi chạy
@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    print("✅ Database ready!")

# Nhúng các Router
app.include_router(auth.router)
app.include_router(bmi.router, prefix="/api/v1", tags=["Profile & BMI"])
app.include_router(scanner.router, prefix="/api/v1", tags=["AI Scanner"])

# 2. THÊM Ở ĐÂY: Đăng ký history_api vào FastAPI
app.include_router(history_api.router)

@app.get("/")
def root():
    return {"message": "Greenhouse API is running 🚀"}