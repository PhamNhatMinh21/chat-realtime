//controller/messageController.js
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { updateConversationAfterCreateMessage } from "../../utils/messageHelper.js";
import { emitNewMessage, emitMessageUpdate } from "../socket/index.js";
import { cacheDel } from "../libs/redis.js";
import { checkMessageContent } from "../../utils/aiModerator.js";

// Helper: xóa cache của conversation và messages liên quan
const invalidateConvCache = async (conversation, senderId) => {
    const convId = conversation._id.toString();
    // Xóa message cache (trang đầu)
    await cacheDel(`messages:conv:${convId}:limit:50`);
    // Xóa conversation list cache của tất cả participants
    const participantIds = conversation.participants.map(p =>
        p.userId?._id?.toString() || p.userId?.toString()
    );
    await Promise.all(participantIds.map(uid => cacheDel(`conversations:user:${uid}`)));
};

const fixFileName = (name) => {
    try {
        return Buffer.from(name, 'latin1').toString('utf8');
    } catch {
        return name;
    }
};

// Helper: Kiểm duyệt tin nhắn chạy ngầm thông qua máy chủ AI
const moderateMessageInBackground = (messageId, conversationId, content, typeLabel) => {
    if (!content || !content.trim()) return;

    setImmediate(() => {
        checkMessageContent(content, messageId.toString())
            .then(async (aiResult) => {
                if (aiResult && aiResult.is_toxic) {
                    try {
                        const msg = await Message.findById(messageId);
                        if (msg) {
                            msg.isToxic = true;
                            await msg.save();

                            const conversation = await Conversation.findById(conversationId);
                            if (conversation && conversation.lastMessage && String(conversation.lastMessage._id) === String(messageId)) {
                                conversation.lastMessage.isToxic = true;
                                await conversation.save();

                                // Invalidate cache danh sách cuộc hội thoại của mọi người để đồng bộ Sidebar
                                const participantIds = conversation.participants.map(p => p.userId.toString());
                                await Promise.all(participantIds.map(uid => cacheDel(`conversations:user:${uid}`)));
                            }

                            emitMessageUpdate(conversationId.toString(), messageId.toString(), { isToxic: true });
                            await cacheDel(`messages:conv:${conversationId.toString()}:limit:50`);
                            console.log(`[AI Background Alert] Tin nhắn ${typeLabel} ${messageId} bị phát hiện toxic ngầm và làm mờ hồi tố!`);
                        }
                    } catch (err) {
                        console.error(`Lỗi cập nhật làm mờ tin nhắn ${typeLabel} toxic ngầm:`, err);
                    }
                }
            })
            .catch((err) => {
                console.error(`Lỗi gọi máy chủ AI kiểm duyệt ${typeLabel} ngầm:`, err.message);
            });
    });
};

