import { MessageSquare, Sparkles } from "lucide-react";

export default function NoChatSelected() {
  return (
    <div className="chat-main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="no-chat">
        <div className="no-chat-icon">
          <MessageSquare size={48} color="var(--accent)" />
        </div>
        <h2>Chào mừng đến ChatSync</h2>
        <p>Chọn một cuộc trò chuyện để bắt đầu nhắn tin</p>
        <p style={{ fontSize: 13 }}>hoặc thêm bạn bè để bắt đầu kết nối 💬</p>
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 12 }}>
          <Sparkles size={12} color="var(--accent)" />
          <span>Hỗ trợ chat nhóm, gửi ảnh, emoji và nhiều hơn nữa</span>
        </div>
      </div>
    </div>
  );
}
