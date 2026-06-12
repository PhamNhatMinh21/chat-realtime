//server.js
import "dotenv/config";
import express from "express";
import { connectDB } from "./libs/db.js";
import authRoute from "./route/authRoute.js";
import cookieParser from 'cookie-parser';
import userRoute from "./route/userRoute.js";
import { protectedRoute } from "./middlewares/authMiddleware.js";
import friendRoute from './route/friendRoute.js';
import messageRoute from './route/messageRoute.js';
import conversationRoute from "./route/conversationRoute.js"
import cors from 'cors';
import { app, server, io, emitMessageUpdate } from "./socket/index.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { getRedisClient, cacheDel } from "./libs/redis.js";
import { rateLimiter } from "./middlewares/rateLimiter.js";
import taskRoute from './route/taskRoute.js';
import postRoute from "./route/postRoute.js";
import notificationRoute from "./route/notificationRoute.js";
import Message from "./models/Message.js";
import Conversation from "./models/Conversation.js";
import { startTaskReminderJob } from "./services/cronJob.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5002;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Cấu hình Middleware
app.use(express.json()); // đọc được dưới dạng json
app.use(cookieParser());
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true // cho phép gửi và nhận Cookie
}));

app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.join(__dirname, '../uploads')));


app.get('/api/download', (req, res) => {
    const { file, name } = req.query;
    if (!file || file.includes('..') || file.includes('/')) {
        return res.status(400).send('Invalid file parameter');
    }
    const filePath = path.join(__dirname, '../uploads', file);
    const displayName = name || file;
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.download(filePath, displayName, (err) => {
        if (err && !res.headersSent) res.status(404).send('File not found');
    });
});

app.use('/api/auth', rateLimiter({ windowSeconds: 60, maxRequests: 10, keyPrefix: 'rl:auth' }), authRoute);

app.patch('/api/messages/internal/:messageId/toxic', async (req, res) => {
    try {
        const { messageId } = req.params;
        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Tin nhắn không tồn tại" });
        }

        message.isToxic = true;
        await message.save();

        // Cập nhật lastMessage của cuộc trò chuyện nếu tin nhắn này là tin nhắn cuối cùng
        const conversation = await Conversation.findById(message.conversationId);
        if (conversation && conversation.lastMessage && String(conversation.lastMessage._id) === String(messageId)) {
            conversation.lastMessage.isToxic = true;
            await conversation.save();

            // Invalidate cache danh sách cuộc hội thoại của mọi người để đồng bộ Sidebar
            const participantIds = conversation.participants.map(p => p.userId.toString());
            await Promise.all(participantIds.map(uid => cacheDel(`conversations:user:${uid}`)));
        }

        emitMessageUpdate(message.conversationId.toString(), messageId, { isToxic: true });

        await cacheDel(`messages:conv:${message.conversationId.toString()}:limit:50`);

        console.log(`[AI Retrospective Alert] Tin nhắn ${messageId} đã được đánh dấu là toxic và tự động làm mờ!`);
        return res.status(200).json({ success: true, message: "Đã làm mờ tin nhắn nhạy cảm" });
    } catch (error) {
        console.error("Lỗi xử lý làm mờ tin nhắn nhạy cảm từ AI:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
});

// Định nghĩa định tuyến bảo vệ (private routes)
app.use(protectedRoute);
app.use('/api/users', userRoute);
app.use('/api/friends', friendRoute);
app.use('/api/messages', messageRoute);
app.use("/api/conversations", conversationRoute);
app.use('/api/posts', postRoute);
app.use('/api', taskRoute);
app.use('/api/notifications', notificationRoute);


connectDB().then(() => {
    // Khởi động Redis
    getRedisClient();

    server.listen(PORT, () => {
        console.log(`Server bat dau chay tren port ${PORT}`);
    });

    // Khởi động job nhắc nhở deadline
    startTaskReminderJob();
});