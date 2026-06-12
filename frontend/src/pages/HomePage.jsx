import { useState, useEffect } from "react";
import { MessageSquare, Users, Moon, Sun, PenSquare, ChevronLeft, ChevronRight, Bell, Newspaper, Sparkles } from "lucide-react";
import Sidebar from "../components/Sidebar";
import ChatArea from "../components/ChatArea";
import ProfilePanel from "../components/ProfilePanel";
import FriendManagementModal from "../components/FriendManagementModal";
import NewChatModal from "../components/NewChatModal";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";
import TaskReminderToast from "../components/TaskReminderToast";
import { useNotificationStore } from "../store/useNotificationStore";
import NewsFeed from "../components/NewsFeed";

import { BASE_URL } from "../lib/config";

export default function HomePage() {
  const { authUser } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { unreadCount, loadInitialUnread, markAllRead, getNotifications } = useNotificationStore();
  const [showProfile, setShowProfile] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMode, setSidebarMode] = useState(() => {
    return localStorage.getItem("sidebarMode") || "chats";
  });

  useEffect(() => {
    localStorage.setItem("sidebarMode", sidebarMode);
  }, [sidebarMode]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (authUser) loadInitialUnread();
  }, [authUser]);

  useEffect(() => {
    if (sidebarMode === "notifications") {
      getNotifications();
      const t = setTimeout(() => markAllRead(), 1500);
      return () => clearTimeout(t);
    }
  }, [sidebarMode]);

  const initial = (authUser?.displayName || authUser?.username || "U").charAt(0).toUpperCase();

  return (
    <div className="app-root">
      <TaskReminderToast />
      {showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}

      {showFriends && <FriendManagementModal onClose={() => setShowFriends(false)} />}

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}

      <div className="icon-bar">
        <div className="icon-bar-logo" style={{ cursor: "pointer" }} title="ChatSync Logo">
          <Sparkles size={22} color="white" style={{ animation: "spin 12s linear infinite" }} />
        </div>

        <div className="icon-bar-nav">
          <button
            className={`icon-bar-btn ${sidebarMode === "chats" ? "active" : ""}`}
            title="Đoạn chat"
            onClick={() => { setSidebarMode("chats"); setSidebarCollapsed(false); }}
          >
            <MessageSquare size={20} />
          </button>
          <button
            className={`icon-bar-btn ${sidebarMode === "friends" ? "active" : ""}`}
            title="Danh sách bạn bè"
            onClick={() => { setSidebarMode("friends"); setSidebarCollapsed(false); }}
          >
            <Users size={20} />
          </button>

          <button
            className={`icon-bar-btn ${sidebarMode === "notifications" ? "active" : ""}`}
            title="Thông báo"
            onClick={() => {
              setSidebarMode(m => m === "notifications" ? "chats" : "notifications");
              setSidebarCollapsed(false);
            }}
            style={{ position: "relative" }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: 2, right: 2,
                minWidth: 16, height: 16,
                background: "var(--danger)",
                borderRadius: "50%",
                fontSize: 10, fontWeight: 700, color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 3px",
                lineHeight: 1,
                boxShadow: "0 0 0 2px var(--bg-primary)",
              }}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <button
            className={`icon-bar-btn ${sidebarMode === "news" ? "active" : ""}`}
            title="Bản tin tin tức"
            onClick={() => {
              setSidebarMode(m => m === "news" ? "chats" : "news");
              setSidebarCollapsed(false);
            }}
          >
            <Newspaper size={20} />
          </button>

          <button
            className="icon-bar-btn"
            onClick={toggleTheme}
            title={theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className="icon-bar-bottom">
          <div
            className="user-avatar-trigger"
            onClick={() => setShowProfile(true)}
            title="Hồ sơ cá nhân"
          >
            {authUser?.avatarUrl ? (
              <img src={`${BASE_URL}${authUser.avatarUrl}`} alt="avatar" />
            ) : (
              <div className="avatar-fallback">{initial}</div>
            )}
            <span className="online-dot" />
          </div>
        </div>
      </div>

      {sidebarMode === "news" ? (
        <NewsFeed />
      ) : (
        <>
          <div style={{ position: "relative", display: "flex" }}>
            <Sidebar
              mode={sidebarMode}
              setSidebarMode={setSidebarMode}
              collapsed={sidebarCollapsed}
              onOpenFriends={() => setShowFriends(true)}
              onNewChat={() => setShowNewChat(true)}
            />

            <button
              className="sidebar-toggle-btn"
              onClick={() => setSidebarCollapsed(c => !c)}
              title={sidebarCollapsed ? "Mở sidebar" : "Thu sidebar"}
              style={{
                position: "absolute",
                right: sidebarCollapsed ? "-16px" : "-16px",
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 20,
              }}
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          <ChatArea sidebarMode={sidebarMode} setSidebarMode={setSidebarMode} />
        </>
      )}
    </div>
  );
}
