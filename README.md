# Hệ thống Chat Realtime tích hợp AI phân loại nội dung độc hại

## 1. Giới thiệu dự án
**ChatSync** là một web nhắn tin theo thời gian thực, hỗ trợ đầy đủ các tính năng kết nối mạng xã hội và quản lý công việc trực quan, đồng thời tích hợp AI phân loại nội dung độc hại (kết hợp mô hình học máy cục bộ và API Google Gemini).

Dự án được xây dựng với mục tiêu mang lại trải nghiệm trò chuyện mượt mà, an toàn và sạch sẽ cho người dùng nhờ vào khả năng phát hiện tin nhắn độc hại theo thời gian thực và tự động làm mờ chúng.

### Các tính năng chính
- **Trò chuyện thời gian thực**: Hỗ trợ trò chuyện cá nhân (1-1) và trò chuyện nhóm sử dụng WebSockets.
- **Tương tác tin nhắn**: Phản hồi tin nhắn, thả cảm xúc, thu hồi tin nhắn, chỉnh sửa tin nhắn, gửi hình ảnh/tệp đính kèm.
- **Hệ thống bạn bè & Thông báo**: Gửi yêu cầu kết bạn, quản lý danh sách bạn bè, thông báo tin nhắn mới, nhắc nhở công việc, v.v.
- **Quản lý công việc**: Tạo và phân công công việc trực tiếp trong nhóm chat, đặt deadline, tự động gửi nhắc nhở công việc sắp đến hạn.
- **Bảng tin tức**: Đăng bài viết cá nhân kèm hình ảnh, thả cảm xúc (like, love, haha...) và bình luận trên bài viết.
- **Kiểm duyệt nội dung tự động bằng AI nhiều tầng**:
  - **Tầng 1 (Blacklist)**: Kiểm tra nhanh từ cấm bằng danh sách từ khóa độc hại sẵn có (phản hồi cực nhanh).
  - **Tầng 2 (Local AI)**: Sử dụng mô hình Machine Learning phân loại văn bản (`scikit-learn` kết hợp tách từ tiếng Việt bằng `underthesea`) để phân tích sắc thái tin nhắn (Tích cực, Tiêu cực, Trung tính) ngay trong RAM.
  - **Tầng 3 (Deep Scan với Google Gemini)**: Khi mô hình cục bộ không chắc chắn (độ tin cậy thấp hoặc xuất hiện nhiều từ mới), tin nhắn sẽ được quét ngầm bởi Google Gemini API. Nếu phát hiện độc hại, AI sẽ yêu cầu Backend làm mờ tin nhắn, lưu dữ liệu huấn luyện mới vào `dataset.csv` và tự động kích hoạt tiến trình huấn luyện lại mô hình cục bộ.

### Công nghệ sử dụng
- **Frontend**: React (Vite), Zustand, React Router DOM, Socket.io-client, Axios, Lucide React, CSS Vanilla.
- **Backend**: Node.js, Express, Socket.io, Mongoose (MongoDB), Redis (caching & sync), JWT & Google OAuth2.
- **AI Service**: Python, FastAPI, Uvicorn, Scikit-learn (mô hình cục bộ), Underthesea (NLP tiếng Việt), Google Gemini AI SDK.
- **Cơ sở dữ liệu**: MongoDB Atlas / MongoDB Local (9 collections chính: `users`, `sessions`, `conversations`, `messages`, `tasks`, `friends`, `friendrequests`, `notifications`, `posts`).
---

## 2. Hướng dẫn cài đặt và chạy chương trình (Sử dụng Docker)

Dự án được cấu hình và đóng gói hoàn toàn trong các Docker container. Chúng ta chỉ cần cài đặt **Docker** để chạy toàn bộ hệ thống mà không cần cài đặt Node.js hay Python thủ công.

