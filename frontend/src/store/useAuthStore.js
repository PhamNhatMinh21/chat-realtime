import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  offlineUsers: {},

  checkAuth: async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        const res = await axiosInstance.post("/auth/refresh");
        localStorage.setItem("accessToken", res.data.accessToken);
      }
      const res = await axiosInstance.get("/users/me");
      set({ authUser: res.data });
    } catch (error) {
      set({ authUser: null });
      localStorage.removeItem("accessToken");
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data, navigate) => {
    set({ isSigningUp: true });
    try {
      await axiosInstance.post("/auth/signup", data);
      navigate("/login");
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Sign up failed" };
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data, navigate) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/signin", data);
      localStorage.setItem("accessToken", res.data.accessToken);
      set({ authUser: res.data.user });
      navigate("/");
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Login failed" };
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/signout");
    } catch (e) { }
    localStorage.removeItem("accessToken");
    set({ authUser: null });
  },

  loginWithToken: async (token, navigate) => {
    localStorage.setItem("accessToken", token);
    await get().checkAuth();
    navigate("/");
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/users/me", data);
      set({ authUser: res.data });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Update failed" };
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  setOfflineUser: (userId, lastActive) => set((state) => ({
    offlineUsers: { ...state.offlineUsers, [userId]: lastActive }
  })),
}));
