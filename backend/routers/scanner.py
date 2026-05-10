from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session
from pydantic import BaseModel
from datetime import datetime
import io
import os
import logging

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms
from PIL import Image

from database.connection import get_session
from models.db_models import User, MealLog, MealType
from security import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# ===================== CLASS NAMES =====================
CLASS_NAMES = [
    "Bánh bèo", "Bánh bột lọc", "Bánh căn", "Bánh canh", "Bánh chưng",
    "Bánh cuốn", "Bánh đúc", "Bánh giò", "Bánh khọt", "Bánh mì",
    "Bánh pía", "Bánh tét", "Bánh tráng nướng", "Bánh xèo", "Bò kho",
    "Bún bò Huế", "Bún đậu mắm tôm", "Bún mắm", "Bún riêu", "Bún thịt nướng",
    "Cá chiên", "Cá hấp", "Cá kho", "Canh bí đỏ", "Canh chua",
    "Canh cua", "Canh hầm", "Canh khổ qua", "Cao lầu", "Cháo lòng",
    "Cơm tấm", "Ếch nướng", "Ếch xào", "Gỏi cuốn", "Hủ tiếu",
    "Lươn xào", "Mì quảng", "Mực chiên", "Mực hấp", "Mực nướng",
    "Mực xào", "Nem chua", "Phở", "Rau củ luộc", "Rau củ xào",
    "Sườn xào", "Thịt chiên", "Thịt kho", "Thịt roti", "Thịt xá xíu",
    "Tôm chiên", "Tôm luộc", "Tôm nướng", "Xôi xéo"
]

