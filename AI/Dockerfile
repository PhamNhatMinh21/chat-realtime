# Sử dụng base image Python 3.10 slim để giảm dung lượng image
FROM python:3.10-slim

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Cài đặt các thư viện hệ thống cần thiết để biên dịch (đặc biệt là cho underthesea)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements.txt vào container
COPY requirements.txt .

# Cài đặt các thư viện trong requirements.txt và các thư viện cần thiết khác
RUN pip install --no-cache-dir -r requirements.txt \
    pandas \
    requests \
    google-generativeai \
    underthesea \
    python-dotenv

# Copy toàn bộ mã nguồn của mô-đun AI vào container
COPY . .

# Expose cổng chạy FastAPI
EXPOSE 8080

# Chạy ứng dụng bằng uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
