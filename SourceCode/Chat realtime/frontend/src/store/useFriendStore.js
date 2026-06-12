import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export const useFriendStore = create((set, get) => ({
  friends: [],
  friendRequests: { sent: [], received: [] },
  isLoadingFriends: false,
  isLoadingRequests: false,

  getFriends: async () => {
    set({ isLoadingFriends: true });
    try {
      const res = await axiosInstance.get("/friends");
      set({ friends: Array.isArray(res.data) ? res.data : [] });
    } catch (error) {
      console.error("Error fetching friends:", error);
      set({ friends: [] });
    } finally {
      set({ isLoadingFriends: false });
    }
  },

  getFriendRequests: async () => {
    set({ isLoadingRequests: true });
    try {
      const res = await axiosInstance.get("/friends/requests");
      set({ friendRequests: res.data || { sent: [], received: [] } });
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      set({ isLoadingRequests: false });
    }
  },

  sendFriendRequest: async (to) => {
    try {
      await axiosInstance.post("/friends/requests", { to });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Lỗi" };
    }
  },

  acceptFriendRequest: async (requestId) => {
    try {
      await axiosInstance.post(`/friends/requests/${requestId}/accept`);
      await get().getFriendRequests();
      await get().getFriends();
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  declineFriendRequest: async (requestId) => {
    try {
      await axiosInstance.post(`/friends/requests/${requestId}/decline`);
      await get().getFriendRequests();
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },
}));
