# train module.py
import sys
sys.stdout.reconfigure(encoding='utf-8')
import pandas as pd
import os
import pickle
from underthesea import word_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import ComplementNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
df = pd.read_csv(os.path.join(BASE_DIR, 'dataset.csv'))

# 1. TIỀN XỬ LÝ (Tách từ tiếng Việt chuẩn)
def preprocess(text):
    return word_tokenize(str(text).lower(), format="text")

print("1. Đang đọc và tách từ...")
df['noi_dung_clean'] = df['noi_dung'].apply(preprocess)
X = df['noi_dung_clean']
y = df['nhan'].map({'tich_cuc': 0, 'tieu_cuc': 1, 'trung_tinh': 2})

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42, stratify=y)

print("2. Đang Vector hóa...")

# Tham số sublinear_tf=True làm giảm sự thống trị của các từ khóa lặp lại nhiều lần
vectorizer = TfidfVectorizer(ngram_range=(1, 3), max_features=10000, sublinear_tf=True)
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

print("3. Đang huấn luyện mô hình Complement Naive Bayes...")
model = ComplementNB(alpha=0.5)
model.fit(X_train_vec, y_train)

# 4. ĐÁNH GIÁ
y_pred = model.predict(X_test_vec)
print(f"\n ĐỘ CHÍNH XÁC: {accuracy_score(y_test, y_pred) * 100:.2f}%\n")
print(classification_report(y_test, y_pred, target_names=['Tích cực', 'Tiêu cực', 'Trung tính']))

# 5. LƯU
with open(os.path.join(BASE_DIR, 'model.pkl'), 'wb') as f:
    pickle.dump(model, f)
with open(os.path.join(BASE_DIR, 'vectorizer.pkl'), 'wb') as f:
    pickle.dump(vectorizer, f)
print("Hoàn tất! Cập nhật xong AI.")