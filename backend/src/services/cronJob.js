import Task from "../models/Task.js";
import Notification from "../models/Notification.js";
import { io } from "../socket/index.js";

// Khởi chạy job nhắc nhở deadline của Task.
// Chạy mỗi 60 giây để kiểm tra các task sắp đến hạn.
export const startTaskReminderJob = () => {
    setInterval(async () => {
        try {
            const now = new Date();

            // Tìm tất cả task đang pending và chưa quá hạn
            const tasks = await Task.find({
                status: "pending",
                deadline: { $gt: now }
            }).populate("assignees", "_id displayName").populate("createdBy", "_id displayName");

            for (const task of tasks) {
                const totalDuration = task.deadline.getTime() - task.createdAt.getTime();
                const msLeft = task.deadline.getTime() - now.getTime();
                const ratioLeft = msLeft / totalDuration;

                let stageToNotify = null;
                let urgency = "normal";

                // Phân cấp gửi thông báo dựa trên thời gian còn lại (msLeft) và tỷ lệ thời gian (ratioLeft)
                if (!task.notifiedStages.includes("final") && msLeft <= 10 * 60 * 1000) {
                    // Giai đoạn cuối: còn dưới 10 phút
                    stageToNotify = "final";
                    urgency = "critical";
                }
                else if (!task.notifiedStages.includes("midpoint") && ratioLeft <= 0.50 && totalDuration > 20 * 60 * 1000 && msLeft > 10 * 60 * 1000) {
                    // Giai đoạn giữa: trôi qua 50% thời gian, tổng thời lượng > 20 phút và thời gian còn lại > 10 phút
                    stageToNotify = "midpoint";
                    urgency = "high";
                }
                else if (!task.notifiedStages.includes("initial") && totalDuration > 15 * 60 * 1000) {
                    // Giai đoạn đầu: áp dụng cho các task có tổng thời lượng trên 15 phút
                    stageToNotify = "initial";
                    urgency = "medium";
                }

                // Nếu không thuộc giai đoạn thông báo mới nào thì bỏ qua
                if (!stageToNotify) continue;

                const hoursLeft = Math.floor(msLeft / 3600000);
                const minutesLeft = Math.floor((msLeft % 3600000) / 60000);
                const timeText = hoursLeft > 0
                    ? `${hoursLeft} giờ ${minutesLeft} phút`
                    : `${minutesLeft} phút`;

                const payload = {
                    taskId: task._id,
                    conversationId: task.conversationId,
                    title: task.title,
                    deadline: task.deadline,
                    timeLeft: timeText,
                    urgency,
                    minutesLeft: Math.round(msLeft / 60000),
                };

                // Tập hợp danh sách người cần thông báo (chỉ gửi cho những người thực hiện - assignees)
                const recipientIds = new Set();
                task.assignees.forEach(assignee => {
                    if (assignee?._id) recipientIds.add(assignee._id.toString());
                });

                // Lưu notification và emit realtime tới từng người
                for (const userId of recipientIds) {
                    try {
                        const emoji = urgency === "critical" ? "⚠️" : urgency === "high" ? "🔔" : "📋";
                        const title = `${emoji} Lịch hẹn: Nhắc nhở`;
                        const body = `"${task.title}" - Còn ${timeText}`;

                        const notif = await Notification.create({
                            userId,
                            type: "task_reminder",
                            title,
                            body,
                            data: payload,
                        });

                        io.to(userId).emit("task_reminder", {
                            id: notif._id.toString(),
                            type: "task_reminder",
                            title: notif.title,
                            body: notif.body,
                            data: notif.data,
                            urgency: urgency,
                            read: notif.read,
                            createdAt: notif.createdAt,
                        });
                    } catch (notifErr) {
                        console.error("[Task Reminder] Lỗi lưu thông báo:", notifErr);
                    }
                }

                // Đánh dấu giai đoạn đã được nhắc trong DB
                await Task.findByIdAndUpdate(task._id, {
                    $addToSet: { notifiedStages: stageToNotify },
                    notifiedAt: now
                });
                console.log(`[Task Reminder] Đã gửi nhắc "${stageToNotify}" cho task "${task.title}" (còn ${timeText})`);
            }

            // Đánh dấu các task quá hạn
            await Task.updateMany(
                { status: "pending", deadline: { $lt: now } },
                { $set: { status: "overdue" } }
            );
        } catch (err) {
            console.error("[Task Reminder] Lỗi:", err);
        }
    }, 60 * 1000); // mỗi 60 giây

    console.log("[Task Reminder] Đã khởi động job nhắc nhở deadline.");
};
