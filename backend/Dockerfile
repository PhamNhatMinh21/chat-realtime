# Sử dụng base image Node.js 20
FROM node:20-slim

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Copy các tệp cấu hình package.json và package-lock.json
COPY package*.json ./

# Cài đặt các thư viện Node.js
RUN npm install

# Copy toàn bộ mã nguồn của backend vào container
COPY . .

# Expose cổng của Backend
EXPOSE 5002

# Chạy ứng dụng Node.js
CMD ["node", "src/server.js"]
