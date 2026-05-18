"""
Script để reset database và tạo lại schema mới
Chạy: python reset_db.py
"""
from sqlmodel import create_engine, SQLModel
from models.db_models import User, UserProfile, MealLog
from database.connection import DATABASE_URL

print("🔄 Đang kết nối đến database...")
engine = create_engine(DATABASE_URL, echo=False)

print("❌ Xóa tất cả bảng cũ...")
SQLModel.metadata.drop_all(engine)
print("✓ Đã xóa các bảng cũ")

print("✅ Tạo bảng mới với schema mới...")
SQLModel.metadata.create_all(engine)
print("✓ Đã tạo các bảng mới")

print("\n✨ Reset database thành công!")
print("📝 Các bảng mới có cột: image_url, image_uploaded_at, original_filename")