# ===================== VIETNAMESE FOOD DB =====================
# calories/macros tính trên 100g, common_units là gram thực tế của khẩu phần
VIETNAMESE_FOOD_DB = {
    "Bánh bèo": {
        "calo_per_100g": 140, "protein_per_100g": 4.0, "carbs_per_100g": 17.5, "fat_per_100g": 6.0,
        "default_unit": "1 đĩa (5-6 cái)",
        "common_units": {"1 đĩa nhỏ (4 cái)": 150, "1 đĩa (5-6 cái)": 200, "1 đĩa lớn (8 cái)": 280}
    },
    "Bánh bột lọc": {
        "calo_per_100g": 110, "protein_per_100g": 2.8, "carbs_per_100g": 16.5, "fat_per_100g": 3.3,
        "default_unit": "1 phần (6-8 cái)",
        "common_units": {"1 phần nhỏ (4 cái)": 140, "1 phần (6-8 cái)": 180, "1 phần lớn (10 cái)": 240}
    },
    "Bánh căn": {
        "calo_per_100g": 115, "protein_per_100g": 3.1, "carbs_per_100g": 15.4, "fat_per_100g": 3.8,
        "default_unit": "1 phần (8 cái)",
        "common_units": {"1 phần nhỏ (6 cái)": 100, "1 phần (8 cái)": 130, "1 phần lớn (10 cái)": 160}
    },
    "Bánh canh": {
        "calo_per_100g": 95, "protein_per_100g": 3.3, "carbs_per_100g": 12.2, "fat_per_100g": 3.3,
        "default_unit": "1 tô tiêu chuẩn",
        "common_units": {"1 tô nhỏ": 300, "1 tô tiêu chuẩn": 370, "1 tô lớn": 480}
    },
    "Bánh chưng": {
        "calo_per_100g": 175, "protein_per_100g": 5.5, "carbs_per_100g": 20.8, "fat_per_100g": 7.7,
        "default_unit": "1 miếng vừa",
        "common_units": {"1/4 bánh": 130, "1 miếng vừa": 183, "1/2 bánh": 260}
    },
    "Bánh cuốn": {
        "calo_per_100g": 110, "protein_per_100g": 4.9, "carbs_per_100g": 13.4, "fat_per_100g": 3.7,
        "default_unit": "1 phần (3 cuốn)",
        "common_units": {"1 phần nhỏ (2 cuốn)": 110, "1 phần (3 cuốn)": 165, "1 phần lớn (4 cuốn)": 220}
    },
    "Bánh đúc": {
        "calo_per_100g": 118, "protein_per_100g": 3.2, "carbs_per_100g": 17.2, "fat_per_100g": 3.8,
        "default_unit": "1 phần vừa",
        "common_units": {"1 phần nhỏ": 150, "1 phần vừa": 185, "1 phần lớn": 240}
    },
    "Bánh giò": {
        "calo_per_100g": 150, "protein_per_100g": 6.3, "carbs_per_100g": 17.5, "fat_per_100g": 6.3,
        "default_unit": "1 cái bình thường",
        "common_units": {"1 cái nhỏ": 120, "1 cái bình thường": 160, "1 cái lớn": 210}
    },
    "Bánh khọt": {
        "calo_per_100g": 145, "protein_per_100g": 4.7, "carbs_per_100g": 16.6, "fat_per_100g": 6.2,
        "default_unit": "1 đĩa (6-8 cái)",
        "common_units": {"1 đĩa nhỏ (5 cái)": 150, "1 đĩa (6-8 cái)": 195, "1 đĩa lớn (10 cái)": 255}
    },
    "Bánh mì": {
        "calo_per_100g": 255, "protein_per_100g": 14.2, "carbs_per_100g": 28.5, "fat_per_100g": 8.5,
        "default_unit": "1 ổ bình thường",
        "common_units": {"1/2 ổ": 88, "1 ổ bình thường": 175, "1 ổ lớn": 230}
    },
    "Bánh pía": {
        "calo_per_100g": 390, "protein_per_100g": 10.3, "carbs_per_100g": 49.2, "fat_per_100g": 16.4,
        "default_unit": "1 cái",
        "common_units": {"1/2 cái": 49, "1 cái": 97, "2 cái": 194}
    },
    "Bánh tét": {
        "calo_per_100g": 165, "protein_per_100g": 6.0, "carbs_per_100g": 19.7, "fat_per_100g": 6.6,
        "default_unit": "1 khoanh vừa",
        "common_units": {"1 khoanh mỏng": 130, "1 khoanh vừa": 180, "2 khoanh": 360}
    },
    "Bánh tráng nướng": {
        "calo_per_100g": 110, "protein_per_100g": 2.7, "carbs_per_100g": 16.5, "fat_per_100g": 2.7,
        "default_unit": "1 cái bình thường",
        "common_units": {"1 cái nhỏ": 75, "1 cái bình thường": 110, "1 cái lớn": 150}
    },
    "Bánh xèo": {
        "calo_per_100g": 155, "protein_per_100g": 6.7, "carbs_per_100g": 15.6, "fat_per_100g": 8.0,
        "default_unit": "1 cái bình thường",
        "common_units": {"1/2 cái": 115, "1 cái bình thường": 225, "1 cái lớn": 300}
    },
    "Bò kho": {
        "calo_per_100g": 120, "protein_per_100g": 8.0, "carbs_per_100g": 7.1, "fat_per_100g": 6.3,
        "default_unit": "1 tô bình thường",
        "common_units": {"1 tô nhỏ": 280, "1 tô bình thường": 350, "1 tô lớn": 450}
    },
    "Bún bò Huế": {
        "calo_per_100g": 100, "protein_per_100g": 5.6, "carbs_per_100g": 13.0, "fat_per_100g": 3.0,
        "default_unit": "1 tô tiêu chuẩn",
        "common_units": {"1 tô nhỏ": 400, "1 tô tiêu chuẩn": 500, "1 tô đặc biệt": 650}
    },
    "Bún đậu mắm tôm": {
        "calo_per_100g": 130, "protein_per_100g": 6.2, "carbs_per_100g": 15.4, "fat_per_100g": 4.1,
        "default_unit": "1 phần bình thường",
        "common_units": {"1 phần nhỏ": 240, "1 phần bình thường": 290, "1 phần lớn": 380}
    },
    "Bún mắm": {
        "calo_per_100g": 88, "protein_per_100g": 3.3, "carbs_per_100g": 11.6, "fat_per_100g": 2.8,
        "default_unit": "1 tô tiêu chuẩn",
        "common_units": {"1 tô nhỏ": 300, "1 tô tiêu chuẩn": 365, "1 tô lớn": 480}
    },
    "Bún riêu": {
        "calo_per_100g": 95, "protein_per_100g": 3.8, "carbs_per_100g": 12.5, "fat_per_100g": 3.0,
        "default_unit": "1 tô tiêu chuẩn",
        "common_units": {"1 tô nhỏ": 320, "1 tô tiêu chuẩn": 400, "1 tô lớn": 530}
    },
    "Bún thịt nướng": {
        "calo_per_100g": 115, "protein_per_100g": 6.6, "carbs_per_100g": 14.2, "fat_per_100g": 3.8,
        "default_unit": "1 tô bình thường",
        "common_units": {"1 tô nhỏ": 300, "1 tô bình thường": 365, "1 tô lớn": 480}
    },
    "Cá chiên": {
        "calo_per_100g": 190, "protein_per_100g": 14.0, "carbs_per_100g": 9.0, "fat_per_100g": 10.0,
        "default_unit": "1 con vừa",
        "common_units": {"1 miếng nhỏ": 120, "1 con vừa": 200, "1 con lớn": 300}
    },
    "Cá hấp": {
        "calo_per_100g": 130, "protein_per_100g": 14.9, "carbs_per_100g": 3.7, "fat_per_100g": 6.5,
        "default_unit": "1 con vừa",
        "common_units": {"1 miếng": 150, "1 con vừa": 215, "1 con lớn": 330}
    },
    "Cá kho": {
        "calo_per_100g": 160, "protein_per_100g": 15.0, "carbs_per_100g": 6.0, "fat_per_100g": 8.0,
        "default_unit": "1 con vừa",
        "common_units": {"1 miếng": 130, "1 con vừa": 200, "1 con lớn": 280}
    },
    "Canh bí đỏ": {
        "calo_per_100g": 48, "protein_per_100g": 2.4, "carbs_per_100g": 6.0, "fat_per_100g": 1.6,
        "default_unit": "1 tô bình thường",
        "common_units": {"1 chén": 150, "1 tô bình thường": 250, "1 tô lớn": 380}
    },
    "Canh chua": {
        "calo_per_100g": 55, "protein_per_100g": 4.3, "carbs_per_100g": 3.7, "fat_per_100g": 2.5,
        "default_unit": "1 tô bình thường",
        "common_units": {"1 chén": 160, "1 tô bình thường": 330, "1 tô lớn": 450}
    },
    "Canh cua": {
        "calo_per_100g": 50, "protein_per_100g": 5.7, "carbs_per_100g": 2.9, "fat_per_100g": 1.8,
        "default_unit": "1 tô bình thường",
        "common_units": {"1 chén": 150, "1 tô bình thường": 280, "1 tô lớn": 400}
    },
    "Canh hầm": {
        "calo_per_100g": 58, "protein_per_100g": 4.3, "carbs_per_100g": 3.6, "fat_per_100g": 2.9,
        "default_unit": "1 tô bình thường",
        "common_units": {"1 chén": 140, "1 tô bình thường": 280, "1 tô lớn": 400}
    },
    "Canh khổ qua": {
        "calo_per_100g": 42, "protein_per_100g": 1.9, "carbs_per_100g": 5.3, "fat_per_100g": 1.5,
        "default_unit": "1 tô bình thường",
        "common_units": {"1 chén": 160, "1 tô bình thường": 260, "1 tô lớn": 380}
    },
    "Cao lầu": {
        "calo_per_100g": 118, "protein_per_100g": 4.5, "carbs_per_100g": 14.6, "fat_per_100g": 4.5,
        "default_unit": "1 tô tiêu chuẩn",
        "common_units": {"1 tô nhỏ": 280, "1 tô tiêu chuẩn": 355, "1 tô lớn": 460}
    },
    "Cháo lòng": {
        "calo_per_100g": 105, "protein_per_100g": 5.5, "carbs_per_100g": 8.8, "fat_per_100g": 5.0,
        "default_unit": "1 tô tiêu chuẩn",
        "common_units": {"1 tô nhỏ": 300, "1 tô tiêu chuẩn": 360, "1 tô lớn": 480}
    },
    "Cơm tấm": {
        "calo_per_100g": 175, "protein_per_100g": 8.75, "carbs_per_100g": 20.0, "fat_per_100g": 6.25,
        "default_unit": "1 dĩa bình thường",
        "common_units": {"1 dĩa nhỏ": 300, "1 dĩa bình thường": 400, "1 dĩa lớn": 550}
    },
    "Ếch nướng": {
        "calo_per_100g": 145, "protein_per_100g": 16.5, "carbs_per_100g": 4.1, "fat_per_100g": 7.2,
        "default_unit": "1 phần bình thường",
        "common_units": {"1 phần nhỏ": 150, "1 phần bình thường": 195, "1 phần lớn": 260}
    },
    "Ếch xào": {
        "calo_per_100g": 160, "protein_per_100g": 17.5, "carbs_per_100g": 5.0, "fat_per_100g": 8.0,
        "default_unit": "1 phần bình thường",
        "common_units": {"1 phần nhỏ": 150, "1 phần bình thường": 200, "1 phần lớn": 270}
    },
    "Gỏi cuốn": {
        "calo_per_100g": 105, "protein_per_100g": 4.8, "carbs_per_100g": 13.3, "fat_per_100g": 3.8,
        "default_unit": "2 cuốn",
        "common_units": {"1 cuốn": 105, "2 cuốn": 210, "3 cuốn": 315}
    },
    "Hủ tiếu": {
        "calo_per_100g": 95, "protein_per_100g": 3.8, "carbs_per_100g": 13.0, "fat_per_100g": 2.7,
        "default_unit": "1 tô tiêu chuẩn",
        "common_units": {"1 tô nhỏ": 300, "1 tô tiêu chuẩn": 370, "1 tô lớn": 480}
    },
    "Lươn xào": {
        "calo_per_100g": 158, "protein_per_100g": 14.7, "carbs_per_100g": 6.3, "fat_per_100g": 8.4,
        "default_unit": "1 phần bình thường",
        "common_units": {"1 phần nhỏ": 140, "1 phần bình thường": 190, "1 phần lớn": 260}
    },
    "Mì quảng": {
        "calo_per_100g": 110, "protein_per_100g": 4.7, "carbs_per_100g": 13.7, "fat_per_100g": 3.7,
        "default_unit": "1 tô tiêu chuẩn",
        "common_units": {"1 tô nhỏ": 300, "1 tô tiêu chuẩn": 380, "1 tô lớn": 500}
    },
    "Mực chiên": {
        "calo_per_100g": 185, "protein_per_100g": 14.1, "carbs_per_100g": 9.8, "fat_per_100g": 9.8,
        "default_unit": "1 phần bình thường",
        "common_units": {"1 phần nhỏ": 130, "1 phần bình thường": 185, "1 phần lớn": 250}
    },
    "Mực hấp": {
        "calo_per_100g": 142, "protein_per_100g": 14.2, "carbs_per_100g": 6.1, "fat_per_100g": 6.1,
        "default_unit": "1 phần bình thường",
        "common_units": {"1 phần nhỏ": 140, "1 phần bình thường": 197, "1 phần lớn": 270}
    },
    "Mực nướng": {
        "calo_per_100g": 160, "protein_per_100g": 15.0, "carbs_per_100g": 5.0, "fat_per_100g": 8.0,
        "default_unit": "1 phần bình thường",
        "common_units": {"1 phần nhỏ": 140, "1 phần bình thường": 200, "1 phần lớn": 270}
    },
    "Mực xào": {
        "calo_per_100g": 150, "protein_per_100g": 13.0, "carbs_per_100g": 7.0, "fat_per_100g": 7.0,
        "default_unit": "1 phần bình thường",
        "common_units": {"1 phần nhỏ": 140, "1 phần bình thường": 200, "1 phần lớn": 260}
    },
    "Nem chua": {
        "calo_per_100g": 200, "protein_per_100g": 12.9, "carbs_per_100g": 11.4, "fat_per_100g": 11.4,
        "default_unit": "3 cái",
        "common_units": {"2 cái": 100, "3 cái": 140, "5 cái": 235}
    },
    "Phở": {
        "calo_per_100g": 80, "protein_per_100g": 4.0, "carbs_per_100g": 12.0, "fat_per_100g": 2.0,
        "default_unit": "1 tô tiêu chuẩn",
        "common_units": {"1 tô nhỏ": 400, "1 tô tiêu chuẩn": 500, "1 tô đặc biệt": 650}
    },
    "Rau củ luộc": {
        "calo_per_100g": 55, "protein_per_100g": 3.1, "carbs_per_100g": 7.0, "fat_per_100g": 1.6,
        "default_unit": "1 đĩa bình thường",
        "common_units": {"1 đĩa nhỏ": 180, "1 đĩa bình thường": 255, "1 đĩa lớn": 360}
    },
    "Rau củ xào": {
        "calo_per_100g": 75, "protein_per_100g": 4.2, "carbs_per_100g": 8.3, "fat_per_100g": 3.3,
        "default_unit": "1 đĩa bình thường",
        "common_units": {"1 đĩa nhỏ": 170, "1 đĩa bình thường": 240, "1 đĩa lớn": 330}
    },
    "Sườn xào": {
        "calo_per_100g": 195, "protein_per_100g": 14.9, "carbs_per_100g": 7.4, "fat_per_100g": 11.2,
        "default_unit": "1 phần bình thường",
        "common_units": {"1 phần nhỏ": 160, "1 phần bình thường": 215, "1 phần lớn": 300}
    },
    "Thịt chiên": {
        "calo_per_100g": 210, "protein_per_100g": 16.6, "carbs_per_100g": 6.6, "fat_per_100g": 12.2,
        "default_unit": "1 phần bình thường",
        "common_units": {"1 phần nhỏ": 130, "1 phần bình thường": 180, "1 phần lớn": 250}
    },
    "Thịt kho": {
        "calo_per_100g": 200, "protein_per_100g": 14.0, "carbs_per_100g": 9.0, "fat_per_100g": 12.0,
        "default_unit": "1 phần bình thường",
        "common_units": {"1 phần nhỏ": 140, "1 phần bình thường": 200, "1 phần lớn": 280}
    },
    "Thịt roti": {
        "calo_per_100g": 210, "protein_per_100g": 16.0, "carbs_per_100g": 10.0, "fat_per_100g": 11.0,
        "default_unit": "1 phần bình thường",
        "common_units": {"1 phần nhỏ": 140, "1 phần bình thường": 200, "1 phần lớn": 270}
    },
    "Thịt xá xíu": {
        "calo_per_100g": 215, "protein_per_100g": 16.6, "carbs_per_100g": 10.7, "fat_per_100g": 11.7,
        "default_unit": "1 phần bình thường",
        "common_units": {"1 phần nhỏ": 140, "1 phần bình thường": 205, "1 phần lớn": 280}
    },
    "Tôm chiên": {
        "calo_per_100g": 175, "protein_per_100g": 15.3, "carbs_per_100g": 6.5, "fat_per_100g": 8.7,
        "default_unit": "1 phần bình thường",
        "common_units": {"1 phần nhỏ": 130, "1 phần bình thường": 182, "1 phần lớn": 250}
    },
    "Tôm luộc": {
        "calo_per_100g": 130, "protein_per_100g": 15.0, "carbs_per_100g": 4.0, "fat_per_100g": 5.0,
        "default_unit": "1 phần bình thường",
        "common_units": {"1 phần nhỏ": 130, "1 phần bình thường": 200, "1 phần lớn": 280}
    },
    "Tôm nướng": {
        "calo_per_100g": 148, "protein_per_100g": 15.8, "carbs_per_100g": 4.9, "fat_per_100g": 6.9,
        "default_unit": "1 phần bình thường",
        "common_units": {"1 phần nhỏ": 140, "1 phần bình thường": 203, "1 phần lớn": 270}
    },
    "Xôi xéo": {
        "calo_per_100g": 145, "protein_per_100g": 3.3, "carbs_per_100g": 21.5, "fat_per_100g": 4.1,
        "default_unit": "1 gói/chén bình thường",
        "common_units": {"1 chén nhỏ": 180, "1 gói/chén bình thường": 240, "1 gói lớn": 350}
    },
}

