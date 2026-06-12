import { useEffect, useRef } from "react";
import { Bell, X, Check, CheckCheck, Users, Clock, MessageSquare, Trash2 } from "lucide-react";
import { useNotificationStore } from "../store/useNotificationStore";
import { useChatStore } from "../store/useChatStore";

import { BASE_URL } from "../lib/config";

function NotifIcon({ type, urgency }) {
  if (type === "friend_request")
    return <div style={{ fontSize: 20 }}>👤</div>;
  if (type === "task_reminder") {
    if (urgency === "critical") return <div style={{ fontSize: 20 }}>⚠️</div>;
    if (urgency === "high") return <div style={{ fontSize: 20 }}>🔔</div>;
    return <div style={{ fontSize: 20 }}>📋</div>;
  }
  if (type === "new_message")
    return <MessageSquare size={18} color="var(--accent)" />;
  return <Bell size={18} color="var(--text-muted)" />;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return "Vừa xong";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  return `${Math.floor(diff / 86400000)} ngày trước`;
}

function getBorderColor(notif) {
  if (notif.type === "task_reminder") {
    if (notif.urgency === "critical") return "var(--danger)";
    if (notif.urgency === "high") return "#f59e0b";
    return "var(--accent)";
  }
  if (notif.type === "friend_request") return "#22c55e";
  if (notif.type === "new_message") return "var(--accent)";
  return "var(--glass-border)";
}

export default function NotificationPanel({ onClose }) {
  const { notifications, unreadCount, markAllRead, markRead, clearAll, setSelectedNotification } = useNotificationStore();
  const panelRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const t = setTimeout(() => markAllRead(), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        bottom: 70,
        left: 64,
        width: 340,
        maxHeight: 480,
        background: "var(--bg-secondary)",
        border: "1px solid var(--glass-border)",
        borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,106,255,0.1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 1000,
        animation: "slideUpFade 0.25s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      <div style={{
        padding: "14px 16px 10px",
        borderBottom: "1px solid var(--glass-border)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "rgba(124,106,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Bell size={16} color="var(--accent)" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            Thông báo
          </span>
          {unreadCount > 0 && (
            <span style={{
              fontSize: 11, background: "var(--danger)", color: "white",
              borderRadius: 10, padding: "1px 7px", fontWeight: 700,
            }}>
              {unreadCount}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {notifications.length > 0 && (
            <>
              <button
                onClick={markAllRead}
                title="Đánh dấu tất cả đã đọc"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px 6px", borderRadius: 6, fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}
              >
                <CheckCheck size={14} /> Đọc tất cả
              </button>
              <button
                onClick={clearAll}
                title="Xóa tất cả"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px 6px", borderRadius: 6 }}
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }} className="custom-scrollbar">
        {notifications.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "40px 20px", color: "var(--text-muted)",
          }}>
            <Bell size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontSize: 13, margin: 0 }}>Chưa có thông báo nào</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const borderColor = getBorderColor(notif);
            return (
              <div
                key={notif.id}
                onClick={() => {
                  markRead(notif.id);
                  setSelectedNotification(notif);
                  if (notif.type === "new_message" && notif.data?.conversationId) {
                    const { conversations, setSelectedConversation } = useChatStore.getState();
                    const conv = conversations.find(c => String(c._id) === String(notif.data.conversationId));
                    if (conv) {
                      setSelectedConversation(conv);
                    }
                  } else {
                    const { setSelectedConversation } = useChatStore.getState();
                    setSelectedConversation(null);
                  }
                  onClose();
                }}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 14px",
                  cursor: "pointer",
                  borderLeft: `3px solid ${notif.read ? "transparent" : borderColor}`,
                  background: notif.read ? "transparent" : `rgba(${notif.urgency === "critical" ? "239,68,68" : "124,106,255"},0.04)`,
                  transition: "all 0.15s ease",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: `${notif.read ? "var(--glass-bg)" : borderColor}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <NotifIcon type={notif.type} urgency={notif.urgency} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: notif.read ? 500 : 700,
                    color: "var(--text-primary)", marginBottom: 2,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {notif.title}
                  </div>
                  <div style={{
                    fontSize: 12, color: "var(--text-secondary)",
                    lineHeight: 1.4,
                    display: "-webkit-box", WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {notif.body}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
                    {timeAgo(notif.createdAt)}
                  </div>
                </div>

                {!notif.read && (
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: borderColor, flexShrink: 0, marginTop: 4,
                  }} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
