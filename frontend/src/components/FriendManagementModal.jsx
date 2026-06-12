import { useState, useEffect } from "react";
import { X, Search, UserCheck, UserPlus, UserX, Clock, Users } from "lucide-react";
import { useFriendStore } from "../store/useFriendStore";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import { useChatStore } from "../store/useChatStore";

import { BASE_URL } from "../lib/config";

function UserAvatar({ user, size = 44 }) {
  const name = user?.displayName || user?.username || "?";
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="user-avatar" style={{ width: size, height: size }}>
      {user?.avatarUrl ? (
        <img src={`${BASE_URL}${user.avatarUrl}`} alt={name} />
      ) : (
        <div className="fallback">{initial}</div>
      )}
    </div>
  );
}

const TABS = ["friends", "requests", "search"];
const TAB_LABELS = { friends: "Bạn bè", requests: "Lời mời", search: "Tìm kiếm" };

export default function FriendManagementModal({ onClose }) {
  const { friends, friendRequests, getFriends, getFriendRequests, sendFriendRequest, acceptFriendRequest, declineFriendRequest, isLoadingFriends } = useFriendStore();
  const { authUser } = useAuthStore();
  const { getConversations, setSelectedConversation } = useChatStore();
  const [tab, setTab] = useState("friends");
  const [searchQ, setSearchQ] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  useEffect(() => {
    getFriends();
    getFriendRequests();
  }, []);

  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await axiosInstance.get(`/users/search?username=${searchQ.trim()}`);
      setSearchResult(res.data);
    } catch (err) {
      setSearchResult({ error: err.response?.data?.message || "Không tìm thấy người dùng" });
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (toId) => {
    const result = await sendFriendRequest(toId);
    setActionMsg(result.success ? "✓ Đã gửi lời mời kết bạn!" : (result.message || "Lỗi"));
    setTimeout(() => setActionMsg(""), 3000);
  };

  const handleAccept = async (id) => {
    await acceptFriendRequest(id);
    setActionMsg("✓ Đã chấp nhận kết bạn!");
    setTimeout(() => setActionMsg(""), 3000);
  };

  const handleDecline = async (id) => {
    await declineFriendRequest(id);
  };

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
        onClose();
      }
    } catch (err) {
      console.error("Error opening chat:", err);
    } finally {
      setIsOpeningChat(false);
    }
  };

  const received = friendRequests?.received || [];
  const sent = friendRequests?.sent || [];
  const filteredFriends = friends.filter(f =>
    f && (f.displayName || f.username || "").toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Bạn bè & Kết nối</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-tabs">
          {TABS.map(t => (
            <button key={t} className={`modal-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {TAB_LABELS[t]}
              {t === "requests" && received.length > 0 && (
                <span style={{ marginLeft: 4, background: "var(--danger)", color: "white", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{received.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {actionMsg && (
            <div style={{ background: "rgba(34,211,166,0.1)", border: "1px solid rgba(34,211,166,0.3)", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "var(--success)", marginBottom: 4 }}>
              {actionMsg}
            </div>
          )}

          {tab === "friends" && (
            <>
              <div className="modal-search">
                <Search size={14} color="var(--text-muted)" />
                <input placeholder="Tìm trong danh sách bạn bè..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
              </div>
              {isLoadingFriends ? (
                <div className="empty-state"><span className="spinner" /></div>
              ) : filteredFriends.length === 0 ? (
                <div className="empty-state">
                  <Users size={36} style={{ opacity: 0.4 }} />
                  <p>Chưa có bạn bè nào</p>
                  <p style={{ fontSize: 12 }}>Tìm kiếm để thêm bạn mới!</p>
                </div>
              ) : (
                filteredFriends.map(f => (
                  <div key={f._id} className="user-item">
                    <UserAvatar user={f} />
                    <div className="user-info">
                      <div className="user-name">{f.displayName || f.username}</div>
                      <div className="user-sub">@{f.username || ""}</div>
                    </div>
                    <div className="user-actions">
                      <button className="btn-sm btn-sm-primary" onClick={() => handleOpenChat(f._id)}>
                        Nhắn tin
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {tab === "requests" && (
            <>
              {received.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", padding: "4px 0 8px" }}>
                    Lời mời nhận được ({received.length})
                  </div>
                  {received.map(req => (
                    <div key={req._id} className="user-item">
                      <UserAvatar user={req.from} />
                      <div className="user-info">
                        <div className="user-name">{req.from?.displayName || req.from?.username}</div>
                        <div className="user-sub">{req.message || "Muốn kết bạn với bạn"}</div>
                      </div>
                      <div className="user-actions">
                        <button className="btn-sm btn-sm-primary" onClick={() => handleAccept(req._id)}><UserCheck size={13} /></button>
                        <button className="btn-sm btn-sm-danger" onClick={() => handleDecline(req._id)}><UserX size={13} /></button>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {sent.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", padding: "12px 0 8px" }}>
                    Đã gửi ({sent.length})
                  </div>
                  {sent.map(req => (
                    <div key={req._id} className="user-item">
                      <UserAvatar user={req.to} />
                      <div className="user-info">
                        <div className="user-name">{req.to?.displayName || req.to?.username}</div>
                        <div className="user-sub">Đang chờ phản hồi</div>
                      </div>
                      <div className="user-actions">
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}><Clock size={12} /> Đang chờ</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {received.length === 0 && sent.length === 0 && (
                <div className="empty-state">
                  <UserPlus size={36} style={{ opacity: 0.4 }} />
                  <p>Không có lời mời kết bạn nào</p>
                </div>
              )}
            </>
          )}

          {tab === "search" && (
            <>
              <div className="modal-search" style={{ marginBottom: 8 }}>
                <Search size={14} color="var(--text-muted)" />
                <input
                  placeholder="Nhập username hoặc email..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                />
                <button className="btn-sm btn-sm-primary" onClick={handleSearch} disabled={searching}>
                  {searching ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "Tìm"}
                </button>
              </div>
              {searchResult && !searchResult.error && (
                <div className="user-item">
                  <UserAvatar user={searchResult} />
                  <div className="user-info">
                    <div className="user-name">{searchResult.displayName}</div>
                    <div className="user-sub">@{searchResult.username} / {searchResult.email}</div>
                  </div>
                  <div className="user-actions">
                    <button className="btn-sm btn-sm-primary" onClick={() => handleSendRequest(searchResult._id)}>
                      <UserPlus size={13} /> Kết bạn
                    </button>
                  </div>
                </div>
              )}
              {searchResult?.error && (
                <div className="empty-state" style={{ color: "var(--danger)" }}>{searchResult.error}</div>
              )}
              {!searchResult && (
                <div className="empty-state">
                  <Search size={36} style={{ opacity: 0.4 }} />
                  <p>Nhập username hoặc email để tìm người dùng</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
