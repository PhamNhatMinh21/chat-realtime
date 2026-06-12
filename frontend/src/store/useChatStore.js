import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export const useChatStore = create((set, get) => ({
  conversations: [],
  selectedConversation: null,
  messages: [],
  messagesCache: {},
  isConversationsLoading: false,
  isMessagesLoading: false,
  typingUsers: {},
  replyingToMessage: null,

  getConversations: async () => {
    set({ isConversationsLoading: true });
    try {
      const res = await axiosInstance.get("/conversations");
      const list = Array.isArray(res.data.conversations) ? res.data.conversations : [];
      set({ conversations: list });
      const selected = get().selectedConversation;
      if (selected) {
        const updated = list.find(c => String(c._id) === String(selected._id));
        if (updated) set({ selectedConversation: updated });
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      set({ conversations: [] });
    } finally {
      set({ isConversationsLoading: false });
    }
  },

  getMessages: async (conversationId) => {
    // Lấy dữ liệu tin nhắn từ bộ nhớ đệm (cache) cục bộ
    const cached = get().messagesCache[conversationId] || [];
    const hasCache = cached.length > 0;

    // Nếu chưa có cache thì mới hiển thị trạng thái đang tải (loading) để tránh giật lag giao diện
    if (!hasCache) {
      set({ isMessagesLoading: true });
    }
    try {
      const res = await axiosInstance.get(`/conversations/${conversationId}/messages`);
      const list = Array.isArray(res.data.messages) ? res.data.messages : [];

      // Hàm so sánh sâu (deep comparison) để kiểm tra danh sách tin nhắn mới và cũ có trùng nhau không
      const areEqual = (a, b) => {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
          if (a[i]._id !== b[i]._id) return false;
          if (a[i].content !== b[i].content) return false;
          if (a[i].isRecalled !== b[i].isRecalled) return false;
          if (a[i].isEdited !== b[i].isEdited) return false;
          if (a[i].reactions?.length !== b[i].reactions?.length) return false;
        }
        return true;
      };

      // Chỉ cập nhật State và Cache nếu dữ liệu thực tế từ Server có sự thay đổi (tránh re-render thừa)
      if (!areEqual(cached, list)) {
        set((state) => ({
          messagesCache: { ...state.messagesCache, [conversationId]: list },
          messages: String(state.selectedConversation?._id) === String(conversationId) ? list : state.messages
        }));
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      if (!hasCache) {
        set({ messages: [] });
      }
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (conversationId, { content, file, recipientId, isGroup, replyTo }) => {
    try {
      let res;
      if (file) {
        const formData = new FormData();
        if (content) formData.append("content", content);
        formData.append("file", file);
        formData.append("conversationId", conversationId);
        if (!isGroup && recipientId) formData.append("recipientId", recipientId);
        if (replyTo) formData.append("replyTo", replyTo);

        const endpoint = isGroup ? "/messages/group/upload" : "/messages/direct/upload";
        res = await axiosInstance.post(endpoint, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        const payload = { content, conversationId };
        if (!isGroup) payload.recipientId = recipientId;
        if (replyTo) payload.replyTo = replyTo;

        const endpoint = isGroup ? "/messages/group" : "/messages/direct";
        res = await axiosInstance.post(endpoint, payload);
      }

      get().getConversations();
      return res.data.message;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  recallMessage: async (messageId) => {
    const { messages, messagesCache, selectedConversation, conversations } = get();
    try {
      await axiosInstance.patch(`/messages/${messageId}/recall`);
      const updated = messages.map(m =>
        m._id === messageId ? { ...m, isRecalled: true, content: "Tin nhắn đã được thu hồi" } : m
      );
      set({ messages: updated });

      if (selectedConversation) {
        const convId = selectedConversation._id;
        const existingCache = messagesCache[convId] || [];
        const updatedCache = existingCache.map(m =>
          m._id === messageId ? { ...m, isRecalled: true, content: "Tin nhắn đã được thu hồi" } : m
        );
        set((state) => ({
          messagesCache: { ...state.messagesCache, [convId]: updatedCache }
        }));
      }

      // Cập nhật danh sách conversations ở Sidebar
      const updatedConversations = conversations.map(c => {
        if (c.lastMessage && String(c.lastMessage._id) === String(messageId)) {
          return {
            ...c,
            lastMessage: {
              ...c.lastMessage,
              isRecalled: true,
              content: "Tin nhắn đã được thu hồi"
            }
          };
        }
        return c;
      });
      set({ conversations: updatedConversations });

      // Đồng bộ selectedConversation nếu nó đang được mở và tin bị thu hồi là tin cuối cùng
      if (selectedConversation && selectedConversation.lastMessage && String(selectedConversation.lastMessage._id) === String(messageId)) {
        set({
          selectedConversation: {
            ...selectedConversation,
            lastMessage: {
              ...selectedConversation.lastMessage,
              isRecalled: true,
              content: "Tin nhắn đã được thu hồi"
            }
          }
        });
      }
      get().getConversations();
    } catch (error) {
      alert(error.response?.data?.message || "Không thể thu hồi tin nhắn");
    }
  },

  editMessage: async (messageId, newContent) => {
    const { messages, messagesCache, selectedConversation, conversations } = get();
    try {
      await axiosInstance.patch(`/messages/${messageId}/edit`, { content: newContent });
      const updated = messages.map(m =>
        m._id === messageId ? { ...m, content: newContent, isEdited: true } : m
      );
      set({ messages: updated });

      if (selectedConversation) {
        const convId = selectedConversation._id;
        const existingCache = messagesCache[convId] || [];
        const updatedCache = existingCache.map(m =>
          m._id === messageId ? { ...m, content: newContent, isEdited: true } : m
        );
        set((state) => ({
          messagesCache: { ...state.messagesCache, [convId]: updatedCache }
        }));
      }

      // Cập nhật danh sách conversations ở Sidebar
      const updatedConversations = conversations.map(c => {
        if (c.lastMessage && String(c.lastMessage._id) === String(messageId)) {
          return {
            ...c,
            lastMessage: {
              ...c.lastMessage,
              content: newContent,
              isEdited: true
            }
          };
        }
        return c;
      });
      set({ conversations: updatedConversations });

      // Đồng bộ selectedConversation nếu nó đang được mở và tin bị sửa là tin cuối cùng
      if (selectedConversation && selectedConversation.lastMessage && String(selectedConversation.lastMessage._id) === String(messageId)) {
        set({
          selectedConversation: {
            ...selectedConversation,
            lastMessage: {
              ...selectedConversation.lastMessage,
              content: newContent,
              isEdited: true
            }
          }
        });
      }
      get().getConversations();
      return { success: true };
    } catch (error) {
      alert(error.response?.data?.message || "Không thể sửa tin nhắn");
      return { success: false };
    }
  },

  addReaction: async (messageId, emoji) => {
    try {
      await axiosInstance.post(`/messages/${messageId}/reaction`, { emoji });
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  },

  setReplyingToMessage: (message) => set({ replyingToMessage: message }),

  setSelectedConversation: (conv) => {
    if (!conv) {
      set({ selectedConversation: null, messages: [], replyingToMessage: null });
      return;
    }
    const cached = get().messagesCache[conv._id] || [];
    set({ selectedConversation: conv, messages: cached, replyingToMessage: null });
  },

  markSeen: async (conversationId) => {
    try {
      await axiosInstance.patch(`/conversations/${conversationId}/seen`);
    } catch { }
  },

  updateConversationSeen: (conversationId, userId) => {
    const { conversations, selectedConversation } = get();
    const addSeen = (conv) => {
      if (String(conv._id) !== String(conversationId)) return conv;
      const already = (conv.seenBy || []).some(u => String(u._id || u) === String(userId));
      if (already) return conv;
      return { ...conv, seenBy: [...(conv.seenBy || []), { _id: userId }] };
    };
    set({
      conversations: conversations.map(addSeen),
      selectedConversation: selectedConversation ? addSeen(selectedConversation) : null,
    });
  },

  addRealtimeMessage: (message) => {
    const { messagesCache, selectedConversation, messages } = get();
    const convId = message.conversationId;

    const existingCache = messagesCache[convId] || [];
    const isDup = existingCache.some(m => String(m._id) === String(message._id));
    let updatedCache = existingCache;
    if (!isDup) {
      updatedCache = [...existingCache, message];
    }

    set((state) => ({
      messagesCache: { ...state.messagesCache, [convId]: updatedCache }
    }));

    if (selectedConversation && String(selectedConversation._id) === String(convId)) {
      if (!isDup) {
        set({ messages: [...messages, message] });
      }
    }

    get().getConversations();
  },

  updateRealtimeMessage: (messageId, updates) => {
    const { messages, messagesCache, selectedConversation, conversations } = get();

    // 1. Cập nhật tin nhắn trong danh sách hiển thị hiện tại
    const updatedMessages = messages.map(m =>
      String(m._id) === String(messageId) ? { ...m, ...updates } : m
    );
    set({ messages: updatedMessages });

    // 2. Cập nhật tin nhắn trong Cache tin nhắn
    if (selectedConversation) {
      const convId = selectedConversation._id;
      const existingCache = messagesCache[convId] || [];
      const updatedCache = existingCache.map(m =>
        String(m._id) === String(messageId) ? { ...m, ...updates } : m
      );
      set((state) => ({
        messagesCache: { ...state.messagesCache, [convId]: updatedCache }
      }));
    }

    // 3. Cập nhật nội dung xem trước tin nhắn cuối cùng (lastMessage) trong danh sách cuộc hội thoại ở Sidebar
    const updatedConversations = conversations.map(c => {
      if (c.lastMessage && String(c.lastMessage._id) === String(messageId)) {
        return {
          ...c,
          lastMessage: {
            ...c.lastMessage,
            ...updates
          }
        };
      }
      return c;
    });
    set({ conversations: updatedConversations });

    // 4. Đồng bộ selectedConversation nếu nó đang mở
    if (selectedConversation && selectedConversation.lastMessage && String(selectedConversation.lastMessage._id) === String(messageId)) {
      set({
        selectedConversation: {
          ...selectedConversation,
          lastMessage: {
            ...selectedConversation.lastMessage,
            ...updates
          }
        }
      });
    }
    get().getConversations();
  },

  updateMessageTaskStatus: (taskId, newStatus) => {
    const { messages, messagesCache, selectedConversation } = get();

    const updateTask = (m) => {
      if (m.taskId && String(m.taskId._id || m.taskId) === String(taskId)) {
        const updatedTask = typeof m.taskId === "object"
          ? { ...m.taskId, status: newStatus }
          : m.taskId;
        return { ...m, taskId: updatedTask };
      }
      return m;
    };

    set({ messages: messages.map(updateTask) });

    if (selectedConversation) {
      const convId = selectedConversation._id;
      const existingCache = messagesCache[convId] || [];
      set((state) => ({
        messagesCache: {
          ...state.messagesCache,
          [convId]: existingCache.map(updateTask)
        }
      }));
    }
  },

  deleteConversation: async (conversationId) => {
    try {
      await axiosInstance.delete(`/conversations/${conversationId}`);
      get().removeConversationFromState(conversationId);
      return { success: true };
    } catch (error) {
      console.error("Error deleting conversation:", error);
      alert(error.response?.data?.message || "Không thể xóa cuộc trò chuyện");
      return { success: false };
    }
  },

  removeConversationFromState: (conversationId) => {
    const { conversations, messagesCache, selectedConversation } = get();
    const updatedCache = { ...messagesCache };
    delete updatedCache[conversationId];

    const isSelected = selectedConversation && String(selectedConversation._id) === String(conversationId);
    set({
      conversations: conversations.filter(c => String(c._id) !== String(conversationId)),
      messagesCache: updatedCache,
      selectedConversation: isSelected ? null : selectedConversation,
      messages: isSelected ? [] : get().messages
    });
  },

  setTyping: (conversationId, userId, isTyping) => {
    const current = get().typingUsers;
    const conv = { ...(current[conversationId] || {}) };
    if (isTyping) conv[userId] = true;
    else delete conv[userId];
    set({ typingUsers: { ...current, [conversationId]: conv } });
  },
}));