def _get_food_data(food_name: str) -> dict:
    """Lấy data từ DB, fallback nếu chưa có."""
    return VIETNAMESE_FOOD_DB.get(food_name, {
        "calo_per_100g": 130,
        "protein_per_100g": 7.0,
        "carbs_per_100g": 18.0,
        "fat_per_100g": 4.0,
        "default_unit": "1 khẩu phần tiêu chuẩn",
        "common_units": {
            "1 khẩu phần nhỏ": 200,
            "1 khẩu phần tiêu chuẩn": 300,
            "1 khẩu phần lớn": 420,
        }
    })

def calculate_nutrition(food_name: str, gram: float) -> dict:
    """Tính nutrition theo gram thực tế."""
    data = _get_food_data(food_name)
    factor = gram / 100.0
    return {
        "gram": gram,
        "calories": round(data["calo_per_100g"] * factor, 1),
        "protein_g": round(data["protein_per_100g"] * factor, 1),
        "carbs_g": round(data["carbs_per_100g"] * factor, 1),
        "fat_g": round(data["fat_per_100g"] * factor, 1),
    }

# ===================== LOAD MODEL =====================
def get_model_path():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(current_dir)
    return os.path.join(backend_dir, "models", "food_calorie_model_v3.pth")

def load_model():
    model_path = get_model_path()
    logger.info(f"🔍 Loading model từ: {model_path}")
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found: {model_path}")
    m = models.resnet18(weights=None)
    m.fc = nn.Sequential(
        nn.Dropout(p=0.4),
        nn.Linear(m.fc.in_features, len(CLASS_NAMES))
    )
    state_dict = torch.load(model_path, map_location=torch.device("cpu"))
    m.load_state_dict(state_dict)
    m.eval()
    logger.info(f"✅ Model v3 loaded! Số lớp: {len(CLASS_NAMES)}")
    return m

