from fastapi import FastAPI, BackgroundTasks
from dotenv import load_dotenv
from pydantic import BaseModel
import pickle
import os
import subprocess
import requests
import pandas as pd
import google.generativeai as genai
from underthesea import word_tokenize
import json
import logging
import asyncio

# Thiết lập log
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

load_dotenv() 
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

gemini_model = genai.GenerativeModel('gemini-flash-latest')

app = FastAPI(title="Anti-Hang Moderation API", version="5.0")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Biến lưu trữ Model Local
model = None
vectorizer = None
AI_VOCABULARY = None
new_words_count = 0  

def load_ai_models():
    """Hàm nạp hoặc cập nhật Local AI Model vào bộ nhớ RAM"""
    global model, vectorizer, AI_VOCABULARY
    try:
        with open(os.path.join(BASE_DIR, 'model.pkl'), 'rb') as f:
            model = pickle.load(f)
        with open(os.path.join(BASE_DIR, 'vectorizer.pkl'), 'rb') as f:
            vectorizer = pickle.load(f)
        AI_VOCABULARY = set(vectorizer.vocabulary_.keys())
        logging.info("🚀 Đã nạp Model AI Local thành công!")
    except Exception as e:
        logging.error(f" Lỗi nạp model: {e}")

load_ai_models()

BLACKLIST = {
    "đm", "vcl", "clgt", "óc chó", "ngu", "rác rưởi", "đần", "hãm", 
    "sủa", "cút", "chết đi", "bố láo", "mất dạy", "vô học", 
    "súc vật", "điên", "khùng", "đĩ", "điếm", "phế vật", "ngáo", 
    "dở hơi", "đồ khốn", "đồ điên", "đần độn", "ngu ngốc"
}

class MessageInput(BaseModel):
    text: str
    message_id: str = "unknown"

# 2. CÁC HÀM XỬ LÝ NẶNG CHẠY Ở THREAD RIÊNG

def auto_train_ai():
    """
    Huấn luyện lại Local AI Model khi dataset có đủ dữ liệu mới.
    Dùng subprocess.run(["python", "train.py"]) để chạy train.py độc lập,
    tránh block server chính trong khi train (train.py có thể mất vài giây).
    Sau khi train xong, nạp lại model mới vào RAM để dùng ngay.
    """
    global new_words_count
    logging.info("⚙️ Bắt đầu tiến trình huấn luyện lại AI ngầm...")
    try:
        subprocess.run(["python", os.path.join(BASE_DIR, "train.py")], check=True, capture_output=True)
        logging.info("✅ Huấn luyện xong! Đang nạp Model mới vào RAM...")
        load_ai_models()
        new_words_count = 0 
    except Exception as e:
         logging.error(f"❌ Lỗi khi train: {e}")

def call_gemini_sync(prompt):
    """Gọi API Gemini đồng bộ."""
    return gemini_model.generate_content(prompt)

def extract_json_response(raw_text):
    """Trích xuất và parse JSON từ markdown block trả về bởi Gemini."""
    cleaned = raw_text.strip()
    if "```json" in cleaned:
        cleaned = cleaned.split("```json")[1].split("```")[0]
    elif "```" in cleaned:
        cleaned = cleaned.split("```")[1].split("```")[0]
    return json.loads(cleaned.strip())

