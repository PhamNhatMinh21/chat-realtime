import { useState, useEffect } from "react";
import { X, Image as ImageIcon, Trash2, Globe } from "lucide-react";
import { usePostStore } from "../store/usePostStore";
import { useAuthStore } from "../store/useAuthStore";

import { BASE_URL } from "../lib/config";

function Avatar({ user, size = 40 }) {
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

export default function CreatePostModal({ onClose }) {
  const { createPost, isLoading } = usePostStore();
  const { authUser } = useAuthStore();

  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Chỉ được chọn file hình ảnh!");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview("");
    }
  };

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !imageFile) {
      alert("Vui lòng viết nội dung hoặc chọn ảnh để đăng!");
      return;
    }

    const formData = new FormData();
    if (content.trim()) {
      formData.append("content", content.trim());
    }
    if (imageFile) {
      formData.append("image", imageFile);
    }

    const res = await createPost(formData);
    if (res.success) {
      onClose();
    } else {
      alert(res.message || "Không thể đăng bài viết");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 520, maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h2>Tạo bài viết mới</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div className="modal-body" style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <Avatar user={authUser} size={44} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>
                  {authUser?.displayName || authUser?.username}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  <Globe size={12} />
                  <span>Bạn bè</span>
                </div>
              </div>
            </div>

            <textarea
              placeholder="Bạn đang nghĩ gì thế?..."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                borderRadius: "12px",
                outline: "none",
                resize: "none",
                fontSize: 15,
                padding: "12px 16px",
                lineHeight: 1.5,
                color: "var(--text-primary)",
                fontFamily: "inherit",
                transition: "border-color 0.2s"
              }}
              autoFocus
            />

            {imagePreview && (
              <div style={{ position: "relative", marginTop: 12, borderRadius: 8, overflow: "hidden", border: "1px solid var(--glass-border)" }}>
                <img
                  src={imagePreview}
                  alt="Ảnh bài đăng"
                  style={{ width: "100%", maxHeight: 350, objectFit: "contain", display: "block", background: "rgba(0,0,0,0.05)" }}
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: "rgba(0,0,0,0.6)",
                    border: "none",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "white",
                    transition: "background 0.2s"
                  }}
                  onMouseOver={e => e.currentTarget.style.background = "var(--danger)"}
                  onMouseOut={e => e.currentTarget.style.background = "rgba(0,0,0,0.6)"}
                >
                  <Trash2 size={16} style={{ margin: "auto" }} />
                </button>
              </div>
            )}
          </div>

          <div style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--glass-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0
          }}>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 18px",
              borderRadius: "var(--radius-full)",
              background: "var(--glass-bg-hover)",
              border: "1px solid var(--glass-border)",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              transition: "all 0.2s"
            }}>
              <ImageIcon size={18} color="var(--success)" />
              <span>Ảnh</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
            </label>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || (!content.trim() && !imageFile)}
              style={{ padding: "8px 24px", minWidth: 100, justifyContent: "center" }}
            >
              {isLoading ? <span className="spinner" /> : "Đăng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
