# 🌱 Greenhouse

**Greenhouse** là ứng dụng web AI giúp quét hình ảnh thức ăn để tính calo, quản lý chỉ số BMI và tương tác với trợ lý ảo tư vấn dinh dưỡng.

---

## 🚀 Hướng Dẫn Khởi Chạy

Dự án gồm 2 phần: **Backend** (FastAPI) và **Frontend** (Next.js). Cần chạy đồng thời cả 2 phần để ứng dụng hoạt động.

### 1. Backend
Xử lý API, cơ sở dữ liệu (PostgreSQL) và mô hình AI (PyTorch).

```bash
cd backend
python -m venv .venv        # Tạo môi trường ảo (Khuyến nghị)
.\.venv\Scripts\activate    # Kích hoạt môi trường ảo (Trên Windows)
pip install -r requirements.txt
uvicorn main:app --reload   # Server chạy tại http://127.0.0.1:8000
```

> **Lưu ý:** Đảm bảo đã cập nhật cấu hình PostgreSQL trong `backend/database/connection.py`.
> 📚 Xem tài liệu API (Swagger): `http://127.0.0.1:8000/docs`

### 2. Frontend
Giao diện người dùng (React & Tailwind CSS).

```bash
cd frontend
npm install                 # Cài đặt thư viện
npm run dev                 # Ứng dụng chạy tại http://localhost:3000
```

---

## 📁 Cấu Trúc Dự Án

### ⚙️ Backend (`/backend`)
| Thư mục / File | Chức năng |
|---|---|
| `main.py` | Điểm bắt đầu của Server, cấu hình CORS, load Model AI & gộp API Router. |
| `security.py` | Logic bảo mật: băm mật khẩu (bcrypt), cấp và giải mã Token (JWT). |
| `database/` | File `connection.py` khởi tạo kết nối PostgreSQL bằng SQLModel. |
| `models/` | Chứa Database Schema (`db_models.py`), Pydantic Schema (`schemas.py`) và trọng số AI (`food_calorie_model.pth`). |
| `routers/` | Phân chia logic API: Xác thực (`auth.py`), Hồ sơ BMI (`bmi.py`). |

### 🖥️ Frontend (`/frontend`)
| Thư mục / File | Chức năng |
|---|---|
| **`src/app/`** | Chứa giao diện các trang theo Next.js App Router. |
| ├── `login/`, `register/` | Đăng nhập, đăng ký và lấy lại mật khẩu. |
| ├── `dashboard/` | Tổng quan thông số dinh dưỡng hằng ngày. |
| ├── `AIscaner/` | Upload ảnh để AI nhận diện món ăn và tính calo. |
| ├── `bmi/`, `profile/` | Nhập chiều cao cân nặng để tự động tính BMI và chọn mục tiêu. |
| ├── `history/` | Lịch sử các bữa ăn. |
| └── `chat/` | Trợ lý ảo AI tư vấn sức khỏe. |
| **`src/components/`** | Các Component UI dùng chung (`Sidebar`, `Topbar`, `ProfileCard`...). |
| `package.json` | Cấu hình Node.js & danh sách thư viện. |
| `tailwind.config.ts` | Cấu hình CSS hệ thống bằng Tailwind. |
