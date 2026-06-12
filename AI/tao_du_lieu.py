# tao_du_lieu.py
import pandas as pd
import random

# --- 1. NHÓM TIÊU CỰC (Toxic, Chửi thề) ---
tu_chui = ["đm", "vcl", "clgt", "óc chó", "ngu", "rác rưởi", "hãm", "sủa", "cút", "chết đi", "bố láo", "mất dạy", "vô học", "súc vật", "điên", "khùng", "đĩ", "điếm", "ngu dốt", "phế vật"]
tieu_cuc_data = []
for _ in range(600):
    tieu_cuc_data.append(f"{random.choice(tu_chui)} {random.choice(['mày', 'thằng kia', 'con kia', 'loại mày'])}")
    tieu_cuc_data.append(f"đồ {random.choice(tu_chui)}")
    tieu_cuc_data.append(random.choice(tu_chui)) # Nạp riêng từ chửi đơn lẻ

# --- 2. NHÓM TRUNG TÍNH (Bình thường, Nói đểu, Từ vựng kết nối) ---
tu_trung_tinh = ["này", "kia", "gì", "thế", "nào", "đang", "làm", "đi", "ăn", "ngủ", "chơi", "hôm nay", "ngày mai", "alo", "bạn", "mình", "ừ", "vâng", "biết rồi", "cái", "là", "thì", "mà"]
cau_binh_thuong = [
    "đang làm gì đấy", "tối nay đi ăn không", "có ai chơi game không", 
    "web lag thế", "cho mình hỏi chút", "hôm nay trời mưa", 
    "nhắn tin không thấy rep", "bạn thì giỏi rồi", "ừ bạn đúng", 
    "thế cơ à", "tùy bạn thôi", "sao cũng được", "bình thường thôi"
]
trung_tinh_data = []
for _ in range(600):
    trung_tinh_data.append(random.choice(cau_binh_thuong))
    trung_tinh_data.append(f"{random.choice(['alo', 'ê', 'này'])} {random.choice(cau_binh_thuong)}")
    trung_tinh_data.append(random.choice(tu_trung_tinh)) # Dạy AI các từ trung tính đứng một mình

# --- 3. NHÓM TÍCH CỰC (Khen ngợi, Vui vẻ) ---
tu_tich_cuc = ["tuyệt vời", "ngon", "đẹp", "giỏi", "xịn", "tốt", "hay", "xuất sắc", "đỉnh", "thích", "cảm ơn", "ok", "haha", "chất lượng"]
cau_tich_cuc = [
    "sản phẩm này tốt lắm", "áo đẹp nha shop", "dịch vụ rất tuyệt vời",
    "mình rất ưng ý", "bạn làm giỏi quá", "ngon lành cành đào", 
    "hỗ trợ nhiệt tình", "ứng dụng xịn thật", "chức năng này hay",
    "khen cho sự nỗ lực", "bạn code giỏi thật"
]
tich_cuc_data = []
for _ in range(600):
    tich_cuc_data.append(random.choice(cau_tich_cuc))
    tich_cuc_data.append(f"{random.choice(['quá', 'rất', 'cực kỳ'])} {random.choice(tu_tich_cuc)}")
    tich_cuc_data.append(random.choice(tu_tich_cuc)) # Dạy AI các từ khen đứng một mình

# Trộn đều và cắt lấy đúng 1200 dòng cho mỗi nhãn để cân bằng tuyệt đối 1:1:1
tieu_cuc_data = random.sample(tieu_cuc_data, 1200)
trung_tinh_data = random.sample(trung_tinh_data, 1200)
tich_cuc_data = random.sample(tich_cuc_data, 1200)

dataset = [[text, "tieu_cuc"] for text in tieu_cuc_data] + \
          [[text, "trung_tinh"] for text in trung_tinh_data] + \
          [[text, "tich_cuc"] for text in tich_cuc_data]

df = pd.DataFrame(dataset, columns=["noi_dung", "nhan"])
df.drop_duplicates(inplace=True)
df.to_csv("dataset.csv", index=False, encoding="utf-8-sig")
print(f"Đã tạo dataset.csv hoàn hảo với {len(df)} dòng (Đã cân bằng nhãn)!")