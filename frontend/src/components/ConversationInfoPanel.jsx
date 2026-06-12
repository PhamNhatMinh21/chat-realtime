import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X, Users, Image, FileText, Edit3, Check, Camera,
  Download, ChevronDown, ChevronRight, Crown, LogOut, UserMinus, Eye, EyeOff
} from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { useSocketStore } from "../store/useSocketStore";
import { axiosInstance } from "../lib/axios";

import { BASE_URL } from "../lib/config";

function downloadFile(fileUrl, filename) {
  const storedFilename = fileUrl.split("/uploads/").pop();
  const displayName = filename || storedFilename;
  const downloadUrl =
    `${BASE_URL}/api/download?file=${encodeURIComponent(storedFilename)}&name=${encodeURIComponent(displayName)}`;
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = displayName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function Avatar({ user, size = 50 }) {
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

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Section({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="info-section">
      <button className="info-section-header" onClick={() => setOpen(!open)}>
        {icon}
        <span>{title}</span>
        {open ? <ChevronDown size={15} style={{ marginLeft: "auto", color: "var(--text-muted)" }} />
          : <ChevronRight size={15} style={{ marginLeft: "auto", color: "var(--text-muted)" }} />}
      </button>
      {open && <div className="info-section-body">{children}</div>}
    </div>
  );
}

function Lightbox({ src, filename, onClose }) {
  return createPortal(
    <div className="img-lightbox-overlay" onClick={onClose}>
      <img src={src} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }} />
      <button
        onClick={e => { e.stopPropagation(); downloadFile(src, filename); }}
        style={{ position: "fixed", top: 20, right: 20, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "9px 18px", color: "white", fontSize: 14, display: "flex", alignItems: "center", gap: 7, cursor: "pointer", zIndex: 10000 }}
      >
        <Download size={15} /> Tải về
      </button>
    </div>,
    document.body
  );
}

const dangerBtnStyle = {
  display: "flex", alignItems: "center", gap: 10, width: "100%",
  padding: "10px 14px", borderRadius: 10, cursor: "pointer",
  background: "rgba(255,79,106,0.06)", border: "1px solid rgba(255,79,106,0.18)",
  color: "var(--danger)", fontSize: 14, fontWeight: 500, transition: "var(--transition)"
};

