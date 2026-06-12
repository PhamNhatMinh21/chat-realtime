import Notification from "../models/Notification.js";

// Lấy toàn bộ thông báo của nd hiện tại
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({ notifications });
  } catch (error) {
    console.error("Lỗi lấy thông báo:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Đánh dấu thông báo đã đọc
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notif = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { $set: { read: true } },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }

    return res.status(200).json({ notification: notif });
  } catch (error) {
    console.error("Lỗi đánh dấu đã đọc thông báo:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Đánh dấu toàn bộ thông báo đã đọc
export const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    await Notification.updateMany({ userId, read: false }, { $set: { read: true } });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Lỗi đánh dấu đã đọc tất cả thông báo:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Xóa thông báo
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await Notification.findOneAndDelete({ _id: id, userId });
    if (!result) {
      return res.status(404).json({ message: "Không tìm thấy thông báo để xóa" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Lỗi xóa thông báo:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// Xóa toàn bộ thông báo
export const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    await Notification.deleteMany({ userId });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Lỗi xóa tất cả thông báo:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