model = None
try:
    model = load_model()
except Exception as e:
    logger.error(f"❌ Khởi tạo model thất bại: {str(e)}")

transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def predict_image(image: Image.Image):
    if model is None:
        raise RuntimeError("Model chưa được tải.")
    input_tensor = transform(image).unsqueeze(0)
    with torch.no_grad():
        outputs = model(input_tensor)
        probs = F.softmax(outputs, dim=1)[0]
        top3_probs, top3_indices = torch.topk(probs, 3)
        confidence, idx = torch.max(probs, 0)
    food_name = CLASS_NAMES[idx.item()]
    top3 = [
        {"rank": i + 1, "food": CLASS_NAMES[top3_indices[i].item()], "probability": float(top3_probs[i].item())}
        for i in range(3)
    ]
    return food_name, float(confidence.item()), top3


# ===================== SCHEMA CONFIRM =====================
class ConfirmRequest(BaseModel):
    food_name: str
    portion_unit: str | None = None  # Tên đơn vị (VD: "1 dĩa bình thường")
    custom_gram: float | None = None  # Gram tự nhập (ưu tiên hơn portion_unit)
    meal_type: MealType = MealType.snack


# ===================== API 1: ANALYZE (không lưu DB) =====================
@router.post("/vision/analyze")
async def analyze_food_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Bước 1: Nhận diện món ăn từ ảnh.
    KHÔNG lưu DB — chỉ trả về kết quả + danh sách khẩu phần để user chọn.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File không hợp lệ. Vui lòng upload ảnh!")

    if model is None:
        raise HTTPException(status_code=500, detail="Model AI chưa được tải.")

    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    logger.info(f"📸 Ảnh nhận được: {file.filename} ({image.size})")

    food_name, confidence, top3 = predict_image(image)
    logger.info(f"🎯 Dự đoán: {food_name} ({confidence:.2%})")

    food_data = _get_food_data(food_name)

    # Tính trước nutrition cho từng đơn vị → frontend hiển thị preview
    units_with_preview = {}
    for unit_name, gram in food_data["common_units"].items():
        nutrition = calculate_nutrition(food_name, gram)
        units_with_preview[unit_name] = {
            "gram": gram,
            "calories_preview": nutrition["calories"]
        }

    return {
        "food_name": food_name,
        "confidence_score": round(confidence, 4),
        "top3_predictions": top3,
        "portion_options": {
            "available_units": units_with_preview,
            "default_unit": food_data["default_unit"],
        }
    }


