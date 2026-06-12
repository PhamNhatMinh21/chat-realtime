# Sử dụng base image Node.js 20
FROM node:20-slim

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Copy package.json và package-lock.json
COPY package*.json ./

# Cài đặt các thư viện Node.js
RUN npm install

# Copy toàn bộ mã nguồn của frontend vào container
COPY . .

# Expose cổng của Frontend
EXPOSE 5173

# Chạy Vite dev server ở chế độ host để HMR (Hot Module Replacement) có thể truy cập được từ bên ngoài container
CMD ["npm", "run", "dev", "--", "--host"]
