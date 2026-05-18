# fastapi core
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

# module nội bộ
from database.connection import create_db_and_tables
from routers import auth, bmi, scanner, history_api, chat

# Cấu hình thư mục upload
UPLOAD_DIR = "uploads"

# Tạo thư mục upload ngay khi module load (trước khi mount)
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Khởi tạo DB khi chạy
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    print("✅ Database ready!")
    print(f"📁 Upload directory ready: {UPLOAD_DIR}")
    yield
    # Shutdown
    print("👋 Shutting down...")

app = FastAPI(title="Greenhouse API", lifespan=lifespan)

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Cho phép frontend Next.js gọi API
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount thư mục static để frontend có thể truy cập ảnh
# Ví dụ: http://127.0.0.1:8000/uploads/ten-anh.jpg
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Đăng ký các router
app.include_router(auth.router)
app.include_router(bmi.router, prefix="/api/v1", tags=["Profile & BMI"])
app.include_router(scanner.router, prefix="/api/v1", tags=["AI Scanner"])
app.include_router(history_api.router)
app.include_router(chat.router)

@app.get("/")
def root():
    return {"message": "Greenhouse API is running 🚀"}

