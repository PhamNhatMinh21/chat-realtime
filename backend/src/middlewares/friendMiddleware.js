import Conversation from "../models/Conversation.js";
import Friend from "../models/Friend.js";

const pair = (a, b) => (a < b ? [a, b] : [b, a]);

export const checkFriendship = async (req, res, next) => {
    try {
        const me = req.user._id.toString();
        const recipientId = req.body?.recipientId ?? null;

        // TRƯỜNG HỢP 1: Chat đơn (Direct Message)
        if (!recipientId) {
            return res.status(400).json({ message: "Cần cung cấp recipientId" });
        }

        const [userA, userB] = pair(me, recipientId);
        const isFriend = await Friend.findOne({ userA, userB });

        if (!isFriend) {
            return res.status(403).json({ message: "Bạn chưa kết bạn với người này" });
        }

        return next();
    } catch (error) {
        console.error("Lỗi khi kiểm tra bạn bè", error);
        res.status(500).json({ message: "Lỗi hệ thống-friendMiddleware" });
    }
}

export const checkGroupMembership = async (req, res, next) => {
    try {
        const { conversationId } = req.body;
        const userId = req.user._id;
        const conversation = await Conversation.findById(conversationId);

        if (!conversationId) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        }

        const isMember = conversation.participants.some(
            (p) => p.userId.toString() === userId.toString()
        );

        if (!isMember) {
            return res.status(403).json({ message: "Bạn không ở nhóm này" });
        }

        req.conversation = conversation;
        return next();
    } catch (error) {
        console.error("Lỗi checkGroupMembership", error);
        return res.status(500).json({ message: "Lỗi hệ thống-friendMiddleware" });
    }
}