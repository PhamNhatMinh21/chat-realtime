import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Users, Search, PenSquare, MessageSquare, Bell, CheckCheck, Trash2 } from "lucide-react";
import { useFriendStore } from "../store/useFriendStore";
import { axiosInstance } from "../lib/axios";
import { useNotificationStore } from "../store/useNotificationStore";
import { BASE_URL } from "../lib/config";
import { formatTime } from "../lib/formatTime";

function NotifTypeIcon({ type, urgency }) {
  const s = { fontSize: 20, lineHeight: 1 };
  if (type === "friend_request") return <span style={s}>👤</span>;
  if (type === "task_reminder") {
    if (urgency === "critical") return <span style={s}>⚠️</span>;
    if (urgency === "high") return <span style={s}>🔔</span>;
    return <span style={s}>📋</span>;
  }
  if (type === "new_message") return <MessageSquare size={18} color="var(--accent)" />;
  return <Bell size={18} color="var(--text-muted)" />;
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

function NotificationsList({ setSidebarMode, onOpenFriends }) {
  const { notifications, markAllRead, markRead, clearAll, setSelectedNotification } = useNotificationStore();
  const { conversations, setSelectedConversation } = useChatStore();

  const handleNotifClick = (notif) => {
    markRead(notif.id);
    setSelectedNotification(notif);

    if (notif.type === "new_message" && notif.data?.conversationId) {
      // Tìm trò chuyện và mở nó
      const conv = conversations.find(c => String(c._id) === String(notif.data.conversationId));
      if (conv) {
        setSelectedConversation(conv);
        setSidebarMode("chats");
      }
    } else {
      setSelectedConversation(null);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {notifications.length > 0 && (
        <div style={{ display: "flex", gap: 4, padding: "4px 12px 8px", justifyContent: "flex-end" }}>
          <button
            onClick={markAllRead}
            title="Đánh dấu tất cả đã đọc"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", padding: "4px 8px", borderRadius: 6,
              fontSize: 11, display: "flex", alignItems: "center", gap: 4,
              transition: "var(--transition)",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--accent)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
          >
            <CheckCheck size={13} /> Đọc tất cả
          </button>
          <button
            onClick={clearAll}
            title="Xóa tất cả"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", padding: "4px 8px", borderRadius: 6,
              fontSize: 11, display: "flex", alignItems: "center", gap: 4,
              transition: "var(--transition)",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--danger)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
          >
            <Trash2 size={13} /> Xóa hết
          </button>
        </div>
      )}

      <div className="sidebar-list custom-scrollbar" style={{ gap: 0, padding: "0 8px" }}>
        {notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={40} style={{ opacity: 0.4 }} />
            <p>Chưa có thông báo nào</p>
            <p style={{ fontSize: 12 }}>Các thông báo sẽ hiện ở đây</p>
          </div>
        ) : (
          notifications.map(notif => {
            const borderColor = getBorderColor(notif);
            return (
              <div
                key={notif.id}
                onClick={() => handleNotifClick(notif)}
                style={{
                  display: "flex", gap: 10, padding: "10px 10px",
                  borderRadius: 12, marginBottom: 2,
                  cursor: "pointer",
                  borderLeft: `3px solid ${notif.read ? "transparent" : borderColor}`,
                  background: notif.read
                    ? "transparent"
                    : `${notif.urgency === "critical" ? "rgba(239,68,68" : "rgba(124,106,255"},0.06)`,
                  transition: "all 0.15s ease",
                  border: `1px solid ${notif.read ? "transparent" : borderColor + "33"}`,
                  borderLeftWidth: 3,
                  borderLeftColor: notif.read ? "transparent" : borderColor,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "var(--glass-bg-hover)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = notif.read
                    ? "transparent"
                    : `${notif.urgency === "critical" ? "rgba(239,68,68" : "rgba(124,106,255"},0.06)`;
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: notif.read ? "var(--glass-bg)" : `${borderColor}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <NotifTypeIcon type={notif.type} urgency={notif.urgency} />
                </div>

                {/* Nội dung */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: notif.read ? 500 : 700,
                    color: "var(--text-primary)", marginBottom: 2,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {notif.title}
                  </div>
                  <div style={{
                    fontSize: 12, color: "var(--text-secondary)",
                    lineHeight: 1.4, overflow: "hidden",
                    display: "-webkit-box", WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}>
                    {notif.body}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
                    {formatTime(notif.createdAt)}
                  </div>
                </div>

                {/* Chưa đọc */}
                {!notif.read && (
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: borderColor, flexShrink: 0, marginTop: 6,
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

function ConvAvatar({ conv, authUser, onlineUsers }) {
  if (conv.type === "group") {
    return (
      <div className="chat-avatar">
        {conv.group?.avatarUrl ? (
          <img src={`${BASE_URL}${conv.group.avatarUrl}`} alt={conv.group.name} />
        ) : (
          <div className="group-avatar">
            {(conv.group?.name || "G").charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    );
  }
  const partner = conv.participants?.find(p => p._id !== authUser?._id);
  const isOnline = partner && onlineUsers.includes(partner._id);
  return (
    <div className="chat-avatar">
      {partner?.avatarUrl ? (
        <img src={`${BASE_URL}${partner.avatarUrl}`} alt={partner?.displayName || ""} />
      ) : (
        <div className="fallback">{(partner?.displayName || "?").charAt(0).toUpperCase()}</div>
      )}
      {isOnline && <span className="online-badge" />}
    </div>
  );
}

export default function Sidebar({ mode = "chats", setSidebarMode, onOpenFriends, onNewChat, collapsed }) {
  const { conversations, getConversations, selectedConversation, setSelectedConversation, isConversationsLoading } = useChatStore();
  const { authUser, onlineUsers } = useAuthStore();
  const { friends, getFriends, isLoadingFriends } = useFriendStore();
  const { unreadCount } = useNotificationStore();
  const [search, setSearch] = useState("");
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  useEffect(() => { getConversations(); }, [getConversations]);
  useEffect(() => { if (mode === "friends") getFriends(); }, [mode, getFriends]);

  const handleOpenChat = async (friendId) => {
    if (isOpeningChat) return;
    setIsOpeningChat(true);
    try {
      const res = await axiosInstance.post("/conversations", { type: "direct", memberIds: [friendId] });
      const conv = res.data.conversation;
      if (conv) {
        await getConversations();
        const { conversations } = useChatStore.getState();
        const found = conversations.find(c => c._id === conv._id);
        setSelectedConversation(found || conv);
        if (setSidebarMode) setSidebarMode("chats");
      }
    } catch (err) {
      console.error("Error opening chat:", err);
    } finally {
      setIsOpeningChat(false);
    }
  };

  const getConvName = (conv) => {
    if (conv.type === "group") return conv.group?.name || "Nhóm";
    const p = conv.participants?.find(pp => pp._id !== authUser?._id);
    return p?.displayName || p?.username || "Unknown";
  };

  const getLastMsg = (conv) => {
    if (!conv.lastMessage) return "Bắt đầu trò chuyện";
    if (conv.lastMessage.isRecalled || conv.lastMessage.content === "Tin nhắn đã được thu hồi") return "Tin nhắn đã thu hồi";
    if (conv.lastMessage.isToxic) return "Tin nhắn nhạy cảm";
    return conv.lastMessage.content || "Đã gửi file";
  };

  const filtered = conversations.filter(c => {
    const name = getConvName(c).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const filteredFriends = friends.filter(f =>
    f && (f.displayName || f.username || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sidebar-header">
        <h1>
          {mode === "chats" ? "Đoạn chat" : mode === "notifications" ? "Thông báo" : "Bạn bè"}
        </h1>
        <div className="sidebar-header-actions">
          {mode !== "notifications" && (
            <>
              <button className="btn-icon" onClick={onOpenFriends} title="Bạn bè">
                <Users size={18} />
              </button>
              <button className="btn-icon" onClick={onNewChat} title="Cuộc trò chuyện mới">
                <PenSquare size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {mode === "notifications" ? (
        <NotificationsList setSidebarMode={setSidebarMode} onOpenFriends={onOpenFriends} />
      ) : (
        <>
          <div className="sidebar-search-wrap">
            <div className="sidebar-search">
              <Search className="sidebar-search-icon" size={16} />
              <input
                placeholder={mode === "chats" ? "Tìm kiếm cuộc trò chuyện..." : "Tìm kiếm bạn bè..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="sidebar-list custom-scrollbar">
            {mode === "chats" ? (
              isConversationsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "10px", alignItems: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--glass-bg)", flexShrink: 0 }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ height: 14, background: "var(--glass-bg)", borderRadius: 4, width: "60%" }} />
                      <div style={{ height: 12, background: "var(--glass-bg)", borderRadius: 4, width: "80%" }} />
                    </div>
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="empty-state">
                  <MessageSquare size={40} style={{ opacity: 0.4 }} />
                  <p>{search ? "Không tìm thấy cuộc trò chuyện" : "Chưa có cuộc trò chuyện nào"}</p>
                  <p style={{ fontSize: 12 }}>Thêm bạn bè để bắt đầu chat!</p>
                </div>
              ) : (
                filtered.map((conv) => (
                  <button
                    key={conv._id}
                    className={`chat-item ${selectedConversation?._id === conv._id ? "active" : ""}`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <ConvAvatar conv={conv} authUser={authUser} onlineUsers={onlineUsers} />
                    <div className="chat-info">
                      <div className="chat-name">{getConvName(conv)}</div>
                      <div className="chat-preview">{getLastMsg(conv)}</div>
                    </div>
                    <div className="chat-meta">
                      {conv.lastMessage?.createdAt && (
                        <span className="chat-time">{formatTime(conv.lastMessage.createdAt)}</span>
                      )}
                    </div>
                  </button>
                ))
              )
            ) : (
              isLoadingFriends ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "10px", alignItems: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--glass-bg)", flexShrink: 0 }} />
                    <div style={{ height: 14, background: "var(--glass-bg)", borderRadius: 4, width: "60%" }} />
                  </div>
                ))
              ) : filteredFriends.length === 0 ? (
                <div className="empty-state">
                  <Users size={40} style={{ opacity: 0.4 }} />
                  <p>{search ? "Không tìm thấy bạn bè" : "Chưa có bạn bè nào"}</p>
                  <p style={{ fontSize: 12 }}>Tìm kiếm để kết bạn mới!</p>
                </div>
              ) : (
                filteredFriends.map((f) => {
                  const isOnline = onlineUsers.includes(f._id);
                  return (
                    <button
                      key={f._id}
                      className="chat-item"
                      onClick={() => handleOpenChat(f._id)}
                    >
                      <div className="chat-avatar">
                        {f.avatarUrl ? (
                          <img src={`${BASE_URL}${f.avatarUrl}`} alt={f.displayName} />
                        ) : (
                          <div className="fallback">{(f.displayName || f.username || "?").charAt(0).toUpperCase()}</div>
                        )}
                        {isOnline && <span className="online-badge" />}
                      </div>
                      <div className="chat-info">
                        <div className="chat-name">{f.displayName || f.username}</div>
                        <div className="chat-preview">@{f.username}</div>
                      </div>
                    </button>
                  );
                })
              )
            )}
          </div>
        </>
      )}
    </aside>
  );
}
