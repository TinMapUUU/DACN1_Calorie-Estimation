# retrain.py
import torch
import torch.nn as nn
from torchvision import models, transforms, datasets
from torch.utils.data import DataLoader, random_split
from torch.optim.lr_scheduler import CosineAnnealingLR
import os, time

# ===================== CONFIG =====================
DATASET_PATH = r"D:\Study\School_Project\Dataset\DACN1\Food24K_Split\train"   # ← SỬA LẠI
MODEL_SAVE_PATH = r"D:\Study\School_Project\Vscode\DACN1\backend\models\food_calorie_model_v2.pth"

EPOCHS      = 30
BATCH_SIZE  = 32
LR          = 0.0003
VAL_SPLIT   = 0.2       # 20% data để validate
NUM_CLASSES = 54
DEVICE      = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ===================== AUGMENTATION ← ĐÂY LÀ KEY =====================
train_transform = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.RandomCrop(224),                          # crop ngẫu nhiên
    transforms.RandomHorizontalFlip(p=0.5),              # lật ngang
    transforms.RandomVerticalFlip(p=0.2),                # lật dọc
    transforms.ColorJitter(                              # thay đổi màu sắc
        brightness=0.3, contrast=0.3,
        saturation=0.3, hue=0.1
    ),
    transforms.RandomRotation(degrees=20),               # xoay ngẫu nhiên
    transforms.RandomGrayscale(p=0.05),                  # đôi khi grayscale
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
    transforms.RandomErasing(p=0.2),                     # xóa vùng ngẫu nhiên
])

val_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

# ✅ WRAP MAIN TRAINING LOGIC IN if __name__ == '__main__'
if __name__ == '__main__':
    print(f"🖥️  Dùng: {DEVICE}")
    
    # ===================== DATASET =====================
    full_dataset = datasets.ImageFolder(root=DATASET_PATH)
    print(f"📦 Tổng ảnh: {len(full_dataset)} | Classes: {len(full_dataset.classes)}")

    # Split train/val
    val_size   = int(len(full_dataset) * VAL_SPLIT)
    train_size = len(full_dataset) - val_size
    train_ds, val_ds = random_split(full_dataset, [train_size, val_size])

    # Gán transform riêng cho từng split
    train_ds.dataset.transform = train_transform
    val_ds.dataset.transform   = val_transform

    # ✅ SET num_workers=0 FOR WINDOWS
    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,  num_workers=0, pin_memory=False)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False, num_workers=0, pin_memory=False)
    print(f"🚂 Train: {train_size} ảnh | 🔍 Val: {val_size} ảnh")

    # ===================== MODEL =====================
    # Dùng pretrained=True → bắt đầu từ ImageNet weights, không train từ đầu
    model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)

    # Thêm Dropout trước FC layer để chống overfitting
    model.fc = nn.Sequential(
        nn.Dropout(p=0.4),                          # ← dropout 40%
        nn.Linear(model.fc.in_features, NUM_CLASSES)
    )
    model = model.to(DEVICE)

    # ===================== OPTIMIZER & SCHEDULER =====================
    optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-3)
    scheduler = CosineAnnealingLR(optimizer, T_max=EPOCHS, eta_min=1e-6)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)  # label smoothing chống overfit

    # ===================== TRAINING LOOP =====================
    best_val_acc = 0.0

    for epoch in range(1, EPOCHS + 1):
        # --- TRAIN ---
        model.train()
        train_loss, train_correct = 0.0, 0
        for images, labels in train_loader:
            images, labels = images.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            train_loss    += loss.item() * images.size(0)
            train_correct += (outputs.argmax(1) == labels).sum().item()

        # --- VALIDATE ---
        model.eval()
        val_loss, val_correct = 0.0, 0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(DEVICE), labels.to(DEVICE)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss    += loss.item() * images.size(0)
                val_correct += (outputs.argmax(1) == labels).sum().item()

        train_acc = train_correct / train_size * 100
        val_acc   = val_correct   / val_size   * 100
        scheduler.step()

        print(f"Epoch [{epoch:2d}/{EPOCHS}] "
              f"Train: {train_acc:.1f}% | Val: {val_acc:.1f}% | "
              f"LR: {scheduler.get_last_lr()[0]:.6f}")

        # Lưu model tốt nhất theo val_acc
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            # ⚠️ Lưu chỉ state_dict của fc gốc (bỏ wrapper Dropout)
            torch.save(model.state_dict(), MODEL_SAVE_PATH)
            print(f"  💾 Saved! Best val acc: {best_val_acc:.1f}%")

    print(f"\n✅ Done! Best Val Accuracy: {best_val_acc:.1f}%")
    print(f"📁 Model saved: {MODEL_SAVE_PATH}")