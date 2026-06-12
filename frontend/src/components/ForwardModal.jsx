import { useState } from "react";
import { createPortal } from "react-dom";
import { X, CornerUpRight, Check } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

import { BASE_URL } from "../lib/config";

function ConvAvatar({ conversation, authUser, size = 38 }) {
  const isGroup = conversation.type === "group";
  const partner = !isGroup
    ? conversation.participants?.find(p => String(p._id) !== String(authUser?._id))
    : null;
  const name = isGroup
    ? (conversation.group?.name || "Nhóm")
    : (partner?.displayName || partner?.username || "?");
  const avatarUrl = !isGroup && partner?.avatarUrl ? `${BASE_URL}${partner.avatarUrl}` : null;

  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "var(--accent-gradient)", display: "flex", alignItems: "center", justifycontent: "center", fontSize: size * 0.38, fontWeight: 700, color: "white" }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default function ForwardModal({ message, onClose }) {
  const { conversations, sendMessage, selectedConversation } = useChatStore();
  const { authUser } = useAuthStore();
  const [forwarding, setForwarding] = useState(null);
  const [done, setDone] = useState(null);

  const otherConvs = conversations.filter(c => String(c._id) !== String(selectedConversation?._id));

  const handleForward = async (conv) => {
    if (forwarding) return;
    setForwarding(conv._id);
    try {
      const isGroup = conv.type === "group";
      const partner = !isGroup
        ? conv.participants?.find(p => String(p._id) !== String(authUser?._id))
        : null;

      await sendMessage(conv._id, {
        content: message.content && !message.content.startsWith("Đã gửi")
          ? `↪ ${message.content}`
          : "(Đã chuyển tiếp file)",
        isGroup,
        recipientId: partner?._id,
      });

      setDone(conv._id);
      setTimeout(() => {
        setDone(null);
        setForwarding(null);
      }, 1500);
    } catch {
      alert("Không thể chuyển tiếp tin nhắn");
      setForwarding(null);
    }
  };

  const getName = (conv) => {
    if (conv.type === "group") return conv.group?.name || "Nhóm";
    const p = conv.participants?.find(p => String(p._id) !== String(authUser?._id));
    return p?.displayName || p?.username || "Unknown";
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400, width: "90vw", display: "flex", flexDirection: "column", maxHeight: "80vh" }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CornerUpRight size={18} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: 16 }}>Chuyển tiếp tin nhắn</h3>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {message.content && !message.content.startsWith("Đã gửi") && (
          <div style={{
            margin: "0 16px 12px",
            padding: "8px 12px",
            borderRadius: 10,
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            fontSize: 13,
            color: "var(--text-secondary)",
            fontStyle: "italic",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
            "{message.content}"
          </div>
        )}

        <div className="modal-body custom-scrollbar" style={{ maxHeight: 340, overflowY: "auto", padding: "0 8px 8px" }}>
          {otherConvs.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0", fontSize: 14 }}>
              Không có cuộc trò chuyện nào khác
            </div>
          ) : (
            otherConvs.map(conv => (
              <button
                key={conv._id}
                onClick={() => handleForward(conv)}
                disabled={!!forwarding}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  width: "100%", padding: "10px 12px", borderRadius: 12,
                  background: done === conv._id ? "rgba(34,211,166,0.08)" : "transparent",
                  border: `1px solid ${done === conv._id ? "rgba(34,211,166,0.3)" : "transparent"}`,
                  cursor: forwarding ? "not-allowed" : "pointer",
                  transition: "var(--transition)", textAlign: "left",
                  opacity: forwarding && forwarding !== conv._id ? 0.5 : 1
                }}
                className="conv-forward-item"
              >
                <ConvAvatar conversation={conv} authUser={authUser} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {getName(conv)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {conv.type === "group" ? `${conv.participants?.length || 0} thành viên` : "Chat 1-1"}
                  </div>
                </div>
                <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifycontent: "center", flexShrink: 0, background: done === conv._id ? "rgba(34,211,166,0.2)" : "rgba(124,106,255,0.08)" }}>
                  {done === conv._id ? (
                    <Check size={15} color="var(--success)" />
                  ) : forwarding === conv._id ? (
                    <span className="spinner" style={{ width: 14, height: 14 }} />
                  ) : (
                    <CornerUpRight size={14} color="var(--accent)" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