export default function ConversationInfoPanel({ conversation, onClose }) {
  const { authUser, updateProfile } = useAuthStore();
  const { messages, getConversations, setSelectedConversation, deleteConversation } = useChatStore();
  const { readReceiptsEnabled, toggleReadReceipts } = useSettingsStore();
  const { socket } = useSocketStore();

  const handleToggleActiveStatus = async () => {
    // Đảo ngược trạng thái hoạt động cục bộ, cập nhật DB và phát sự kiện realtime qua Socket
    const nextVal = !authUser?.hideActiveStatus;
    await updateProfile({ hideActiveStatus: nextVal });
    if (socket) {
      socket.emit("toggle_active_status", { hideActiveStatus: nextVal });
    }
  };

  const [lightbox, setLightbox] = useState(null);
  const [editName, setEditName] = useState(false);
  const [nameInput, setNameInput] = useState(conversation?.group?.name || "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localGroupAvatarUrl, setLocalGroupAvatarUrl] = useState(conversation?.group?.avatarUrl || null);
  const [localGroupName, setLocalGroupName] = useState(conversation?.group?.name || "");
  const [statusMsg, setStatusMsg] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const groupAvatarRef = useRef(null);

  const isGroup = conversation?.type === "group";
  const partner = !isGroup
    ? conversation?.participants?.find(p => String(p._id) !== String(authUser?._id))
    : null;

  const displayName = isGroup ? localGroupName : (partner?.displayName || partner?.username || "Unknown");

  const sharedImages = messages.filter(m =>
    !m.isRecalled && m.fileUrl && (m.fileType?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(m.fileUrl))
  );
  const sharedFiles = messages.filter(m =>
    !m.isRecalled && m.fileUrl && !m.fileType?.startsWith("image/") && !/\.(jpg|jpeg|png|gif|webp)$/i.test(m.fileUrl)
  );

  const showStatus = (msg, isError = false) => {
    setStatusMsg({ text: msg, error: isError });
    setTimeout(() => setStatusMsg(""), 3000);
  };

  // Cập nhật tên nhóm mới
  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    try {
      await axiosInstance.put(`/conversations/${conversation._id}`, { name: nameInput.trim() });
      setLocalGroupName(nameInput.trim());
      setEditName(false);
      showStatus("✓ Đã đổi tên nhóm");
      await getConversations(); // Tải lại danh sách cuộc trò chuyện để đồng bộ thanh Sidebar
    } catch (err) {
      showStatus(err.response?.data?.message || "Không thể đổi tên nhóm", true);
    } finally {
      setSaving(false);
    }
  };

  // Cập nhật ảnh đại diện nhóm mới
  const handleGroupAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return showStatus("Chỉ hỗ trợ file ảnh", true);
    if (file.size > 5 * 1024 * 1024) return showStatus("Ảnh tối đa 5MB", true);
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await axiosInstance.post(`/conversations/${conversation._id}/avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const newAvatarUrl = res.data.conversation?.group?.avatarUrl;
      if (newAvatarUrl) setLocalGroupAvatarUrl(newAvatarUrl);
      showStatus("✓ Đã đổi ảnh nhóm");
      await getConversations(); // Tải lại danh sách cuộc trò chuyện
    } catch (err) {
      showStatus(err.response?.data?.message || "Không thể đổi ảnh nhóm", true);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Rời nhóm chat hiện tại
  const handleLeaveGroup = async () => {
    setActionLoading(true);
    try {
      await axiosInstance.delete(`/conversations/${conversation._id}/leave`);
      await getConversations();
      setSelectedConversation(null); // Bỏ chọn cuộc trò chuyện hiện tại
      onClose();
    } catch (err) {
      showStatus(err.response?.data?.message || "Không thể rời nhóm", true);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  // Giải tán nhóm hoặc Xóa đoạn hội thoại direct
  const handleDeleteConversation = async () => {
    setActionLoading(true);
    const res = await deleteConversation(conversation._id);
    if (res.success) {
      setSelectedConversation(null);
      onClose();
    } else {
      showStatus("Không thể xóa cuộc trò chuyện", true);
    }
    setActionLoading(false);
    setConfirmAction(null);
  };

  // Hủy kết bạn với người dùng đang nhắn tin trực tiếp
  const handleRemoveFriend = async () => {
    if (!partner?._id) return;
    setActionLoading(true);
    try {
      await axiosInstance.delete(`/friends/${partner._id}`);
      await getConversations();
      setSelectedConversation(null);
      onClose();
    } catch (err) {
      showStatus(err.response?.data?.message || "Không thể xóa bạn", true);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  return (
    <>
      {lightbox && <Lightbox src={lightbox.src} filename={lightbox.filename} onClose={() => setLightbox(null)} />}

      {confirmAction && createPortal(
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="modal" style={{ maxWidth: 360, width: "90vw", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{confirmAction.label}</h3>
              <button className="btn-icon" onClick={() => setConfirmAction(null)}><X size={18} /></button>
            </div>
            <div style={{ padding: "16px 20px 20px", color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.5 }}>
              {confirmAction.type === "leave"
                ? "Bạn sẽ không thể xem tin nhắn nhóm sau khi rời đi. Xác nhận rời nhóm?"
                : confirmAction.type === "delete"
                  ? "Hành động này sẽ giải tán nhóm (nếu là nhóm chat) và XÓA VĨNH VIỄN toàn bộ tin nhắn, tài liệu, lịch hẹn của mọi người. Không thể hoàn tác. Xác nhận?"
                  : `Bạn có chắc muốn xóa ${partner?.displayName || "người dùng này"} khỏi danh sách bạn bè?`}
            </div>
            <div style={{ display: "flex", gap: 12, padding: "0 20px 20px", justifyContent: "space-between" }}>
              <button className="btn btn-secondary" onClick={() => setConfirmAction(null)} style={{ padding: "8px 16px", borderRadius: 10, fontSize: 14, flex: 1, justifyContent: "center" }}>
                Hủy
              </button>
              <button
                className="btn btn-danger"
                onClick={
                  confirmAction.type === "leave"
                    ? handleLeaveGroup
                    : confirmAction.type === "delete"
                      ? handleDeleteConversation
                      : handleRemoveFriend
                }
                disabled={actionLoading}
                style={{ padding: "8px 16px", borderRadius: 10, fontSize: 14, background: "var(--danger)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flex: 1 }}
              >
                {actionLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
                {confirmAction.type === "leave"
                  ? "Rời nhóm"
                  : confirmAction.type === "delete"
                    ? "Xóa vĩnh viễn"
                    : "Xóa bạn"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="info-panel">
        <div className="info-panel-header">
          <h3>Thông tin {isGroup ? "nhóm" : "liên hệ"}</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="info-panel-body custom-scrollbar">
          {statusMsg && (
            <div style={{
              margin: "8px 12px 0",
              background: statusMsg.error ? "rgba(255,79,106,0.1)" : "rgba(34,211,166,0.1)",
              border: `1px solid ${statusMsg.error ? "rgba(255,79,106,0.3)" : "rgba(34,211,166,0.3)"}`,
              borderRadius: 10, padding: "8px 12px", fontSize: 13,
              color: statusMsg.error ? "var(--danger)" : "var(--success)"
            }}>
              {statusMsg.text}
            </div>
          )}

          <div className="info-panel-avatar-section">
            {isGroup ? (
              <>
                <input ref={groupAvatarRef} type="file" accept="image/*" hidden onChange={handleGroupAvatarChange} />
                <div className="info-avatar-wrap" onClick={() => groupAvatarRef.current?.click()}
                  style={{ cursor: "pointer", marginBottom: 8 }} title="Nhấn để đổi ảnh nhóm">
                  {localGroupAvatarUrl ? (
                    <img src={`${BASE_URL}${localGroupAvatarUrl}?t=${Date.now()}`} alt={displayName}
                      style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--accent-gradient)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "white" }}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg-primary)" }}>
                    {uploadingAvatar ? <span className="spinner" style={{ width: 11, height: 11 }} /> : <Camera size={12} color="white" />}
                  </div>
                </div>

                {editName ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                    <input value={nameInput} onChange={e => setNameInput(e.target.value)} autoFocus
                      onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditName(false); }}
                      style={{ background: "var(--glass-bg)", border: "1px solid var(--accent)", borderRadius: 8, padding: "5px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none", width: 160 }} />
                    <button className="btn-icon" onClick={handleSaveName} disabled={saving} style={{ width: 28, height: 28, color: "var(--success)" }}>
                      {saving ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Check size={15} />}
                    </button>
                    <button className="btn-icon" onClick={() => setEditName(false)} style={{ width: 28, height: 28, color: "var(--danger)" }}><X size={15} /></button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{displayName}</span>
                    <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={() => { setNameInput(localGroupName); setEditName(true); }}>
                      <Edit3 size={13} />
                    </button>
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <Users size={11} /> {conversation?.participants?.length || 0} thành viên
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  <Camera size={10} style={{ display: "inline", marginRight: 3 }} /> Nhấn vào ảnh để đổi
                </div>
              </>
            ) : (
              <>
                <Avatar user={partner} size={72} />
                <div style={{ fontWeight: 700, fontSize: 16, marginTop: 8 }}>{displayName}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>@{partner?.username || ""}</div>
              </>
            )}
          </div>

          {isGroup && (
            <Section title="Thành viên" icon={<Users size={15} color="var(--accent)" />}>
              {conversation?.participants?.filter(Boolean).map(p => (
                <div key={p._id} className="info-member-item">
                  <Avatar user={p} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{p.displayName || p.username}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>@{p.username}</div>
                  </div>
                  {String(p._id) === String(conversation?.group?.createBy || conversation?.createdBy) && (
                    <Crown size={14} color="#F59E0B" title="Quản trị viên" />
                  )}
                </div>
              ))}
            </Section>
          )}

          <Section title={`Ảnh (${sharedImages.length})`} icon={<Image size={15} color="var(--accent)" />} defaultOpen={sharedImages.length > 0}>
            {sharedImages.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "12px 0" }}>Chưa có ảnh</div>
            ) : (
              <div className="info-media-grid">
                {sharedImages.map(m => (
                  <div key={m._id} className="info-media-thumb"
                    onClick={() => setLightbox({ src: `${BASE_URL}${m.fileUrl}`, filename: m.fileName })}>
                    <img src={`${BASE_URL}${m.fileUrl}`} alt={m.fileName || "ảnh"} />
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`File (${sharedFiles.length})`} icon={<FileText size={15} color="var(--accent)" />} defaultOpen={sharedFiles.length > 0}>
            {sharedFiles.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "12px 0" }}>Chưa có file</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {sharedFiles.map(m => (
                  <div key={m._id} className="info-file-item">
                    <FileText size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.fileName || "File"}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatFileSize(m.fileSize)}</div>
                    </div>
                    <button className="btn-icon" style={{ color: "var(--accent)", background: "rgba(124,106,255,0.1)", borderRadius: "50%", width: 30, height: 30 }}
                      onClick={() => downloadFile(`${BASE_URL}${m.fileUrl}`, m.fileName)} title="Tải về">
                      <Download size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Cài đặt" icon={readReceiptsEnabled ? <Eye size={15} color="var(--accent)" /> : <EyeOff size={15} color="var(--text-muted)" />} defaultOpen={false}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "6px 2px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Xác nhận đã xem</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Hiển thị khi bạn đã đọc tin nhắn</div>
                </div>
                <button
                  onClick={toggleReadReceipts}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                    background: readReceiptsEnabled ? "var(--accent)" : "var(--glass-bg)",
                    position: "relative", transition: "background 0.3s", flexShrink: 0
                  }}
                >
                  <span style={{
                    position: "absolute", top: 2, left: readReceiptsEnabled ? 22 : 2,
                    width: 20, height: 20, borderRadius: "50%", background: "white",
                    transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
                  }} />
                </button>
              </div>

              <div style={{ height: 1, background: "var(--glass-border)" }} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Ẩn trạng thái hoạt động</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Không cho người khác thấy bạn online</div>
                </div>
                <button
                  onClick={handleToggleActiveStatus}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                    background: authUser?.hideActiveStatus ? "var(--accent)" : "var(--glass-bg)",
                    position: "relative", transition: "background 0.3s", flexShrink: 0
                  }}
                >
                  <span style={{
                    position: "absolute", top: 2, left: authUser?.hideActiveStatus ? 22 : 2,
                    width: 20, height: 20, borderRadius: "50%", background: "white",
                    transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
                  }} />
                </button>
              </div>
            </div>
          </Section>

          <div style={{ padding: "12px 16px", marginTop: 4, display: "flex", flexDirection: "column", gap: 8 }}>
            {isGroup ? (
              <>
                <button style={dangerBtnStyle}
                  onClick={() => setConfirmAction({ type: "leave", label: "Rời nhóm" })}>
                  <LogOut size={16} /> Rời nhóm
                </button>
                {String(conversation?.group?.createBy || conversation?.createdBy) === String(authUser?._id) && (
                  <button style={dangerBtnStyle}
                    onClick={() => setConfirmAction({ type: "delete", label: "Xóa & Giải tán nhóm" })}>
                    <UserMinus size={16} /> Xóa nhóm chat
                  </button>
                )}
              </>
            ) : (
              <>
                <button style={dangerBtnStyle}
                  onClick={() => setConfirmAction({ type: "unfriend", label: "Xóa bạn bè" })}>
                  <UserMinus size={16} /> Xóa bạn bè
                </button>
                <button style={dangerBtnStyle}
                  onClick={() => setConfirmAction({ type: "delete", label: "Xóa cuộc trò chuyện" })}>
                  <LogOut size={16} style={{ transform: "scaleX(-1)" }} /> Xóa đoạn chat
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
