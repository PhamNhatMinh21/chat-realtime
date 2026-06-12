import FriendRequest from "../models/FriendRequest.js";
import Friend from "../models/Friend.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { io } from "../socket/index.js";
// 1. Gửi lời mời kết bạn
export const sendFriendRequest = async (req, res) => {
    try {
        const from = req.user.id; // Lấy ID từ token người dùng đang đăng nhập
        const { to, message } = req.body; //lay du lieu tu nguoi dung

        //ban than khong the tu minh ket ban
        if (from === to) {
            return res.status(400).json({ message: "Bạn không thể tự kết bạn với chính mình" });
        }

        // kiem tra co ton tai nguoi dung ko
        const userExists = await User.exists({ _id: to });
        if (!userExists) {
            res.status(404).json({ message: "Người dùng không tồn tại" });
        }

        // Kiểm tra xem đã là bạn bè của nhau chưa
        const isFriend = await Friend.findOne({
            $or: [
                { userA: from, userB: to },
                { userA: to, userB: from }
            ]
        });
        if (isFriend) return res.status(400).json({ message: "Hai bạn đã là bạn bè rồi" });

        // Tạo lời mời mới
        const newRequest = await FriendRequest.create({ from, to, message });

        // Lưu thông báo vào db
        const sender = await User.findById(from).select("displayName username avatarUrl").lean();
        const senderName = sender.displayName || sender.username || "Ai đó";
        const notif = await Notification.create({
            userId: to,
            type: "friend_request",
            title: "👤 Lời mời kết bạn",
            body: `${senderName} đã gửi lời mời kết bạn cho bạn`,
            data: { requestId: newRequest._id, from: sender },
        });

        io.to(to.toString()).emit("friend_request_received", {
            id: notif._id.toString(),
            type: "friend_request",
            title: notif.title,
            body: notif.body,
            data: notif.data,
            read: notif.read,
            createdAt: notif.createdAt,
        });

        return res.status(201).json({
            message: "Đã gửi lời mời kết bạn",
            request: newRequest
        });
    } catch (error) {
        console.error("Gặp lỗi khi gửi yêu cầu lời mời kết bạn");
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
// 2. Chấp nhận kết bạn (Đối với sinh viên: Hàm xử lý khi người dùng ấn nút Chấp nhận)
export const acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user.id || req.user._id; // Lấy ID của người dùng đang đăng nhập

        // Tìm lời mời kết bạn trong Database
        const request = await FriendRequest.findById(requestId);

        // Kiểm tra lời mời có tồn tại và thực sự gửi cho người dùng hiện tại không
        if (!request || request.to.toString() !== userId.toString()) {
            return res.status(404).json({ message: "Lời mời không tồn tại hoặc không dành cho bạn" });
        }

        // Tạo mối quan hệ bạn bè mới
        // Chú thích: Model Friend sẽ lưu thông tin kết nối giữa 2 người dùng
        const newFriend = await Friend.create({
            userA: request.from,
            userB: request.to
        });

        // Xóa lời mời kết bạn sau khi đã đồng ý
        await FriendRequest.findByIdAndDelete(requestId);

        // Đồng thời dọn dẹp (xóa) toàn bộ thông báo kết bạn liên quan trong hệ thống để tránh thông báo trùng lặp
        await Notification.deleteMany({ "data.requestId": requestId });

        return res.status(200).json({ message: "Đã chấp nhận kết bạn" });

    } catch (error) {
        console.error("Lỗi khi chấp nhận kết bạn:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

export const declineFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user.id;
        // Tìm và xóa lời mời (Chỉ người nhận mới có quyền xóa/từ chối)
        const request = await FriendRequest.findById(requestId);
        if (!request || request.to.toString() != userId.toString()) return res.status(404).json({ message: "Không tìm thấy lời mời" });

        await FriendRequest.findByIdAndDelete(requestId);
        await Notification.deleteMany({ "data.requestId": requestId });
        return res.status(200).json({ message: "Đã từ chối lời mời kết bạn" });
    } catch (error) {
        console.error("Lỗi khi từ chối kết bạn", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

export const getAllFriends = async (req, res) => {
    try {
        const userId = req.user.id;
        const friendships = await Friend.find({
            $or: [{ userA: userId }, { userB: userId }]
        })
            .populate("userA", "_id displayName avatarUrl") // Lấy thông tin cơ bản của user
            .populate("userB", "_id displayName avatarUrl").lean();

        if (!friendships.length) {
            return res.status(200).json([]);
        }

        // Format lại dữ liệu để trả về danh sách User (loại bỏ chính mình)
        const friendList = friendships.map(f => f.userA._id.toString() === userId.toString() ? f.userB : f.userA);

        return res.status(200).json(friendList);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách bạn bè", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

export const getFriendRequests = async (req, res) => {
    try {
        const userId = req.user._id;

        const populateFields = "_id username displayName avatarUrl";

        const [sent, received] = await Promise.all([
            FriendRequest.find({ from: userId }).populate("to", populateFields),
            FriendRequest.find({ to: userId }).populate("from", populateFields)
        ]);

        res.status(200).json({ sent, received });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách yêu cầu kết bạn", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// Xóa bạn bè
export const removeFriend = async (req, res) => {
    try {
        const userId = req.user._id;
        const { friendId } = req.params;

        const result = await Friend.deleteOne({
            $or: [
                { userA: userId, userB: friendId },
                { userA: friendId, userB: userId }
            ]
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Không tìm thấy quan hệ bạn bè" });
        }

        return res.status(200).json({ message: "Đã xóa bạn bè" });
    } catch (error) {
        console.error("Lỗi xóa bạn bè", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};
