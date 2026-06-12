import Task from "../models/Task.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { io, emitNewMessage } from "../socket/index.js";
import { cacheDel } from "../libs/redis.js";

const isMember = (conversation, userId) =>
    conversation.participants.some(p => String(p.userId) === String(userId));

export const createTask = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { title, description, deadline, assigneeIds } = req.body;
        const userId = req.user._id;

        if (!title?.trim()) return res.status(400).json({ message: "Tiêu đề không được để trống" });
        if (!deadline) return res.status(400).json({ message: "Hạn chót là bắt buộc" });

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        if (!isMember(conversation, userId)) return res.status(403).json({ message: "Bạn không phải thành viên" });

        const task = await Task.create({
            conversationId,
            createdBy: userId,
            title: title.trim(),
            description: description?.trim() || "",
            deadline: new Date(deadline),
            assignees: assigneeIds || [],
        });

        const populated = await Task.findById(task._id)
            .populate("createdBy", "displayName avatarUrl")
            .populate("assignees", "displayName avatarUrl username");

        io.to(conversationId).emit("task_new", populated);

        try {
            const creator = await User.findById(userId).select("displayName username");
            const creatorName = creator?.displayName || creator?.username || "Ai đó";
            const deadlineDate = new Date(deadline);
            const deadlineText = deadlineDate.toLocaleString("vi-VN", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit"
            });
            const assigneeNames = populated.assignees?.map(a => a.displayName || a.username).join(", ") || "Tất cả";

            const systemContent = `📋 ${creatorName} đã tạo lịch hẹn: "${populated.title}" · Hạn: ${deadlineText} · Người thực hiện: ${assigneeNames}`;

            const systemMsg = await Message.create({
                conversationId,
                senderId: userId,
                content: systemContent,
                type: "system_task",
                taskId: task._id,
            });

            const populatedSystemMsg = await Message.findById(systemMsg._id)
                .populate({
                    path: "taskId",
                    populate: {
                        path: "assignees",
                        select: "displayName avatarUrl username"
                    }
                });

            const participantIds = conversation.participants.map(p => p.userId || p._id);
            emitNewMessage(conversationId, {
                ...populatedSystemMsg.toObject(),
                senderId: { _id: userId, displayName: creatorName },
            }, participantIds);
        } catch (msgErr) {
            console.error("[Task] Failed to create system message:", msgErr);
        }

        const participantIds = conversation.participants.map(p => p.userId || p._id);
        await cacheDel(`messages:conv:${conversationId}:limit:50`);
        await Promise.all(participantIds.map(uid => cacheDel(`conversations:user:${uid.toString()}`)));

        return res.status(201).json({ task: populated });
    } catch (error) {
        console.error("Lỗi tạo task", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const getTasks = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        if (!isMember(conversation, userId)) return res.status(403).json({ message: "Bạn không phải thành viên" });

        const tasks = await Task.find({ conversationId })
            .sort({ deadline: 1 })
            .populate("createdBy", "displayName avatarUrl")
            .populate("assignees", "displayName avatarUrl username");

        return res.status(200).json({ tasks });
    } catch (error) {
        console.error("Lỗi lấy tasks", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const updateTaskStatus = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;
        const userId = req.user._id;

        if (!["pending", "done"].includes(status)) return res.status(400).json({ message: "Trạng thái không hợp lệ" });

        const task = await Task.findById(taskId).populate("createdBy", "displayName avatarUrl").populate("assignees", "displayName avatarUrl username");
        if (!task) return res.status(404).json({ message: "Không tìm thấy task" });

        const isAssignee = task.assignees.some(a => String(a._id) === String(userId));
        const isCreator = String(task.createdBy._id) === String(userId);
        if (!isAssignee && !isCreator) return res.status(403).json({ message: "Bạn không có quyền cập nhật task này" });

        task.status = status;
        await task.save();

        if (status === "done") {
            await Notification.deleteMany({ "data.taskId": taskId });
        }

        io.to(task.conversationId.toString()).emit("task_update", task);

        await cacheDel(`messages:conv:${task.conversationId.toString()}:limit:50`);

        return res.status(200).json({ task });
    } catch (error) {
        console.error("Lỗi cập nhật task", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// Xóa task
export const deleteTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user._id;

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Không tìm thấy task" });
        if (String(task.createdBy) !== String(userId)) return res.status(403).json({ message: "Chỉ người tạo mới có thể xóa" });

        await Task.findByIdAndDelete(taskId);

        await Notification.deleteMany({ "data.taskId": taskId });

        io.to(task.conversationId.toString()).emit("task_delete", { taskId });

        await cacheDel(`messages:conv:${task.conversationId.toString()}:limit:50`);

        return res.status(200).json({ message: "Đã xóa task" });
    } catch (error) {
        console.error("Lỗi xóa task", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};
