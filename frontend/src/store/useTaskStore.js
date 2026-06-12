import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export const useTaskStore = create((set, get) => ({
  tasks: [],          // tasks hiện tại mở trò chuyện
  reminders: [],
  isLoading: false,

  getTasks: async (conversationId) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get(`/conversations/${conversationId}/tasks`);
      set({ tasks: res.data.tasks || [] });
    } catch {
      set({ tasks: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  createTask: async (conversationId, data) => {
    const res = await axiosInstance.post(`/conversations/${conversationId}/tasks`, data);
    set({ tasks: [res.data.task, ...get().tasks] });
    return res.data.task;
  },

  updateStatus: async (taskId, status) => {
    await axiosInstance.patch(`/tasks/${taskId}/status`, { status });
    set({
      tasks: get().tasks.map(t =>
        String(t._id) === String(taskId) ? { ...t, status } : t
      )
    });
  },

  deleteTask: async (taskId) => {
    await axiosInstance.delete(`/tasks/${taskId}`);
    set({ tasks: get().tasks.filter(t => String(t._id) !== String(taskId)) });
  },

  addOrUpdateTaskFromSocket: (task) => {
    const exists = get().tasks.some(t => String(t._id) === String(task._id));
    if (exists) {
      set({ tasks: get().tasks.map(t => String(t._id) === String(task._id) ? task : t) });
    } else {
      set({ tasks: [task, ...get().tasks] });
    }
  },

  deleteTaskFromSocket: (taskId) => {
    set({ tasks: get().tasks.filter(t => String(t._id) !== String(taskId)) });
  },

  addReminder: (payload) => {
    const exists = get().reminders.some(r => String(r.taskId) === String(payload.taskId));
    if (exists) return;

    const id = Date.now();
    set({ reminders: [...get().reminders, { ...payload, id }] });
    setTimeout(() => {
      set({ reminders: get().reminders.filter(r => r.id !== id) });
    }, 8000);
  },

  dismissReminder: (id) => {
    set({ reminders: get().reminders.filter(r => r.id !== id) });
  },
}));
