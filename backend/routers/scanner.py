from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session
from datetime import datetime
import io

# Thư viện cho AI
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms
from PIL import Image

from database.connection import get_session
from models.db_models import User, MealLog, MealType
from security import get_current_user

router = APIRouter()

# ===================== CẤU HÌNH AI =====================
CLASS_NAMES = [
    "Banh beo", "Banh bot loc", "Banh can", "Banh canh", "Banh chung",
    "Banh cuon", "Banh duc", "Banh gio", "Banh khot", "Banh mi",
    "Banh pia", "Banh tet", "Banh trang nuong", "Banh xeo", "Bo kho",
    "Bun bo Hue", "Bun dau mam tom", "Bun mam", "Bun rieu", "Bun thit nuong",
    "Ca chien", "Ca hap", "Ca kho", "Canh bi do", "Canh chua",
    "Canh cua", "Canh ham", "Canh kho qua", "Cao lau", "Chao long",
    "Com tam", "Ech nuong", "Ech xao", "Goi cuon", "Hu tieu",
    "Luon xao", "Mi quang", "Muc chien", "Muc hap", "Muc nuong",
    "Muc xao", "Nem chua", "Pho", "Rau cu luoc", "Rau cu xao",
    "Suon xao", "Thit chien", "Thit kho", "Thit roti", "Thit xa xiu",
    "Tom chien", "Tom luoc", "Tom nuong", "Xoi xeo"
]

NUTRITION_DB = {
    "Pho": {"calories": 400, "macros": {"protein": "20g", "carbs": "60g", "fat": "10g"}},
    "Banh xeo": {"calories": 350, "macros": {"protein": "15g", "carbs": "35g", "fat": "18g"}},
    "Banh mi": {"calories": 450, "macros": {"protein": "25g", "carbs": "50g", "fat": "15g"}},
    "Com tam": {"calories": 700, "macros": {"protein": "35g", "carbs": "80g", "fat": "25g"}},
    "Bun bo Hue": {"calories": 500, "macros": {"protein": "28g", "carbs": "65g", "fat": "15g"}},
}

def load_model():
    model = models.resnet18(weights=None)
    model.fc = nn.Linear(model.fc.in_features, len(CLASS_NAMES))
    # Load weights từ file pth của bạn
    model.load_state_dict(torch.load("models/food_calorie_model.pth", map_location=torch.device("cpu")))
    model.eval()
    return model

# Khởi tạo model AI
model = load_model()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def predict_image(image: Image.Image):
    input_tensor = transform(image).unsqueeze(0)
    with torch.no_grad():
        outputs = model(input_tensor)
        probs = F.softmax(outputs, dim=1)[0]
        confidence, idx = torch.max(probs, 0)

    food_name = CLASS_NAMES[idx.item()]
    confidence = float(confidence.item())

    # Lấy thông tin calo từ DB, nếu món chưa có trong NUTRITION_DB thì dùng logic tính ước lượng của bạn
    food_info = NUTRITION_DB.get(food_name, {
        "calories": len(food_name) * 45 + 100,
        "macros": {
            "protein": f"{len(food_name)*2}g",
            "carbs": "45g",
            "fat": "12g"
        }
    })
    return food_name, confidence, food_info

# Hàm phụ trợ để bóc tách số từ chuỗi (VD: "15g" -> 15.0)
def extract_macro_value(macro_str: str) -> float:
    try:
        return float(macro_str.lower().replace('g', '').strip())
    except:
        return 0.0

# ===================== API NHẬN DIỆN CHÍNH =====================
@router.post("/vision/analyze")
async def analyze_food_image(
    file: UploadFile = File(...),
    meal_type: MealType = Form(MealType.snack), # Mặc định là bữa phụ
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Kiểm tra file ảnh
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File không hợp lệ. Vui lòng upload ảnh!")

    try:
        # 2. Đọc file ảnh và đưa qua Model AI nhận diện (SỬ DỤNG DỮ LIỆU THẬT)
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Gọi hàm AI
        food_name, confidence, food_info = predict_image(image)

        # Trích xuất số liệu dinh dưỡng
        real_calories = float(food_info["calories"])
        real_protein = extract_macro_value(food_info["macros"]["protein"])
        real_carbs = extract_macro_value(food_info["macros"]["carbs"])
        real_fat = extract_macro_value(food_info["macros"]["fat"])

        # 3. Lưu lịch sử quét vào database (Bảng MealLog)
        new_meal = MealLog(
            user_id=current_user.id,
            food_name=food_name,  # Tên món ăn AI nhận diện được
            calories=real_calories,
            protein_g=real_protein,
            carbs_g=real_carbs,
            fat_g=real_fat,
            meal_type=meal_type
        )
        session.add(new_meal)
        session.commit()
        session.refresh(new_meal)

        # 4. Trả kết quả thật về cho Frontend hiển thị
        return {
            "message": "Phân tích bằng AI thành công!",
            "food_name": new_meal.food_name,
            "confidence_score": confidence,
            "calories": new_meal.calories,
            "protein_g": new_meal.protein_g,
            "carbs_g": new_meal.carbs_g,
            "fat_g": new_meal.fat_g,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xử lý ảnh AI: {str(e)}")