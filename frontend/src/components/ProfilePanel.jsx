import { useState, useRef } from "react";
import { X, Camera, Edit3, Check, LogOut, Upload } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";

import { BASE_URL } from "../lib/config";

export default function ProfilePanel({ onClose }) {
  const { authUser, updateProfile, logout, isUpdatingProfile, checkAuth } = useAuthStore();
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState(authUser?.displayName || "");
  const [username, setUsername] = useState(authUser?.username || "");
  const [bio, setBio] = useState(authUser?.bio || "");
  const [phone, setPhone] = useState(authUser?.phone || "");
  const [hometown, setHometown] = useState(authUser?.hometown || "");
  const [gender, setGender] = useState(authUser?.gender || "");
  const [dateOfBirth, setDateOfBirth] = useState(authUser?.dateOfBirth || "");
  const [message, setMessage] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("vi-VN");
      }
    } catch (e) { }
    return dateStr;
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMessage("Chỉ hỗ trợ file ảnh!");
    if (file.size > 5 * 1024 * 1024) return setMessage("Ảnh tối đa 5MB!");

    setUploadingAvatar(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      await axiosInstance.post("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await checkAuth();
      setMessage("✓ Đã cập nhật ảnh đại diện!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Không thể cập nhật ảnh");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    const result = await updateProfile({
      displayName: displayName.trim(),
      bio: bio.trim(),
      username: username.trim(),
      phone: phone.trim(),
      hometown: hometown.trim(),
      gender: gender,
      dateOfBirth: dateOfBirth
    });
    if (result.success) {
      setMessage("✓ Đã cập nhật thông tin!");
      setEditMode(false);
      setTimeout(() => setMessage(""), 3000);
    } else {
      setMessage(result.message || "Lỗi cập nhật");
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Bạn có chắc muốn đăng xuất?")) {
      await logout();
    }
  };

  const initial = (authUser?.displayName || authUser?.username || "?").charAt(0).toUpperCase();

  return (
    <div className="profile-panel-overlay" onClick={onClose}>
      <div className="profile-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="profile-panel-header">
          <h2>Hồ sơ cá nhân</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Avatar */}
        <div className="profile-avatar-section">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleAvatarChange}
          />
          <div
            className="profile-avatar-large"
            onClick={() => avatarInputRef.current?.click()}
            title="Nhấn để đổi ảnh đại diện"
            style={{ cursor: "pointer" }}
          >
            {authUser?.avatarUrl ? (
              <img src={`${BASE_URL}${authUser.avatarUrl}?t=${Date.now()}`} alt="avatar" />
            ) : (
              <div className="fallback">{initial}</div>
            )}
            <div className="profile-avatar-overlay">
              {uploadingAvatar ? (
                <span className="spinner" />
              ) : (
                <Camera size={24} color="white" />
              )}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="profile-display-name">{authUser?.displayName}</div>
            <div className="profile-username">@{authUser?.username}</div>
          </div>
          <div className="profile-status-badge">
            <span style={{ width: 7, height: 7, background: "var(--success)", borderRadius: "50%", display: "inline-block" }} />
            Đang hoạt động
          </div>

          <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
            <Camera size={11} style={{ display: "inline", marginRight: 3 }} />
            Nhấn vào ảnh để thay đổi
          </div>
        </div>

        {/* Info */}
        <div className="profile-info-section">
          {message && (
            <div style={{
              background: message.startsWith("✓") ? "rgba(34,211,166,0.1)" : "rgba(255,79,106,0.1)",
              border: `1px solid ${message.startsWith("✓") ? "rgba(34,211,166,0.3)" : "rgba(255,79,106,0.3)"}`,
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 13,
              color: message.startsWith("✓") ? "var(--success)" : "var(--danger)"
            }}>
              {message}
            </div>
          )}

          <div className="profile-field">
            <label>Tên hiển thị</label>
            {editMode ? (
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Tên hiển thị" />
            ) : (
              <div className="profile-field-value">{authUser?.displayName || "—"}</div>
            )}
          </div>

          <div className="profile-field">
            <label>Email</label>
            <div className="profile-field-value" style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              {authUser?.email || "—"}
            </div>
          </div>

          <div className="profile-field">
            <label>Username</label>
            {editMode ? (
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
            ) : (
              <div className="profile-field-value" style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                @{authUser?.username}
              </div>
            )}
          </div>

          <div className="profile-field">
            <label>Số điện thoại</label>
            {editMode ? (
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Số điện thoại" />
            ) : (
              <div className="profile-field-value">{authUser?.phone || "—"}</div>
            )}
          </div>

          <div className="profile-field">
            <label>Ngày sinh</label>
            {editMode ? (
              <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
            ) : (
              <div className="profile-field-value">{formatDate(authUser?.dateOfBirth)}</div>
            )}
          </div>

          <div className="profile-field">
            <label>Giới tính</label>
            {editMode ? (
              <select value={gender} onChange={e => setGender(e.target.value)}>
                <option value="">Chọn giới tính</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            ) : (
              <div className="profile-field-value">
                {authUser?.gender === "male" ? "Nam" : authUser?.gender === "female" ? "Nữ" : authUser?.gender === "other" ? "Khác" : "—"}
              </div>
            )}
          </div>

          <div className="profile-field">
            <label>Quê quán</label>
            {editMode ? (
              <input value={hometown} onChange={e => setHometown(e.target.value)} placeholder="Quê quán" />
            ) : (
              <div className="profile-field-value">{authUser?.hometown || "—"}</div>
            )}
          </div>

          <div className="profile-field">
            <label>Giới thiệu</label>
            {editMode ? (
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Giới thiệu bản thân..."
                rows={3}
              />
            ) : (
              <div className="profile-field-value" style={{ color: authUser?.bio ? "var(--text-primary)" : "var(--text-muted)", fontSize: 14, minHeight: 48 }}>
                {authUser?.bio || "Chưa có giới thiệu"}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="profile-panel-actions">
          {editMode ? (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setEditMode(false);
                  setDisplayName(authUser?.displayName || "");
                  setUsername(authUser?.username || "");
                  setPhone(authUser?.phone || "");
                  setHometown(authUser?.hometown || "");
                  setGender(authUser?.gender || "");
                  setDateOfBirth(authUser?.dateOfBirth || "");
                  setBio(authUser?.bio || "");
                }}
              >
                <X size={16} /> Hủy
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={isUpdatingProfile}>
                {isUpdatingProfile ? <span className="spinner" /> : <Check size={16} />}
                Lưu thay đổi
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setEditMode(true)}>
                <Edit3 size={16} /> Chỉnh sửa
              </button>
              <button className="btn btn-danger" onClick={handleLogout}>
                <LogOut size={16} /> Đăng xuất
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
