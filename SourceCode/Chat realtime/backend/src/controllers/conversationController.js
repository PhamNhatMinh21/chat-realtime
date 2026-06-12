import Conversation from "../models/Conversation.js";
import Message from '../models/Message.js';
import Task from "../models/Task.js";
import Notification from "../models/Notification.js";
import { io } from "../socket/index.js";
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from "../libs/redis.js";

const TTL_CONVERSATIONS = 60;     // 60 giây
const TTL_MESSAGES = 120;         // 2 phút

const directConversationPromises = new Map();

export const createConversation = async (req, res) => {
    try {
        const { type, name, memberIds } = req.body;
        const userId = req.user._id;

        if (!type || (type === "group" && !name) || !memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
            return res.status(400).json({ message: "Tên nhóm và danh sách thành viên là bắt buộc" });
        }

        let conversation;

        if (type === 'direct') {
            const participantId = memberIds[0];
            const lockKey = [userId.toString(), participantId.toString()].sort().join('_');

            if (directConversationPromises.has(lockKey)) {
                try {
                    const existingConvId = await directConversationPromises.get(lockKey);
                    conversation = await Conversation.findById(existingConvId);
                } catch (err) {
                    // Bỏ qua lỗi tiến trình trước để thử tạo mới
                }
            }

            if (!conversation) {
                let resolvePromise;
                let rejectPromise;
                const creationPromise = new Promise((resolve, reject) => {
                    resolvePromise = resolve;
                    rejectPromise = reject;
                });
                directConversationPromises.set(lockKey, creationPromise);

                try {
                    conversation = await Conversation.findOne({
                        type: 'direct',
                        "participants.userId": { $all: [userId, participantId] }
                    });
                    if (!conversation) {
                        conversation = new Conversation({
                            type: 'direct',
                            participants: [{ userId }, { userId: participantId }],
                            lastMessageAt: new Date()
                        });
                        await conversation.save();

                        // Invalidate cache cho cả 2 người khi tạo mới chat
                        await cacheDel(`conversations:user:${userId}`);
                        await cacheDel(`conversations:user:${participantId}`);
                    }
                    resolvePromise(conversation._id.toString());
                } catch (err) {
                    rejectPromise(err);
                    throw err;
                } finally {
                    directConversationPromises.delete(lockKey);
                }
            }
        }

        if (type === 'group') {
            conversation = new Conversation({
                type: 'group',
                participants: [
                    { userId },
                    ...memberIds.map((id) => ({ userId: id }))
                ],
                group: { name, createBy: userId },
                lastMessageAt: new Date()
            });
            await conversation.save();

            // Invalidate cache cho tất cả thành viên nhóm
            const participantIds = conversation.participants.map(p => p.userId.toString());
            await Promise.all(participantIds.map(uid => cacheDel(`conversations:user:${uid}`)));
        }

        if (!conversation) {
            return res.status(400).json({ message: 'Định dạng cuộc hội thoại ko hợp lệ' });
        }

        await conversation.populate([
            { path: "participants.userId", select: "displayName avatarUrl username lastActive" },
            { path: "seenBy", select: "displayName avatarUrl" },
            { path: "lastMessage.senderId", select: "displayName avatarUrl" },
        ]);

        return res.status(201).json({ conversation });
    } catch (error) {
        console.error("Lỗi khi tạo cuộc hội thoại", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const getConversations = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const cacheKey = `conversations:user:${userId}`;

        // Thử lấy từ Redis cache trước
        const cached = await cacheGet(cacheKey);
        if (cached) {
            console.log(`[Redis] HIT conversations user=${userId}`);
            return res.status(200).json({ conversations: cached, fromCache: true });
        }

        const conversations = await Conversation.find({ 'participants.userId': userId })
            .sort({ lastMessageAt: -1, updatedAt: -1 })
            .populate({ path: "participants.userId", select: "displayName avatarUrl username lastActive" })
            .populate({ path: "lastMessage.senderId", select: "displayName avatarUrl" })
            .populate({ path: "seenBy", select: "displayName avatarUrl" });

        const seenDirectPairs = new Set();
        const uniqueConversations = [];

        for (const convo of conversations) {
            if (convo.type === 'direct') {
                const partner = convo.participants?.find(p => p.userId && p.userId._id.toString() !== userId);
                const partnerId = partner && partner.userId ? partner.userId._id.toString() : 'unknown';
                const pairKey = [userId, partnerId].sort().join('_');

                if (seenDirectPairs.has(pairKey)) {
                    continue;
                }
                seenDirectPairs.add(pairKey);
            }
            uniqueConversations.push(convo);
        }

        const formatted = uniqueConversations.map((convo) => {
            const participants = (convo.participants || []).map((p) => ({
                _id: p.userId?._id,
                displayName: p.userId?.displayName,
                username: p.userId?.username,
                avatarUrl: p.userId?.avatarUrl ?? null,
                lastActive: p.userId?.lastActive ?? null,
                joinedAt: p.joinedAt,
            }));
            return {
                ...convo.toObject(),
                unreadCounts: convo.unreadCounts || {},
                participants,
            };
        });

        // Lưu vào Redis cache
        await cacheSet(cacheKey, formatted, TTL_CONVERSATIONS);
        console.log(`[Redis] MISS conversations user=${userId} → đã cache`);

        return res.status(200).json({ conversations: formatted });
    } catch (error) {
        console.error("Lỗi xảy ra khi lấy cuộc hội thoại", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 50, cursor } = req.query;

        // Chỉ cache trang đầu (không có cursor) để tránh cache quá nhiều page
        const isFirstPage = !cursor;
        const cacheKey = `messages:conv:${conversationId}:limit:${limit}`;

        if (isFirstPage) {
            const cached = await cacheGet(cacheKey);
            if (cached) {
                console.log(`[Redis] HIT messages conv=${conversationId}`);
                return res.status(200).json({ ...cached, fromCache: true });
            }
        }

        const query = { conversationId };
        if (cursor) query.createdAt = { $lt: new Date(cursor) };

        let messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit) + 1)
            .populate('replyTo', 'content senderId fileType fileName')
            .populate({
                path: 'taskId',
                populate: {
                    path: 'assignees',
                    select: 'displayName avatarUrl username'
                }
            });
        let nextCursor = null;
        if (messages.length > Number(limit)) {
            nextCursor = messages[messages.length - 1].createdAt.toISOString();
            messages.pop();
        }
        messages = messages.reverse();

        // Chỉ cache trang đầu
        if (isFirstPage) {
            await cacheSet(cacheKey, { messages, nextCursor }, TTL_MESSAGES);
            console.log(`[Redis] MISS messages conv=${conversationId} → đã cache`);
        }

        return res.status(200).json({ messages, nextCursor });
    } catch (error) {
        console.error("Lỗi xảy ra khi lấy tin nhắn", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// Đổi tên nhóm
export const updateGroup = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { name } = req.body;
        const userId = req.user._id;

        if (!name || !name.trim()) return res.status(400).json({ message: "Tên không được để trống" });

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });

        const isMember = conversation.participants.some(p => p.userId.toString() === userId.toString());
        if (!isMember) return res.status(403).json({ message: "Bạn không phải thành viên" });

        const updated = await Conversation.findByIdAndUpdate(
            conversationId,
            { $set: { 'group.name': name.trim() } },
            { new: true }
        );

        const participantIds = conversation.participants.map(p => p.userId.toString());
        await Promise.all(participantIds.map(uid => cacheDel(`conversations:user:${uid}`)));

        return res.status(200).json({ message: "Đã cập nhật", conversation: updated });
    } catch (error) {
        console.error("Lỗi đổi tên nhóm", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// Đổi ảnh nhóm
export const uploadGroupAvatar = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;
        const file = req.file;

        if (!file) return res.status(400).json({ message: "Không có file ảnh" });

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ message: "Không tìm thấy nhóm" });

        const isMember = conversation.participants.some(p => p.userId.toString() === userId.toString());
        if (!isMember) return res.status(403).json({ message: "Bạn không phải thành viên" });

        const avatarUrl = `/uploads/${file.filename}`;
        const updated = await Conversation.findByIdAndUpdate(
            conversationId,
            { $set: { 'group.avatarUrl': avatarUrl } },
            { new: true }
        );

        const participantIds = conversation.participants.map(p => p.userId.toString());
        await Promise.all(participantIds.map(uid => cacheDel(`conversations:user:${uid}`)));

        return res.status(200).json({ conversation: updated });
    } catch (error) {
        console.error("Lỗi upload ảnh nhóm", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const markSeen = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        await Conversation.findByIdAndUpdate(conversationId, {
            $addToSet: { seenBy: userId }
        });

        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error("Lỗi mark seen", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// Rời nhóm
export const leaveConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ message: "Không tìm thấy nhóm" });
        if (conversation.type !== 'group') return res.status(400).json({ message: "Chỉ có thể rời nhóm, không phải chat 1-1" });

        // Xóa người dùng này khỏi danh sách thành viên
        await Conversation.findByIdAndUpdate(conversationId, {
            $pull: { participants: { userId } }
        });

        // Invalidate cache của tất cả participants (kể cả người vừa rời)
        const participantIds = conversation.participants.map(p => p.userId.toString());
        await Promise.all(participantIds.map(uid => cacheDel(`conversations:user:${uid}`)));

        return res.status(200).json({ message: "Đã rời nhóm" });
    } catch (error) {
        console.error("Lỗi rời nhóm", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// Xóa trò chuyện
export const deleteConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        }

        // Quyền hạn xóa:
        if (conversation.type === "group") {
            // Chỉ Trưởng nhóm (người tạo ra nhóm) mới có quyền giải tán nhóm/xóa nhóm
            const createBy = conversation.group?.createBy || conversation.createdBy;
            if (String(createBy) !== String(userId)) {
                return res.status(403).json({ message: "Chỉ quản trị viên mới có quyền xóa đoạn chat nhóm này" });
            }
        } else {
            // Đối với chat direct 1-1, kiểm tra người dùng hiện tại có phải là thành viên không
            const isParticipant = conversation.participants.some(p => String(p.userId) === String(userId));
            if (!isParticipant) {
                return res.status(403).json({ message: "Bạn không có quyền xóa cuộc trò chuyện này" });
            }
        }

        // 1. Xóa tất cả Message liên quan
        await Message.deleteMany({ conversationId });

        // 2. Xóa tất cả các Task (lịch hẹn công việc) liên quan
        const tasks = await Task.find({ conversationId }).select("_id");
        const taskIds = tasks.map(t => t._id);

        await Task.deleteMany({ conversationId });

        // 3. Xóa các Notification nhắc nhở deadline của các task này
        if (taskIds.length > 0) {
            await Notification.deleteMany({ "data.taskId": { $in: taskIds } });
        }

        // 4. Xóa chính cuộc hội thoại
        await Conversation.findByIdAndDelete(conversationId);

        // 5. Đồng bộ Socket.io thời gian thực (phát sự kiện giải tán/xóa chat đến room)
        io.to(conversationId).emit("conversation_deleted", { conversationId });

        // 6. Xóa cache Redis
        const participantIds = conversation.participants.map(p => p.userId.toString());
        await Promise.all(participantIds.map(uid => cacheDel(`conversations:user:${uid}`)));
        await cacheDel(`messages:conv:${conversationId}:limit:50`);

        return res.status(200).json({ message: "Đã xóa cuộc trò chuyện thành công" });
    } catch (error) {
        console.error("Lỗi xóa cuộc trò chuyện", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};