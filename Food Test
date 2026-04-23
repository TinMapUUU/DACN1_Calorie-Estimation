#====== Cell 1 ======
import os

# 1. Khai báo thẻ căn cước (Token) Kaggle của bạn cho Colab biết
os.environ['KAGGLE_API_TOKEN'] = "KGAT_90ee173608c5f8ef3061a82248887c82"

# 2. Cài đặt công cụ Kaggle
!pip install -q kaggle

# 3. Ra lệnh hút 6GB dữ liệu ảnh đồ ăn Việt Nam về máy chủ Colab
print("Đang tải dữ liệu 6GB từ Kaggle về... (Vui lòng đợi 1-2 phút)")
!kaggle datasets download -d keno31/trainingdataset

# 4. Giải nén đống file vừa tải vào thư mục tên là "food_data"
print("Đang giải nén dữ liệu...")
!unzip -q trainingdataset.zip -d food_data

# 5. In ra xem trong thư mục vừa giải nén có những gì
print("Hoàn tất! Cấu trúc thư mục dữ liệu của bạn:")
!ls food_data




#======= Cell 2 =======
import os
import torch
from torchvision import datasets, transforms
from torch.utils.data import DataLoader

# 1. Tìm đường dẫn chính xác tới thư mục chứa ảnh
base_dir = 'food_data'
# Dựa vào ảnh bạn gửi lúc trước, Kaggle có thể đã bọc dữ liệu trong thư mục Food24K_Split
if 'Food24K_Split' in os.listdir(base_dir):
    base_dir = os.path.join(base_dir, 'Food24K_Split')

train_dir = os.path.join(base_dir, 'train')
val_dir = os.path.join(base_dir, 'val')

# 2. Tạo "Bộ lọc" để xử lý ảnh
data_transforms = {
    'train': transforms.Compose([
        transforms.Resize((224, 224)), # Ép về size chuẩn 224x224
        transforms.ToTensor(),         # Chuyển thành ma trận số
    ]),
    'val': transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
    ]),
}

print("Đang đọc dữ liệu... (sẽ mất vài giây)")

# 3. Quét toàn bộ thư mục để lấy danh sách món ăn và ảnh
image_datasets = {
    'train': datasets.ImageFolder(train_dir, data_transforms['train']),
    'val': datasets.ImageFolder(val_dir, data_transforms['val'])
}

# 4. Đóng gói thành từng xe tải nhỏ (32 ảnh/chuyến) để chở vào não AI
dataloaders = {
    'train': DataLoader(image_datasets['train'], batch_size=32, shuffle=True),
    'val': DataLoader(image_datasets['val'], batch_size=32, shuffle=False)
}

# 5. In kết quả thu thập được
class_names = image_datasets['train'].classes
print("--------------------------------------------------")
print("🚀 ĐÃ CHUẨN BỊ XONG DỮ LIỆU!")
print(f"Tổng số món ăn AI sẽ được học: {len(class_names)} món.")
print(f"Vài món ví dụ: {class_names[:5]}")
print(f"Số lượng ảnh dùng để làm Sách giáo khoa (Train): {len(image_datasets['train'])} ảnh.")
print(f"Số lượng ảnh dùng để làm Đề thi (Validation): {len(image_datasets['val'])} ảnh.")



# ========== Cell 3: ============
import torch
import torch.nn as nn
from torchvision import models

# 1. Kiểm tra xem đã bật GPU thành công chưa
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
print(f"Đang sử dụng thiết bị: {device}")
if device.type == 'cpu':
    print("⚠️ CẢNH BÁO: BẠN CHƯA BẬT GPU! Hãy quay lại làm theo hướng dẫn bật GPU nhé.")

# 2. Tải bộ não AI "thiên tài" ResNet18 (đã học qua hàng triệu ảnh)
model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)

# 3. Đếm xem Dataset của bạn có bao nhiêu món ăn (ví dụ: 10, 20 hay 101 món)
# (Lấy lại biến class_names từ ô code quét dữ liệu trước đó)
num_classes = len(class_names)

