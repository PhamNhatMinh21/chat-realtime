import { useState, useEffect } from "react";
import { X, Search, MessageSquare, Users, Plus, Check } from "lucide-react";
import { useFriendStore } from "../store/useFriendStore";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";

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

export default function NewChatModal({ onClose }) {
  const { friends, getFriends, isLoadingFriends } = useFriendStore();
  const { setSelectedConversation, getConversations } = useChatStore();
  const { authUser } = useAuthStore();

  const [mode, setMode] = useState("direct");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => { getFriends(); }, []);

  const filtered = friends.filter(f =>
    f && (f.displayName || f.username || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (friend) => {
    setSelected(prev =>
      prev.find(f => f._id === friend._id)
        ? prev.filter(f => f._id !== friend._id)
        : [...prev, friend]
    );
  };

  const handleCreate = async () => {
    if (selected.length === 0) return;
    setCreating(true);
    try {
      if (mode === "direct") {
        const res = await axiosInstance.post("/conversations", {
          type: "direct",
          memberIds: [selected[0]._id]
        });
        const conv = res.data.conversation;
        await getConversations();
        const { conversations } = useChatStore.getState();
        const found = conversations.find(c => c._id === conv._id);
        setSelectedConversation(found || conv);
        onClose();
      } else {
        if (!groupName.trim()) return alert("Hãy đặt tên nhóm");
        const res = await axiosInstance.post("/conversations", {
          type: "group",
          name: groupName.trim(),
          memberIds: selected.map(f => f._id)
        });
        const conv = res.data.conversation;
        await getConversations();
        const { conversations } = useChatStore.getState();
        const found = conversations.find(c => c._id === conv._id);
        setSelectedConversation(found || conv);
        onClose();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Không thể tạo cuộc trò chuyện");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <h2>Tạo cuộc trò chuyện mới</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-tabs">
          <button className={`modal-tab ${mode === "direct" ? "active" : ""}`} onClick={() => { setMode("direct"); setSelected([]); }}>
            <MessageSquare size={14} style={{ display: "inline", marginRight: 4 }} /> Chat 1-1
          </button>
          <button className={`modal-tab ${mode === "group" ? "active" : ""}`} onClick={() => { setMode("group"); setSelected([]); }}>
            <Users size={14} style={{ display: "inline", marginRight: 4 }} /> Tạo nhóm
          </button>
        </div>

        <div className="modal-body">
          {mode === "group" && (
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">Tên nhóm</label>
              <div className="form-input-wrap">
                <Users className="form-input-icon" size={16} />
                <input className="form-input" placeholder="Nhập tên nhóm..." value={groupName} onChange={e => setGroupName(e.target.value)} />
              </div>
            </div>
          )}


          {selected.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {selected.map(f => (
                <div key={f._id} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--glass-bg-active)", border: "1px solid var(--glass-border-hover)", borderRadius: "var(--radius-full)", padding: "4px 10px 4px 6px" }}>
                  <Avatar user={f} size={22} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{f.displayName || f.username}</span>
                  <button onClick={() => toggleSelect(f)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, lineHeight: 1, fontSize: 14 }}>×</button>
                </div>
              ))}
            </div>
          )}

          <div className="modal-search">
            <Search size={14} color="var(--text-muted)" />
            <input placeholder="Tìm bạn bè..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          </div>

          {isLoadingFriends ? (
            <div className="empty-state"><span className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Users size={36} style={{ opacity: 0.4 }} />
              <p>{friends.length === 0 ? "Chưa có bạn bè nào" : "Không tìm thấy"}</p>
            </div>
          ) : (
            filtered.map(f => {
              const isSelected = !!selected.find(s => s._id === f._id);
              return (
                <div
                  key={f._id}
                  className="user-item"
                  style={{ cursor: "pointer", background: isSelected ? "var(--glass-bg-active)" : "" }}
                  onClick={() => mode === "direct" ? (setSelected([f])) : toggleSelect(f)}
                >
                  <Avatar user={f} />
                  <div className="user-info">
                    <div className="user-name">{f.displayName || f.username}</div>
                    <div className="user-sub">@{f.username}</div>
                  </div>
                  {isSelected && (
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Check size={14} color="white" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: "12px 24px", borderTop: "1px solid var(--glass-border)", display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Hủy</button>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={selected.length === 0 || creating || (mode === "group" && !groupName.trim())}
            style={{ flex: 2 }}
          >
            {creating ? <span className="spinner" /> : <Plus size={16} />}
            {mode === "direct" ? "Bắt đầu chat" : `Tạo nhóm${selected.length > 0 ? ` (${selected.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