# ===================== API 2: CONFIRM (lưu DB) =====================
@router.post("/vision/confirm")
async def confirm_meal(
    body: ConfirmRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Bước 2: User xác nhận khẩu phần → tính calories động → lưu DB.
    Ưu tiên: custom_gram > portion_unit > default_unit
    """
    food_data = _get_food_data(body.food_name)

    # Xác định gram thực tế
    if body.custom_gram and body.custom_gram > 0:
        gram = body.custom_gram
        method = "custom_gram"
    elif body.portion_unit and body.portion_unit in food_data["common_units"]:
        gram = food_data["common_units"][body.portion_unit]
        method = "unit_selection"
    else:
        # Fallback về default
        default_unit = food_data["default_unit"]
        gram = food_data["common_units"].get(default_unit, 300)
        method = "default"

    nutrition = calculate_nutrition(body.food_name, gram)
    logger.info(f"💾 Lưu: {body.food_name} | {gram}g | {nutrition['calories']} kcal | method={method}")

    new_meal = MealLog(
        user_id=current_user.id,
        food_name=body.food_name,
        calories=nutrition["calories"],
        protein_g=nutrition["protein_g"],
        carbs_g=nutrition["carbs_g"],
        fat_g=nutrition["fat_g"],
        meal_type=body.meal_type,
    )
    session.add(new_meal)
    session.commit()
    session.refresh(new_meal)

    return {
        "message": "Đã lưu bữa ăn thành công!",
        "meal_id": new_meal.id,
        "food_name": new_meal.food_name,
        "gram": gram,
        "calories": new_meal.calories,
        "protein_g": new_meal.protein_g,
        "carbs_g": new_meal.carbs_g,
        "fat_g": new_meal.fat_g,
        "meal_type": new_meal.meal_type,
        "calculation_method": method,
    }
