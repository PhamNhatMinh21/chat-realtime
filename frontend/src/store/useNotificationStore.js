import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export const useNotificationStore = create((set, get) => ({
  notifications: [], // { id, loại, tiêu đề, nội dung, dữ liệu, đã đọc, ngày tạo, mức độ ưu tiên }
  unreadCount: 0,
  selectedNotification: null,
  setSelectedNotification: (notif) => set({ selectedNotification: notif }),

  // Lấy toàn bộ thông báo từ db
  getNotifications: async () => {
    try {
      const res = await axiosInstance.get("/notifications");
      const list = res.data.notifications || [];
      const formatted = list.map(n => ({
        id: n._id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        read: n.read,
        urgency: n.urgency || n.data?.urgency,
        createdAt: n.createdAt,
      }));
      set({
        notifications: formatted,
        unreadCount: formatted.filter(n => !n.read).length
      });
    } catch (err) {
      console.error("Lỗi tải danh sách thông báo:", err);
    }
  },

  // Thêm thông báo từ socket (đã được lưu vào DB bởi backend)
  addNotification: (notif) => {
    const existing = get().notifications;

    // Loại bỏ trùng lặp: cùng messageId (cho new_message)
    if (notif.data?.messageId) {
      const dup = existing.find(n => n.data?.messageId === notif.data.messageId);
      if (dup) return;
    }

    // Loại bỏ trùng lặp: cùng task_reminder trong vòng 10 giây
    if (notif.type === "task_reminder" && notif.data?.taskId) {
      const dup = existing.find(n =>
        n.type === "task_reminder" &&
        String(n.data?.taskId) === String(notif.data.taskId) &&
        Date.now() - new Date(n.createdAt).getTime() < 10000
      );
      if (dup) return;
    }

    // Loại bỏ trùng lặp: cùng type + conversationId + body trong vòng 3 giây
    if (notif.type === "new_message" && notif.data?.conversationId) {
      const convId = String(notif.data.conversationId);
      const dup = existing.find(n =>
        n.type === "new_message" &&
        String(n.data?.conversationId) === convId &&
        n.body === notif.body &&
        Date.now() - new Date(n.createdAt).getTime() < 3000
      );
      if (dup) return;
    }

    // Loại bỏ trùng lặp: cùng friend_request requestId
    if (notif.type === "friend_request" && notif.data?.requestId) {
      const dup = existing.find(n =>
        n.type === "friend_request" &&
        String(n.data?.requestId) === String(notif.data.requestId)
      );
      if (dup) return;
    }

    const id = notif.id || `${notif.type}_${Date.now()}_${Math.random()}`;
    const newNotif = {
      id,
      read: notif.read ?? false,
      createdAt: notif.createdAt || new Date().toISOString(),
      urgency: notif.urgency || notif.data?.urgency,
      ...notif,
    };
    const notifications = [newNotif, ...existing].slice(0, 50);
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    });
  },

  markAllRead: async () => {
    try {
      set({
        notifications: get().notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      });
      await axiosInstance.patch("/notifications/mark-read");
    } catch (err) {
      console.error("Lỗi đánh dấu đọc tất cả thông báo:", err);
    }
  },

  markRead: async (id) => {
    try {
      const notif = get().notifications.find(n => n.id === id);
      if (!notif || notif.read) return;

      const notifications = get().notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      set({
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      });

      await axiosInstance.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error("Lỗi đánh dấu đã đọc thông báo:", err);
    }
  },

  clearAll: async () => {
    try {
      set({ notifications: [], unreadCount: 0 });
      await axiosInstance.delete("/notifications");
    } catch (err) {
      console.error("Lỗi xóa tất cả thông báo:", err);
    }
  },

  loadInitialUnread: async () => {
    await get().getNotifications();
  },
}));
