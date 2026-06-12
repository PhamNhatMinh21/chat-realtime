import {Server} from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL, // Đồng nhất với CORS trong server.js
        credentials: true,
    }
})

const userSocketMap = new Map(); // Ánh xạ từ userId sang socketId

const getOnlineUserIds = async () => {
    try {
        const connectedUserIds = Array.from(userSocketMap.keys());
        const hiddenUsers = await User.find({
            _id: { $in: connectedUserIds },
            hideActiveStatus: true
        }).select("_id");
        const hiddenIds = new Set(hiddenUsers.map(u => u._id.toString()));
        return connectedUserIds.filter(id => !hiddenIds.has(id.toString()));
    } catch (err) {
        console.error("Error in getOnlineUserIds:", err);
        return Array.from(userSocketMap.keys());
    }
};

io.on("connection", async (socket) => {
    console.log(`socket connected: ${socket.id}`);

    const userId = socket.handshake.auth.userId;
    if (userId) {
        socket.join(userId.toString()); // Tham gia phòng cá nhân cho các sự kiện chạy ngầm
        userSocketMap.set(userId, socket.id);
        console.log(`User ${userId} connected with socket ${socket.id}`);
        // Phát danh sách người dùng trực tuyến mới nhất cho tất cả
        const onlineUserIds = await getOnlineUserIds();
        io.emit("online_users", onlineUserIds);
    }

    // Tham gia phòng hội thoại
    socket.on("join_conversation", (conversationId) => {
        socket.join(conversationId);
        console.log(`User ${userId} joined conversation ${conversationId}`);
    });
 
    // Rời phòng hội thoại
    socket.on("leave_conversation", (conversationId) => {
        socket.leave(conversationId);
        console.log(`User ${userId} left conversation ${conversationId}`);
    });

    // Xử lý trạng thái đang nhập tin nhắn
    socket.on("typing_start", (data) => {
        const { conversationId, userId } = data;
        // Gửi kèm conversationId để người nhận biết đang chat ở phòng nào
        socket.to(conversationId).emit("user_typing", { userId, isTyping: true, conversationId });
    });
 
    socket.on("typing_stop", (data) => {
        const { conversationId, userId } = data;
        // Gửi kèm conversationId để người nhận biết phòng nào đã dừng nhập
        socket.to(conversationId).emit("user_typing", { userId, isTyping: false, conversationId });
    });

    // Xác nhận đã đọc: phát trạng thái đã xem cho các thành viên khác
    socket.on("mark_seen", ({ conversationId, userId }) => {
        socket.to(conversationId).emit("conversation_seen", { conversationId, userId });
    });
 
    // Bộ xử lý thời gian thực để bật/tắt trạng thái hoạt động
    socket.on("toggle_active_status", async ({ hideActiveStatus }) => {
        try {
            await User.findByIdAndUpdate(userId, { hideActiveStatus });
            const onlineUserIds = await getOnlineUserIds();
            io.emit("online_users", onlineUserIds);
        } catch (err) {
            console.error("Error toggling active status:", err);
        }
    });

    socket.on("disconnect", async () => {
        console.log(`socket disconnected: ${socket.id}`);
        // Xóa khỏi userSocketMap
        let disconnectedUserId = null;
        for (const [uid, socketId] of userSocketMap.entries()) {
            if (socketId === socket.id) {
                disconnectedUserId = uid;
                userSocketMap.delete(uid);
                break;
            }
        }
        
        // Phát danh sách người dùng trực tuyến mới sau khi có ai đó ngắt kết nối
        const onlineUserIds = await getOnlineUserIds();
        io.emit("online_users", onlineUserIds);

        if (disconnectedUserId) {
            try {
                // Cập nhật lastActive khi người dùng ngắt kết nối
                await User.findByIdAndUpdate(disconnectedUserId, { lastActive: new Date() });
                // Phát sự kiện user_offline để frontend cập nhật thời gian
                io.emit("user_offline", { userId: disconnectedUserId, lastActive: new Date() });
            } catch (err) {
                console.error("Error updating lastActive:", err);
            }
        }
    });
});

// Hàm phát tin nhắn mới đến các thành viên trong cuộc hội thoại
export const emitNewMessage = (conversationId, message, participantIds = []) => {
    io.to(conversationId).emit("new_message", message);
    // Phát thêm tới phòng cá nhân của các thành viên để Sidebar cập nhật tức thời
    participantIds.forEach(id => {
        io.to(id.toString()).emit("new_message", message);
    });
};
 
// Hàm phát cập nhật tin nhắn (như trạng thái thu hồi, chỉnh sửa)
export const emitMessageUpdate = (conversationId, messageId, updates) => {
    io.to(conversationId).emit("message_update", { messageId, ...updates });
};

export {io, app, server, userSocketMap};