export const sendDirectMessage = async (req, res) => {
    try {
        const { recipientId, content, conversationId } = req.body;
        const senderId = req.user._id;
        const file = req.file;

        let conversation;

        if (!content && !file) {
            return res.status(400).json({ message: "Thiếu nội dung hoặc file" })
        }

        if (conversationId) {
            conversation = await Conversation.findById(conversationId);
        }

        if (!conversation) {
            conversation = await Conversation.create({
                type: "direct",
                participants: [
                    { userId: senderId, joinedAt: new Date() },
                    { userId: recipientId, joinedAt: new Date() }
                ],
                lastMessageAt: new Date(),
                unreadCounts: new Map()
            })
        }

        const messageId = new mongoose.Types.ObjectId();
        const messageData = {
            _id: messageId,
            conversationId: conversation._id,
            senderId,
            content: content || '',
            replyTo: req.body.replyTo || null,
            isToxic: false
        };

        if (file) {
            const originalName = fixFileName(file.originalname);
            messageData.fileUrl = `/uploads/${file.filename}`;
            messageData.fileName = originalName;
            messageData.fileType = file.mimetype;
            messageData.fileSize = file.size;
            messageData.content = content || `Đã gửi file: ${originalName}`;
        }

        const message = await Message.create(messageData);

        updateConversationAfterCreateMessage(conversation, message, senderId);
        await conversation.save();

        // Cập nhật lastActive cho người gửi tin nhắn
        await User.findByIdAndUpdate(senderId, { lastActive: new Date() });

        const populatedMessage = await Message.findById(message._id).populate('replyTo', 'content senderId');

        const participantIds = conversation.participants.map(p => p.userId._id ? p.userId._id.toString() : p.userId.toString());
        emitNewMessage(conversation._id.toString(), populatedMessage, participantIds);

        // Invalidate cache sau khi gửi tin nhắn mới
        await invalidateConvCache(conversation, senderId.toString());

        // Kiểm duyệt AI bất đồng bộ ngầm ở tick tiếp theo
        moderateMessageInBackground(messageId, conversation._id, content, "trực tiếp");

        return res.status(201).json({ message: populatedMessage });

    } catch (error) {
        console.error("Lỗi xảy ra khi gửi tin nhắn trực tiếp", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const sendGroupMessage = async (req, res) => {
    try {
        const { conversationId, content } = req.body;
        const senderId = req.user._id;
        const conversation = req.conversation;
        const file = req.file;

        if (!content && !file) {
            return res.status(400).json({ message: "Thiếu nội dung hoặc file" });
        }

        const messageId = new mongoose.Types.ObjectId();
        const messageData = {
            _id: messageId,
            conversationId,
            senderId,
            content: content || '',
            replyTo: req.body.replyTo || null,
            isToxic: false
        };

        if (file) {
            const originalName = fixFileName(file.originalname);
            messageData.fileUrl = `/uploads/${file.filename}`;
            messageData.fileName = originalName;
            messageData.fileType = file.mimetype;
            messageData.fileSize = file.size;
            messageData.content = content || `Đã gửi file: ${originalName}`;
        }

        const message = await Message.create(messageData);

        updateConversationAfterCreateMessage(conversation, message, senderId);
        await conversation.save();

        // Cập nhật lastActive cho người gửi tin nhắn
        await User.findByIdAndUpdate(senderId, { lastActive: new Date() });

        const populatedMessage = await Message.findById(message._id).populate('replyTo', 'content senderId');

        const participantIds = conversation.participants.map(p => p.userId._id ? p.userId._id.toString() : p.userId.toString());
        emitNewMessage(conversationId, populatedMessage, participantIds);

        // Invalidate cache sau khi gửi tin nhắn mới
        await invalidateConvCache(conversation, senderId.toString());

        // Kiểm duyệt AI bất đồng bộ ngầm ở tick tiếp theo
        moderateMessageInBackground(messageId, conversationId, content, "nhóm");

        return res.status(201).json({ message: populatedMessage });
    } catch (error) {
        console.error("Lỗi xảy ra khi gửi tin nhắn nhóm", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const recallMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: "Tin nhắn không tồn tại" });
        if (message.senderId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền thu hồi tin nhắn này" });
        }

        message.isRecalled = true;
        message.content = "Tin nhắn đã được thu hồi";
        await message.save();

        // Cập nhật lastMessage của cuộc trò chuyện nếu tin nhắn này là tin nhắn cuối cùng
        const conversation = await Conversation.findById(message.conversationId);
        if (conversation && conversation.lastMessage && String(conversation.lastMessage._id) === String(messageId)) {
            conversation.lastMessage.content = message.content;
            conversation.lastMessage.isRecalled = true;
            await conversation.save();

            // Invalidate cache danh sách cuộc hội thoại của mọi người để đồng bộ Sidebar
            const participantIds = conversation.participants.map(p => p.userId.toString());
            await Promise.all(participantIds.map(uid => cacheDel(`conversations:user:${uid}`)));
        }

        emitMessageUpdate(message.conversationId.toString(), messageId, { isRecalled: true, content: "Tin nhắn đã được thu hồi" });

        // Invalidate message cache vì nội dung đã thay đổi
        await cacheDel(`messages:conv:${message.conversationId.toString()}:limit:50`);

        return res.status(200).json({ message: "Đã thu hồi tin nhắn" });
    } catch (error) {
        console.error("Lỗi thu hồi tin nhắn", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user._id;

        if (!content || !content.trim()) return res.status(400).json({ message: "Nội dung không được để trống" });

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: "Tin nhắn không tồn tại" });
        if (message.senderId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa tin nhắn này" });
        }
        if (message.isRecalled) return res.status(400).json({ message: "Không thể sửa tin nhắn đã thu hồi" });

        message.content = content.trim();
        message.isEdited = true;
        message.isToxic = false; // Tạm thời coi là bình thường để phản hồi ngay lập tức
        await message.save();

        // Cập nhật lastMessage của cuộc trò chuyện nếu tin nhắn này là tin nhắn cuối cùng
        const conversation = await Conversation.findById(message.conversationId);
        if (conversation && conversation.lastMessage && String(conversation.lastMessage._id) === String(messageId)) {
            conversation.lastMessage.content = message.content;
            conversation.lastMessage.isEdited = true;
            conversation.lastMessage.isToxic = false;
            await conversation.save();

            // Invalidate cache danh sách cuộc hội thoại của mọi người để đồng bộ Sidebar
            const participantIds = conversation.participants.map(p => p.userId.toString());
            await Promise.all(participantIds.map(uid => cacheDel(`conversations:user:${uid}`)));
        }

        emitMessageUpdate(message.conversationId.toString(), messageId, { content: message.content, isEdited: true, isToxic: false });

        // Invalidate message cache vì nội dung đã thay đổi
        await cacheDel(`messages:conv:${message.conversationId.toString()}:limit:50`);

        // Kiểm duyệt AI bất đồng bộ ngầm ở tick tiếp theo
        moderateMessageInBackground(messageId, message.conversationId, content, "sửa đổi");

        return res.status(200).json({ message: "Đã chỉnh sửa tin nhắn", data: message });
    } catch (error) {
        console.error("Lỗi chỉnh sửa tin nhắn", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const addReaction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: "Tin nhắn không tồn tại" });

        message.reactions = message.reactions.filter(r => r.userId.toString() !== userId.toString());
        if (emoji) {
            message.reactions.push({ userId, emoji });
        }
        await message.save();

        const updatedMessage = await Message.findById(messageId);
        emitMessageUpdate(message.conversationId.toString(), messageId, { reactions: updatedMessage.reactions });

        return res.status(200).json({ reactions: updatedMessage.reactions });
    } catch (error) {
        console.error("Lỗi khi thêm reaction", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};