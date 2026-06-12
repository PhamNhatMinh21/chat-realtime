import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export const usePostStore = create((set, get) => ({
  posts: [],
  isLoading: false,

  getFeed: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/posts/feed");
      set({ posts: res.data.data || [] });
    } catch (error) {
      console.error("Lỗi khi tải bảng tin:", error);
      set({ posts: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  createPost: async (formData) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.post("/posts", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      // Thêm bài đăng mới lên đầu danh sách posts
      set({ posts: [res.data.data, ...get().posts] });
      return { success: true };
    } catch (error) {
      console.error("Lỗi khi tạo bài đăng:", error);
      const message = error.response?.data?.message || "Lỗi hệ thống khi tạo bài đăng";
      return { success: false, message };
    } finally {
      set({ isLoading: false });
    }
  },

  reactToPost: async (postId, type) => {
    try {
      const res = await axiosInstance.post(`/posts/${postId}/react`, { type });
      // Cập nhật post tương ứng trong store
      set({
        posts: get().posts.map(p =>
          p._id === postId ? { ...p, reactions: res.data.data } : p
        )
      });
      return { success: true };
    } catch (error) {
      console.error("Lỗi khi thả tương tác:", error);
      return { success: false, message: error.response?.data?.message || "Lỗi tương tác" };
    }
  },

  commentOnPost: async (postId, content) => {
    try {
      const res = await axiosInstance.post(`/posts/${postId}/comment`, { content });
      // Cập nhật comments và bài đăng trong store
      set({
        posts: get().posts.map(p =>
          p._id === postId ? { ...p, comments: res.data.data } : p
        )
      });
      return { success: true };
    } catch (error) {
      console.error("Lỗi khi bình luận bài viết:", error);
      return { success: false, message: error.response?.data?.message || "Lỗi bình luận" };
    }
  },

  deletePost: async (postId) => {
    try {
      await axiosInstance.delete(`/posts/${postId}`);
      // Lọc bỏ bài đăng bị xóa khỏi danh sách posts
      set({ posts: get().posts.filter(p => p._id !== postId) });
      return { success: true };
    } catch (error) {
      console.error("Lỗi khi xóa bài đăng:", error);
      return { success: false, message: error.response?.data?.message || "Lỗi khi xóa bài" };
    }
  },

  deleteComment: async (postId, commentId) => {
    try {
      const res = await axiosInstance.delete(`/posts/${postId}/comments/${commentId}`);
      // Cập nhật post với danh sách comments mới
      set({
        posts: get().posts.map(p =>
          p._id === postId ? { ...p, comments: res.data.data } : p
        )
      });
      return { success: true };
    } catch (error) {
      console.error("Lỗi khi xóa bình luận:", error);
      return { success: false, message: error.response?.data?.message || "Lỗi khi xóa bình luận" };
    }
  }
}));
