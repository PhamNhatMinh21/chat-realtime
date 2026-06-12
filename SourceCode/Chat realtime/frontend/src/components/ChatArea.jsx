import { useEffect, useRef, useMemo, Fragment, useState } from "react";
import { MoreHorizontal, Users, ClipboardList } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useSocketStore } from "../store/useSocketStore";
import { useAuthStore } from "../store/useAuthStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { useNotificationStore } from "../store/useNotificationStore";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import NoChatSelected from "./NoChatSelected";
import ConversationInfoPanel from "./ConversationInfoPanel";
import GroupTaskPanel from "./GroupTaskPanel";
import NotificationDetailView from "./NotificationDetailView";

import { BASE_URL } from "../lib/config";

function formatDateDivider(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return "Hôm nay";
  if (diff < 172800000) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" });
}

function sameDay(d1, d2) {
  const a = new Date(d1), b = new Date(d2);
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function formatLastActive(dateStr) {
  if (!dateStr) return "Không hoạt động";
  let diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) diff = 0;

  if (diff < 60000) return "Vừa mới truy cập";
  if (diff < 3600000) return `Hoạt động ${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `Hoạt động ${Math.floor(diff / 3600000)} giờ trước`;
  if (diff < 604800000) return `Hoạt động ${Math.floor(diff / 86400000)} ngày trước`;
  return `Hoạt động từ ${new Date(dateStr).toLocaleDateString("vi-VN")}`;
}

function ChatHeader({ conversation, authUser, onlineUsers, offlineUsers, onOpenInfo, onOpenTasks, tasksOpen }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const isGroup = conversation.type === "group";
  const partner = !isGroup ? conversation.participants?.find(p => String(p._id) !== String(authUser?._id)) : null;
  const isOnline = partner && onlineUsers.some(id => String(id) === String(partner._id));
  const name = isGroup ? (conversation.group?.name || "Nhóm") : (partner?.displayName || partner?.username || "Unknown");
  const avatarUrl = isGroup
    ? (conversation.group?.avatarUrl ? `${BASE_URL}${conversation.group.avatarUrl}` : null)
    : (partner?.avatarUrl ? `${BASE_URL}${partner.avatarUrl}` : null);
  const initial = (name || "?").charAt(0).toUpperCase();

  const rawLastActive = offlineUsers[partner?._id] || partner?.lastActive;
  const lastActiveText = isOnline ? "Đang hoạt động" : formatLastActive(rawLastActive);

  return (
    <div className="chat-header">
      <div className="chat-header-avatar">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} />
        ) : isGroup ? (
          <div className="group-avatar" style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>{initial}</div>
        ) : (
          <div className="fallback" style={{ width: "100%", height: "100%", background: "var(--accent-gradient)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "white" }}>{initial}</div>
        )}
      </div>
      <div className="chat-header-info">
        <div className="chat-header-name">{name}</div>
        {isGroup ? (
          <div className="chat-header-status offline"><Users size={10} /> {conversation.participants?.length || 0} thành viên</div>
        ) : (
          <div className={`chat-header-status ${isOnline ? "" : "offline"}`}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: isOnline ? "var(--success)" : "var(--text-muted)", display: "inline-block" }} />
            {lastActiveText}
          </div>
        )}
      </div>
      <div className="chat-header-actions">
        {isGroup && (
          <button
            className="btn-icon"
            title="Lịch hẹn nhóm"
            onClick={onOpenTasks}
            style={{ color: tasksOpen ? "var(--accent)" : undefined }}
          >
            <ClipboardList size={18} />
          </button>
        )}
        <button
          className="btn-icon"
          title="Thông tin cuộc trò chuyện"
          onClick={onOpenInfo}
          style={{ color: "var(--accent)" }}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}

export default function ChatArea({ sidebarMode = "chats", setSidebarMode }) {

  const { selectedConversation, messages, getMessages, isMessagesLoading, typingUsers, markSeen } = useChatStore();
  const { selectedNotification, setSelectedNotification } = useNotificationStore();
  const { joinConversation, leaveConversation, emitMarkSeen } = useSocketStore();
  const { authUser, onlineUsers, offlineUsers } = useAuthStore();
  const { readReceiptsEnabled } = useSettingsStore();

  const bottomRef = useRef(null);
  const prevConvRef = useRef(null);

  const [showInfo, setShowInfo] = useState(false);
  const [showTasks, setShowTasks] = useState(false);

  const isGroup = selectedConversation?.type === "group";

  useEffect(() => {
    if (!selectedConversation) return;
    setSelectedNotification(null);
    setShowInfo(false);
    setShowTasks(false);

    const convId = selectedConversation._id;

    if (prevConvRef.current && prevConvRef.current !== convId) {
      leaveConversation(prevConvRef.current);
    }

    prevConvRef.current = convId;
    joinConversation(convId);
    getMessages(convId);

    markSeen(convId);
    emitMarkSeen(convId);
  }, [selectedConversation?._id]);

  const prevMsgLengthRef = useRef(0);
  const prevConvIdRef = useRef(null);

  const scrollToBottom = (behavior = "auto") => {
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({ behavior });
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior });
    }, 60);
    return () => clearTimeout(timer);
  };

  useEffect(() => {
    if (!selectedConversation || isMessagesLoading) return;

    const convId = selectedConversation._id;
    const currentLength = messages.length;
    const prevLength = prevMsgLengthRef.current;
    const prevConvId = prevConvIdRef.current;

    const isNewMessage = convId === prevConvId && currentLength > prevLength;

    prevMsgLengthRef.current = currentLength;
    prevConvIdRef.current = convId;

    if (isNewMessage) {
      return scrollToBottom("smooth");
    } else {
      return scrollToBottom("auto");
    }
  }, [messages, isMessagesLoading, selectedConversation?._id]);

  const typingInConv = selectedConversation
    ? Object.keys(typingUsers[selectedConversation._id] || {}).filter(uid => uid !== authUser?._id)
    : [];

  const participantsMap = useMemo(() => {
    if (!selectedConversation?.participants) return {};
    return Object.fromEntries(selectedConversation.participants.filter(Boolean).map(p => [p._id, p]));
  }, [selectedConversation]);

  const seenByOthers = useMemo(() => {
    if (!readReceiptsEnabled) return [];
    return (selectedConversation?.seenBy || []).filter(
      u => String(u._id || u) !== String(authUser?._id)
    );
  }, [selectedConversation?.seenBy, authUser?._id, readReceiptsEnabled]);

  const lastOwnMsgId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msgSenderId = messages[i].senderId?._id || messages[i].senderId;
      if (String(msgSenderId) === String(authUser?._id)) return messages[i]._id;
    }
    return null;
  }, [messages, authUser?._id]);

  if (sidebarMode === "notifications" || !selectedConversation) {
    return selectedNotification
      ? <NotificationDetailView notification={selectedNotification} onClose={() => setSelectedNotification(null)} setSidebarMode={setSidebarMode} />
      : <NoChatSelected />;
  }

  return (
    <div style={{ display: "flex", flex: 1, minWidth: 0, height: "100vh" }}>

      <div className="chat-main">
        <ChatHeader
          conversation={selectedConversation}
          authUser={authUser}
          onlineUsers={onlineUsers}
          offlineUsers={offlineUsers}
          onOpenInfo={() => setShowInfo(v => !v)}
          onOpenTasks={() => setShowTasks(v => !v)}
          tasksOpen={showTasks}
        />

        <div className="messages-container">
          {isMessagesLoading ? (
            <div className="chat-loading"><span className="spinner" /> Đang tải tin nhắn...</div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">
              <p>Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const msgSenderId = msg.senderId?._id || msg.senderId;
              const isOwn = String(msgSenderId) === String(authUser?._id);
              const prevMsg = messages[idx - 1];
              const showDateDiv = !prevMsg || !sameDay(prevMsg.createdAt, msg.createdAt);

              const nextMsgSenderId = messages[idx + 1]?.senderId?._id || messages[idx + 1]?.senderId;
              const showAvatar = !isOwn && (!messages[idx + 1] || String(nextMsgSenderId) !== String(msgSenderId));
              const sender = participantsMap[msgSenderId] || null;
              return (
                <Fragment key={msg._id}>
                  {showDateDiv && (
                    <div className="msg-date-divider"><span>{formatDateDivider(msg.createdAt)}</span></div>
                  )}
                  <MessageBubble message={msg} isOwn={isOwn} sender={sender} showAvatar={showAvatar} isGroup={isGroup} />
                  {isOwn && msg._id === lastOwnMsgId && seenByOthers.length > 0 && (
                    <div className="msg-seen-row">
                      {seenByOthers.map(u => {
                        const p = participantsMap[u._id || u];
                        const name = p?.displayName || p?.username || "?";
                        return p?.avatarUrl ? (
                          <img key={u._id || u} src={`${BASE_URL}${p.avatarUrl}`} alt={name}
                            className="msg-seen-avatar" title={`${name} đã xem`} />
                        ) : (
                          <div key={u._id || u} className="msg-seen-avatar msg-seen-fallback"
                            title={`${name} đã xem`}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                        );
                      })}
                      <span className="msg-seen-label">Đã xem</span>
                    </div>
                  )}
                </Fragment>
              );
            })
          )}

          {typingInConv.length > 0 && (
            <div className="typing-indicator">
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--glass-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                {(participantsMap[typingInConv[0]]?.displayName || "?").charAt(0)}
              </div>
              <div className="typing-dots"><span /><span /><span /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <MessageInput conversation={selectedConversation} />
      </div>

      {showInfo && (
        <ConversationInfoPanel
          conversation={selectedConversation}
          onClose={() => setShowInfo(false)}
        />
      )}

      {showTasks && isGroup && (
        <GroupTaskPanel
          conversation={selectedConversation}
          onClose={() => setShowTasks(false)}
        />
      )}
    </div>
  );
}