# 4. Thay "cái đuôi" (Lớp cuối cùng - Fully Connected Layer)
# Đuôi cũ của ResNet18 đoán 1000 món. Ta đổi thành đoán đúng số món của mình.
num_ftrs = model.fc.in_features
model.fc = nn.Linear(num_ftrs, num_classes)

# 5. Đưa toàn bộ não AI lên Card đồ họa (GPU) để chạy cho lẹ
model = model.to(device)

print(f"✅ Đã lắp ráp xong Model ResNet18!")
print(f"Sẵn sàng để phân loại {num_classes} món ăn Việt Nam.")



# ======== Cell 4: ============
import torch.optim as optim
import torch.nn as nn
import time

# 1. Định nghĩa "Thước đo sai số" và "Cách rút kinh nghiệm"
criterion = nn.CrossEntropyLoss()
# Dùng bộ tối ưu hóa Adam, học hỏi từ từ với tốc độ (learning rate) 0.001
optimizer = optim.Adam(model.fc.parameters(), lr=0.001)

# Số vòng lặp đi học (Epochs). Chạy thử 5 vòng trước cho nhanh nhé!
num_epochs = 5

print("🔥 BẮT ĐẦU QUÁ TRÌNH HUẤN LUYỆN AI...")
start_time = time.time()

for epoch in range(num_epochs):
    print(f'\nVòng học (Epoch) {epoch + 1}/{num_epochs}')
    print('-' * 20)

    # Mỗi vòng sẽ có 2 pha: Đi học (train) và Thi thử (val)
    for phase in ['train', 'val']:
        if phase == 'train':
            model.train()  # Bật chế độ đi học
        else:
            model.eval()   # Bật chế độ làm bài thi (không học vẹt thêm)

        running_loss = 0.0
        running_corrects = 0

        # Mở từng lô ảnh (32 ảnh/lô) ra để xử lý
        for inputs, labels in dataloaders[phase]:
            inputs = inputs.to(device) # Đưa ảnh lên GPU
            labels = labels.to(device) # Đưa đáp án lên GPU

            optimizer.zero_grad() # Xóa nháp, chuẩn bị tính toán mới

            # Chạy qua mạng nơ-ron
            with torch.set_grad_enabled(phase == 'train'):
                outputs = model(inputs)
                _, preds = torch.max(outputs, 1)
                loss = criterion(outputs, labels) # Tính xem sai số bao nhiêu

                # Nếu đang ở pha đi học thì mới được rút kinh nghiệm (cập nhật trọng số)
                if phase == 'train':
                    loss.backward()
                    optimizer.step()

            # Cộng dồn điểm số
            running_loss += loss.item() * inputs.size(0)
            running_corrects += torch.sum(preds == labels.data)

        # Tính điểm trung bình của cả vòng
        epoch_loss = running_loss / len(image_datasets[phase])
        epoch_acc = running_corrects.double() / len(image_datasets[phase])

        print(f'[{phase.upper()}] Lỗi: {epoch_loss:.4f} | Độ chính xác: {epoch_acc * 100:.2f}%')

time_elapsed = time.time() - start_time
print('\n🎉 HUẤN LUYỆN HOÀN TẤT!')
print(f'Thời gian chạy: {time_elapsed // 60:.0f} phút {time_elapsed % 60:.0f} giây')



# ========= Cell 5: ======== xong cell này sẽ có 1 file tự động tải về -> thay đổi nó trong backend/model
import torch
from google.colab import files

# 1. Lưu toàn bộ "nếp nhăn" (trọng số) của AI vào một file
model_save_path = 'food_calorie_model.pth'
torch.save(model.state_dict(), model_save_path)
print(f"✅ Đã lưu bộ não AI thành file: {model_save_path}")

# 2. Tự động bật hộp thoại tải file này về máy tính của bạn
print("⏳ Đang tải file về máy tính... (Vui lòng đợi một lát vì file nặng khoảng 40-50MB)")
files.download(model_save_path)
