# check_retrain.py
import torch, torch.nn as nn, torch.nn.functional as F
from torchvision import models, transforms
from PIL import Image

MODEL_PATH = r"D:\Study\School_Project\Vscode\DACN1\backend\models\food_calorie_model_v2.pth"

CLASS_NAMES = sorted([
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
])

# Load model v2
m = models.resnet18(weights=None)
m.fc = nn.Sequential(nn.Dropout(p=0.4), nn.Linear(512, len(CLASS_NAMES)))
state_dict = torch.load(MODEL_PATH, map_location="cpu")
m.load_state_dict(state_dict)
m.eval()

transform = transforms.Compose([
    transforms.Resize(256), transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# Kiểm tra output layer có bị bias về 1 class không
print("=== KIỂM TRA BIAS OUTPUT LAYER ===")
fc_weight = list(m.fc.parameters())[0]  # weight của Linear layer
fc_bias   = list(m.fc.parameters())[1]  # bias

print(f"Bias max: {fc_bias.max():.4f} → class: {CLASS_NAMES[fc_bias.argmax()]}")
print(f"Bias min: {fc_bias.min():.4f} → class: {CLASS_NAMES[fc_bias.argmin()]}")
print(f"Bias std: {fc_bias.std():.4f}  (thấp = model chưa học phân biệt được)")

# Test với ảnh random noise — model tốt sẽ không tự tin
import torch
dummy = torch.randn(1, 3, 224, 224)
with torch.no_grad():
    out = m(dummy)
    probs = F.softmax(out, dim=1)[0]
    top3_probs, top3_idx = torch.topk(probs, 3)

print(f"\n=== TEST VỚI ẢNH NHIỄU (random) ===")
print(f"Nếu confidence > 50% → model đang đoán mù, chưa học được gì")
for i in range(3):
    print(f"  [{i+1}] {CLASS_NAMES[top3_idx[i]]:25s} → {top3_probs[i]:.2%}")

# Test với ảnh thật
IMAGE_PATH = r"C:\Users\Admin\Pictures\2.webp"  # ← đổi đường dẫn
try:
    img = Image.open(IMAGE_PATH).convert("RGB")
    tensor = transform(img).unsqueeze(0)
    with torch.no_grad():
        out = m(tensor)
        probs = F.softmax(out, dim=1)[0]
        top5_probs, top5_idx = torch.topk(probs, 5)
    print(f"\n=== TEST VỚI ẢNH THẬT ===")
    for i in range(5):
        print(f"  [{i+1}] {CLASS_NAMES[top5_idx[i]]:25s} → {top5_probs[i]:.2%}")
except:
    print("\n⚠️ Không đọc được ảnh test — bỏ qua")