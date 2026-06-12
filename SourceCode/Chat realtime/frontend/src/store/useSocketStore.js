import { create } from "zustand";
import { io } from "socket.io-client";
import { useAuthStore } from "./useAuthStore";
import { useChatStore } from "./useChatStore";
import { useTaskStore } from "./useTaskStore";
import { useNotificationStore } from "./useNotificationStore";

const BASE_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5002";

export const useSocketStore = create((set, get) => ({
  socket: null,

  connectSocket: () => {
    const { authUser } = useAuthStore.getState();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      auth: { userId: authUser._id },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);

      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    });

    const playNotificationSound = () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch (e) { }
    };

    socket.on("new_message", (newMessage) => {
      const authUser = useAuthStore.getState().authUser;
      const selectedConv = useChatStore.getState().selectedConversation;

      const senderId = newMessage.senderId?._id || newMessage.senderId;
      const isFromMe = String(senderId) === String(authUser._id);

      const isCurrentChat = selectedConv &&
        String(selectedConv._id) === String(newMessage.conversationId) &&
        (localStorage.getItem("sidebarMode") || "chats") === "chats";
      const isDocumentHidden = document.hidden;

      if (newMessage.type === "system_task") {
        useChatStore.getState().addRealtimeMessage(newMessage);
        return;
      }

      if (!isFromMe && (!isCurrentChat || isDocumentHidden)) {
        playNotificationSound();

        if ("Notification" in window && Notification.permission === "granted") {
          const title = newMessage.senderId?.displayName || "Tin nhắn mới";
          const body = newMessage.content || "Có tin nhắn hoặc tệp đính kèm mới";
          new Notification(title, { body });
        }

        if (!isCurrentChat) {
          const senderName = newMessage.senderId?.displayName || newMessage.senderId?.username || "Ai đó";
          useNotificationStore.getState().addNotification({
            type: "new_message",
            title: `Tin nhắn từ ${senderName}`,
            body: newMessage.content || "Đã gửi file",
            data: {
              messageId: String(newMessage._id || ""),
              conversationId: String(newMessage.conversationId || ""),
            },
          });
        }
      }

      useChatStore.getState().addRealtimeMessage(newMessage);
    });

    socket.on("message_update", ({ messageId, ...updates }) => {
      useChatStore.getState().updateRealtimeMessage(messageId, updates);
    });

    socket.on("user_typing", ({ userId, isTyping, conversationId }) => {
      const cur = useChatStore.getState().selectedConversation;
      if (cur && cur._id === conversationId) {
        useChatStore.getState().setTyping(conversationId, userId, isTyping);
      }
    });

    socket.on("conversation_seen", ({ conversationId, userId }) => {
      useChatStore.getState().updateConversationSeen(conversationId, userId);
    });

    socket.on("online_users", (users) => {
      useAuthStore.getState().setOnlineUsers(users);
    });

    socket.on("user_offline", ({ userId, lastActive }) => {
      useAuthStore.getState().setOfflineUser(userId, lastActive);
    });

    socket.on("task_new", (task) => {
      useTaskStore.getState().addOrUpdateTaskFromSocket(task);
    });
    socket.on("task_update", (task) => {
      useTaskStore.getState().addOrUpdateTaskFromSocket(task);
      useChatStore.getState().updateMessageTaskStatus(task._id, task.status);
    });
    socket.on("task_delete", ({ taskId }) => {
      useTaskStore.getState().deleteTaskFromSocket(taskId);
    });
    socket.on("task_reminder", (notif) => {
      const taskPayload = notif.data || notif;
      useTaskStore.getState().addReminder(taskPayload);

      useNotificationStore.getState().addNotification(notif);

      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, 0.15, 0.3].forEach((delay, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = notif.urgency === "critical" ? 880 : 660;
          gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.3);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.3);
        });
      } catch (e) { }
    });

    socket.on("friend_request_received", (payload) => {
      useNotificationStore.getState().addNotification(payload);
      playNotificationSound();
    });

    socket.on("conversation_deleted", ({ conversationId }) => {
      const selected = useChatStore.getState().selectedConversation;
      if (selected && String(selected._id) === String(conversationId)) {
        useChatStore.getState().setSelectedConversation(null);
      }
      useChatStore.getState().removeConversationFromState(conversationId);
    });

    set({ socket });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
    set({ socket: null });
  },

  joinConversation: (conversationId) => {
    get().socket?.emit("join_conversation", conversationId);
  },

  leaveConversation: (conversationId) => {
    get().socket?.emit("leave_conversation", conversationId);
  },

  emitTyping: (conversationId, isTyping) => {
    const { authUser } = useAuthStore.getState();
    if (!authUser) return;
    const event = isTyping ? "typing_start" : "typing_stop";
    get().socket?.emit(event, { conversationId, userId: authUser._id });
  },

  emitMarkSeen: (conversationId) => {
    const { authUser } = useAuthStore.getState();
    if (!authUser) return;
    get().socket?.emit("mark_seen", { conversationId, userId: authUser._id });
  },
}));