async def background_gemini_verify(message_text: str, message_id: str):
    """Quét nền tin nhắn bằng Gemini, tự động thử lại tối đa 3 lần nếu gặp lỗi."""
    global new_words_count
    
    prompt = f"""Chỉ xuất JSON. Đánh giá câu: "{message_text}"
    {{
        "is_toxic": boolean, 
        "cau_tich_cuc": "1 câu khen ngắn", 
        "cau_trung_tinh": "1 câu bình thường"
    }}"""
    
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            logging.info(f"[Gemini] Đang quét ngầm (Lần {attempt + 1}): '{message_text}'...")
            
            # Gọi API Gemini đồng bộ trong luồng phụ để tránh block event loop
            response = await asyncio.wait_for(
                asyncio.to_thread(call_gemini_sync, prompt),
                timeout=10.0
            )
            
            ai_decision = extract_json_response(response.text)
            
            # Nếu phát hiện tin nhắn độc hại (toxic)
            if ai_decision.get('is_toxic', False):
                logging.warning(f"[Gemini Alert] Phát hiện tin nhắn toxic (ID: {message_id})")
                
                # Gọi API cập nhật trạng thái làm mờ tin nhắn trên backend
                if message_id and message_id != "unknown":
                    try:
                        backend_url = os.getenv("BACKEND_URL", "http://localhost:5002")
                        res = requests.patch(f"{backend_url}/api/messages/internal/{message_id}/toxic", timeout=5.0)
                        logging.info(f"Đã thông báo tới Backend (Status: {res.status_code}) để ẩn tin nhắn.")
                    except Exception as ex:
                        logging.error(f"Lỗi khi gửi yêu cầu ẩn tin nhắn tới Backend: {ex}")

                # Ghi nhận dữ liệu mới vào tập tin dataset phục vụ huấn luyện lại mô hình cục bộ
                new_data = [
                    {"noi_dung": message_text, "nhan": "tieu_cuc"},
                    {"noi_dung": ai_decision.get('cau_tich_cuc', 'tuyệt vời'), "nhan": "tich_cuc"},
                    {"noi_dung": ai_decision.get('cau_trung_tinh', 'mình hiểu'), "nhan": "trung_tinh"}
                ]
                df_new = pd.DataFrame(new_data)
                df_new.to_csv(os.path.join(BASE_DIR, 'dataset.csv'), mode='a', header=False, index=False, encoding="utf-8-sig")
                logging.info("💾 Lưu 3 mẫu dữ liệu mới vào dataset thành công.")
                
                # Tự động huấn luyện lại mô hình trong luồng phụ nếu gom đủ 3 mẫu tin nhắn toxic mới
                new_words_count += 1
                if new_words_count >= 3:
                    asyncio.create_task(asyncio.to_thread(auto_train_ai))
            else:
                 logging.info(f"[Gemini Safe] Tin nhắn an toàn.")
            
            return # Thoát hàm sau khi xử lý thành công

        except (asyncio.TimeoutError, Exception) as err:
            if attempt < max_retries - 1:
                logging.warning(f"Lỗi khi gọi Gemini (Lần {attempt + 1}): {err}. Đang thử lại sau 2 giây...")
                await asyncio.sleep(2)
            else:
                logging.error(f"[Thông báo] Đã thử {max_retries} lần nhưng vẫn thất bại cho ID: {message_id}")
                
# 3. API KIỂM DUYỆT CHÍNH
@app.post("/check-message")
async def check_message(msg: MessageInput, background_tasks: BackgroundTasks):
    text_lower = msg.text.lower()
    
    # 1. Chặn Blacklist
    for tu in text_lower.split():
        if tu in BLACKLIST:
            return {"is_toxic": True, "source": "Blacklist", "fast_response": True}
            
    for tu_cam in BLACKLIST:
        if " " in tu_cam and tu_cam in text_lower:
            return {"is_toxic": True, "source": "Blacklist", "fast_response": True}

    # 2. Quét Local AI
    cau_clean = word_tokenize(text_lower, format="text")
    danh_sach_tu = cau_clean.split()
    
    so_tu_biet = sum(1 for tu in danh_sach_tu if tu in AI_VOCABULARY)
    ty_le_biet = so_tu_biet / len(danh_sach_tu) if len(danh_sach_tu) > 0 else 1

    vector = vectorizer.transform([cau_clean])
    probs = model.predict_proba(vector)[0]
    predicted_index = model.predict(vector)[0]
    
    confidence = float(probs[predicted_index])
    labels_map = {0: "Tích cực", 1: "Tiêu cực", 2: "Trung tính"}
    
    is_toxic_local = True if (labels_map[predicted_index] == "Tiêu cực" and confidence > 0.6) else False
    
    # 3. Kích hoạt Gemini ngầm
    need_deep_scan = False
    if ty_le_biet < 0.6 or (labels_map[predicted_index] == "Tiêu cực" and confidence < 0.85):
        need_deep_scan = True
        background_tasks.add_task(background_gemini_verify, msg.text, msg.message_id)

    return {
        "is_toxic": is_toxic_local, 
        "source": "Local AI",
        "fast_response": True,
        "deep_scan_triggered": need_deep_scan,
        "confidence": round(confidence * 100, 2)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080)