### Yêu cầu chuẩn bị trước
- Đã cài đặt [Docker Desktop](https://www.docker.com/products/docker-desktop/).

---

### Bước 1: Tạo và cấu hình các tệp biến môi trường `.env`
Hãy tự tạo thủ công các tệp `.env` trong 3 thư mục tương ứng bằng cách tạo file mới đặt tên là `.env` và dán nội dung cấu hình tương ứng dưới đây:

1. **AI Service (`SourceCode/Chat realtime/AI/.env`)**:
   Tạo tệp `.env` trong thư mục `AI/` với nội dung:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   BACKEND_URL=http://host.docker.internal:5002
   ```

2. **Backend (`SourceCode/Chat realtime/backend/.env`)**:
   Tạo tệp `.env` trong thư mục `backend/` với nội dung (điền thông tin MongoDB và JWT secret):
   ```env
   PORT=5002
   MONGODB_CONNECTIONSTRING=mongodb+srv://<USERNAME>:<PASSWORD>@<CLUSTER_URL>/?appName=Cluster0
   ACCESS_TOKEN_SECRET=your_jwt_access_token_secret_here

   # Cấu hình Redis
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   REDIS_PASSWORD=
   REDIS_DB=0

   # Cấu hình Google OAuth2
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   GOOGLE_CALLBACK_URL=http://localhost:5002/api/auth/google/callback
   FRONTEND_URL=http://localhost:5173
   AI_SERVER_URL=http://host.docker.internal:8080
   ```

3. **Frontend (`SourceCode/Chat realtime/frontend/.env`)**:
   Tạo tệp `.env` trong thư mục `frontend/` với nội dung:
   ```env
   VITE_API_BASE_URL=http://localhost:5002
   VITE_API_URL=http://localhost:5002/api
   VITE_SOCKET_URL=http://localhost:5002
   ```

---

### Bước 2: Khởi chạy từng dịch vụ
Mở terminal và di chuyển vào từng thư mục dự án để khởi chạy bằng Docker Compose:

#### 1. Khởi chạy AI Service (Cổng 8080)
```bash
cd "SourceCode/Chat realtime/AI"
docker compose up -d --build
```
*Sau khi chạy xong lệnh build ở trên, chạy tiếp lệnh sau để khởi chạy dịch vụ:*
```bash
docker compose up
```

#### 2. Khởi chạy Backend & Redis (Cổng 5002 và 6379)
```bash
cd "SourceCode/Chat realtime/backend"
docker compose up -d --build
```
*Sau khi chạy xong lệnh build ở trên, chạy tiếp lệnh sau để khởi chạy dịch vụ:*
```bash
docker compose up
```
*Lệnh này sẽ khởi chạy đồng thời container cơ sở dữ liệu đệm Redis và container Backend Express.*

#### 3. Khởi chạy Frontend (Cổng 5173)
```bash
cd "SourceCode/Chat realtime/frontend"
docker compose up -d --build
```
*Sau khi chạy xong lệnh build ở trên, chạy tiếp lệnh sau để khởi chạy dịch vụ:*
```bash
docker compose up
```

Sau khi cả 3 dịch vụ được khởi chạy thành công:
- Truy cập vào giao diện Web trò chuyện tại địa chỉ: **`http://localhost:5173`**
- API Backend sẽ chạy tại: **`http://localhost:5002`**
- API AI Service sẽ chạy tại: **`http://localhost:8080`**

---

## 3. Cấu trúc thư mục dự án
```text
Chat realtime/
├── Documents/               # Tài liệu thiết kế & phân tích dự án
├── SourceCode/
│   └── Chat realtime/
│       ├── AI/              # Dịch vụ kiểm duyệt AI (FastAPI)
│       ├── backend/         # Máy chủ Backend (Express & Socket.io)
│       ├── frontend/        # Giao diện người dùng (React, Zustand)
│       ├── docker-compose.yml  # Cấu hình khởi chạy Docker chung
└── README.md                # Tài liệu hướng dẫn sử dụng
```

## 4. Chi tiết cấu hình các biến môi trường trong tệp `.env`

### Tệp cấu hình Backend (`/backend/.env`)
- `PORT`: Cổng chạy của Backend (Mặc định `5002`).
- `MONGODB_CONNECTIONSTRING`: Đường dẫn kết nối database MongoDB (Atlas hoặc local).
- `ACCESS_TOKEN_SECRET`: Chuỗi khóa bảo mật tùy ý dùng để tạo mã bảo mật JWT Access Token.
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`: Thông số kết nối tới Redis Server.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: ID và Secret Client từ Google Console để cấu hình đăng nhập nhanh với Google.
- `GOOGLE_CALLBACK_URL`: URL callback sau khi đăng nhập Google thành công (Mặc định `http://localhost:5002/api/auth/google/callback`).
- `FRONTEND_URL`: URL của frontend dùng cho việc CORS và chuyển hướng (Mặc định `http://localhost:5173`).
- `AI_SERVER_URL`: Địa chỉ API của dịch vụ AI (Mặc định `http://localhost:8080` hoặc `http://host.docker.internal:8080`).

### Tệp cấu hình AI Service (`/AI/.env`)
- `GEMINI_API_KEY`: API Key lấy từ Google AI Studio để chạy tính năng deep scan tin nhắn toxic.
- `BACKEND_URL`: Địa chỉ Backend API để thông báo ẩn tin nhắn khi phát hiện toxic (Mặc định `http://host.docker.internal:5002` để kết nối từ container AI sang backend ở máy host).

### Tệp cấu hình Frontend (`/frontend/.env`)
- `VITE_API_BASE_URL`: URL gốc của backend (`http://localhost:5002`).
- `VITE_API_URL`: URL API endpoints (`http://localhost:5002/api`).
- `VITE_SOCKET_URL`: URL máy chủ Socket.io (`http://localhost:5002`).

## 5. Hướng dẫn lấy GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET
Để sử dụng tính năng đăng nhập bằng tài khoản Google (Google OAuth2), bạn cần lấy thông tin xác thực từ Google Cloud Console theo các bước sau:

1. **Truy cập trang:** [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. **Tạo dự án:** Bấm vào mục chọn dự án -> Chọn dự án mới -> Nhập tên dự án và tạo.
3. **Màn hình đồng ý OAuth (OAuth consent screen / Presentation):** Truy cập vào mục này ở thanh bên trái.
4. **Điền thông tin:** Chọn loại người dùng (External) -> Điền thông tin bắt buộc hiển thị của ứng dụng -> Nhấn lưu.
5. **Nhấn vào tạo 1 máy khách OAuth (OAuth client ID):** Đi tới mục **Thông tin xác thực (Credentials)** -> Bấm **Tạo thông tin xác thực** -> Chọn **ID ứng dụng khách OAuth**.
6. **Nhập thông tin:** Chọn loại ứng dụng là **Ứng dụng web** -> Tại mục **URI chuyển hướng được ủy quyền**, thêm địa chỉ callback(Mặc định chạy ở local là `http://localhost:5002/api/auth/google/callback`) -> Nhấn **Tạo**.
7. **Nhận thông tin:** Khi này Google sẽ đưa **GOOGLE CLIENT ID** và **GOOGLE SECRET** hiển thị trên màn hình để cấu hình vào tệp `.env`.

---
> **Về Cơ sở dữ liệu MongoDB:** 
> MongoDB chỉ cần duy nhất key để setup trong file .env. Khi này MongoDB Atlas sẽ tự động tạo cơ sở dữ liệu ngay khi có người dùng đăng ký hoặc tương tác lần đầu. 