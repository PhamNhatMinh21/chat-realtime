import { useState } from "react";
import { X, Bell, UserCheck, UserX, Clock, MessageSquare, Check, ArrowRight, UserPlus } from "lucide-react";
import { useNotificationStore } from "../store/useNotificationStore";
import { useFriendStore } from "../store/useFriendStore";
import { useChatStore } from "../store/useChatStore";
import { useTaskStore } from "../store/useTaskStore";

import { BASE_URL } from "../lib/config";

function Avatar({ user, size = 44 }) {
  const name = user?.displayName || user?.username || "?";
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
      {user?.avatarUrl ? (
        <img src={`${BASE_URL}${user.avatarUrl}`} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "var(--accent-gradient)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: "white" }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default function NotificationDetailView({ notification, onClose, setSidebarMode }) {
  const { setSelectedNotification, getNotifications } = useNotificationStore();
  const { acceptFriendRequest, declineFriendRequest } = useFriendStore();
  const { conversations, setSelectedConversation } = useChatStore();
  const { updateStatus } = useTaskStore();

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleAcceptRequest = async (requestId) => {
    setLoading(true);
    const res = await acceptFriendRequest(requestId);
    setLoading(false);
    if (res.success) {
      getNotifications();
      setDone(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      alert("Không thể chấp nhận lời mời");
    }
  };

  const handleDeclineRequest = async (requestId) => {
    setLoading(true);
    const res = await declineFriendRequest(requestId);
    setLoading(false);
    if (res.success) {
      getNotifications();
      onClose();
    } else {
      alert("Không thể từ chối lời mời");
    }
  };

  const handleGoToChat = () => {
    const convId = notification.data?.conversationId;
    if (!convId) return;

    const conv = conversations.find(c => String(c._id) === String(convId));
    if (conv) {
      setSelectedConversation(conv);
      if (setSidebarMode) setSidebarMode("chats");
      onClose();
    } else {
      alert("Không tìm thấy cuộc hội thoại này");
    }
  };

  const handleCompleteTask = async (taskId) => {
    setLoading(true);
    try {
      await updateStatus(taskId, "done");
      getNotifications();
      setDone(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (notification.type === "friend_request") {
      const fromUser = notification.data?.from || {};
      const requestId = notification.data?.requestId;

      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: "100%" }}>
          <div style={{ background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: "50%", padding: 18, animation: "badgePulse 2s infinite" }}>
            <UserPlus size={36} color="#22c55e" />
          </div>

          <div style={{ textAlign: "center" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Lời mời kết bạn</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Nhận được yêu cầu giao lưu, trò chuyện từ thành viên mới</p>
          </div>

          <div style={{ width: "100%", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar user={fromUser} size={50} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{fromUser.displayName || fromUser.username}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>@{fromUser.username}</div>
            </div>
          </div>

          {done ? (
            <div style={{ color: "#22c55e", fontWeight: 600, display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <Check size={18} /> Hai bạn đã trở thành bạn bè!
            </div>
          ) : (
            <div style={{ display: "flex", gap: 12, width: "100%", marginTop: 10 }}>
              <button
                disabled={loading}
                onClick={() => handleAcceptRequest(requestId)}
                style={{ flex: 1, padding: "12px", borderRadius: "24px", background: "var(--accent-gradient)", color: "white", border: "none", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}
              >
                {loading ? <span className="spinner" /> : <UserCheck size={16} />}
                Chấp nhận
              </button>
              <button
                disabled={loading}
                onClick={() => handleDeclineRequest(requestId)}
                style={{ flex: 1, padding: "12px", borderRadius: "24px", background: "rgba(255, 79, 106, 0.12)", color: "var(--danger)", border: "1px solid rgba(255, 79, 106, 0.3)", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}
              >
                <UserX size={16} />
                Từ chối
              </button>
            </div>
          )}
        </div>
      );
    }

    if (notification.type === "task_reminder") {
      const task = notification.data || {};
      const urgency = notification.urgency || task.urgency;
      const isCritical = urgency === "critical";
      const isHigh = urgency === "high";
      const urgencyColor = isCritical ? "var(--danger)" : isHigh ? "var(--warning)" : "var(--accent)";

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{
              background: `color-mix(in srgb, ${urgencyColor} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${urgencyColor} 25%, transparent)`,
              borderRadius: "50%",
              padding: 10
            }}>
              <Clock size={20} color={urgencyColor} />
            </div>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 12,
              background: `color-mix(in srgb, ${urgencyColor} 10%, transparent)`,
              color: urgencyColor
            }}>
              {isCritical ? "SẮP QUÁ HẠN" : isHigh ? "KHẨN CẤP" : "NHẮC NHỞ"}
            </span>
          </div>

          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Chi tiết lịch hẹn công việc</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Lịch hẹn công việc của bạn có hạn chót sắp đến. Vui lòng kiểm tra và hoàn thành sớm.
            </p>
          </div>

          <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Tiêu đề</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginTop: 4 }}>{task.title}</div>
            </div>

            {task.description && (
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Mô tả</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.4 }}>{task.description}</div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, borderTop: "1px solid var(--glass-border)", paddingTop: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Thời gian còn lại</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: urgencyColor, marginTop: 2 }}>{task.timeLeft}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Hạn chót</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>
                  {task.deadline ? new Date(task.deadline).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                </div>
              </div>
            </div>
          </div>

          {done ? (
            <div style={{ color: "#22c55e", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, padding: "10px 0" }}>
              <Check size={18} /> Đã cập nhật công việc hoàn thành!
            </div>
          ) : (
            <div style={{ display: "flex", gap: 12, width: "100%", marginTop: 10 }}>
              <button
                disabled={loading}
                onClick={() => handleCompleteTask(task.taskId)}
                style={{ flex: 1, padding: "12px", borderRadius: "24px", background: "var(--success)", color: "white", border: "none", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s", boxShadow: "0 4px 12px rgba(34, 211, 166, 0.2)" }}
              >
                {loading ? <span className="spinner" /> : <Check size={16} />}
                Hoàn thành
              </button>
              <button
                onClick={handleGoToChat}
                style={{ flex: 1, padding: "12px", borderRadius: "24px", background: "var(--accent-gradient)", color: "white", border: "none", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s", boxShadow: "0 4px 12px rgba(124, 106, 255, 0.2)" }}
              >
                Mở phòng chat
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      );
    }

    if (notification.type === "new_message") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: "100%" }}>
          <div style={{ background: "rgba(124, 106, 255, 0.08)", border: "1px solid rgba(124, 106, 255, 0.2)", borderRadius: "50%", padding: 18 }}>
            <MessageSquare size={36} color="var(--accent)" />
          </div>

          <div style={{ textAlign: "center" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Tin nhắn mới</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Bạn nhận được phản hồi mới chưa xem trong cuộc hội thoại</p>
          </div>

          <div style={{ width: "100%", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: 16, textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{notification.title}</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, fontStyle: "italic" }}>"{notification.body}"</div>
          </div>

          <button
            onClick={handleGoToChat}
            style={{ width: "100%", padding: "12px", borderRadius: "24px", background: "var(--accent-gradient)", color: "white", border: "none", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s", marginTop: 10 }}
          >
            Nhắn tin ngay
            <ArrowRight size={16} />
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <Bell size={40} color="var(--text-muted)" />
        <div>
          <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600 }}>{notification.title}</h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>{notification.body}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="chat-main" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="chat-header" style={{ justifyContent: "space-between", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--glass-bg-active)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Bell size={16} color="var(--accent)" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            Thông báo chi tiết
          </span>
        </div>
        <button
          onClick={onClose}
          className="btn-icon"
          title="Đóng chi tiết"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: "50%",
            transition: "var(--transition)"
          }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--glass-bg-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px 24px",
        overflowY: "auto",
        background: "var(--bg-primary)",
      }}>
        <div style={{
          width: "100%",
          maxWidth: "520px",
          background: "var(--glass-bg)",
          backdropFilter: "var(--blur)",
          WebkitBackdropFilter: "var(--blur)",
          border: "1px solid var(--glass-border)",
          borderRadius: "24px",
          padding: "32px 36px",
          boxShadow: "var(--shadow-lg)",
          animation: "fadeIn 0.25s ease-out",
          position: "relative"
        }}>
          <div>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
