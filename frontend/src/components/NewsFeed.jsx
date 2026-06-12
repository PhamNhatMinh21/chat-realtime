import { useEffect, useState } from "react";
import { Newspaper, PenSquare, RefreshCw, AlertCircle } from "lucide-react";
import { usePostStore } from "../store/usePostStore";
import { useAuthStore } from "../store/useAuthStore";
import PostCard from "./PostCard";
import CreatePostModal from "./CreatePostModal";

import { BASE_URL } from "../lib/config";

function Avatar({ user, size = 36 }) {
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

export default function NewsFeed() {
  const { posts, getFeed, isLoading } = usePostStore();
  const { authUser } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState("all"); // "all" | "friends" | "mine"

  useEffect(() => {
    getFeed();
  }, []);

  const filteredPosts = posts.filter(post => {
    const authorId = post.authorId?._id || post.authorId;
    if (filter === "friends") {
      return String(authorId) !== String(authUser?._id);
    }
    if (filter === "mine") {
      return String(authorId) === String(authUser?._id);
    }
    return true;
  });

  return (
    <div className="news-feed-container" style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "var(--bg-primary)",
      overflow: "hidden"
    }}>
      <div style={{
        padding: "16px 24px",
        background: "var(--glass-bg)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--glass-border)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 5
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            background: "var(--accent-gradient)",
            color: "white",
            padding: 8,
            borderRadius: 10,
            display: "flex"
          }}>
            <Newspaper size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>Bản tin</h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0 0" }}>Cập nhật những khoảnh khắc mới nhất</p>
          </div>
        </div>

        <button
          className="btn-icon"
          onClick={() => getFeed()}
          disabled={isLoading}
          title="Tải lại bảng tin"
          style={{
            padding: 8,
            borderRadius: "50%",
            background: "var(--glass-bg-hover)",
            border: "1px solid var(--glass-border)",
            cursor: "pointer"
          }}
        >
          <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div style={{
        display: "flex",
        padding: "10px 24px",
        background: "var(--glass-bg)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--glass-border)",
        gap: 12,
        zIndex: 4
      }}>
        <button
          onClick={() => setFilter("all")}
          style={{
            background: filter === "all" ? "var(--glass-bg-active)" : "transparent",
            borderColor: filter === "all" ? "var(--accent)" : "var(--glass-border)",
            color: filter === "all" ? "var(--accent)" : "var(--text-secondary)",
            padding: "6px 16px",
            borderRadius: "20px",
            border: "1px solid",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 600,
            transition: "all 0.2s"
          }}
        >
          Tất cả bản tin
        </button>
        <button
          onClick={() => setFilter("mine")}
          style={{
            background: filter === "mine" ? "var(--glass-bg-active)" : "transparent",
            borderColor: filter === "mine" ? "var(--accent)" : "var(--glass-border)",
            color: filter === "mine" ? "var(--accent)" : "var(--text-secondary)",
            padding: "6px 16px",
            borderRadius: "20px",
            border: "1px solid",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 600,
            transition: "all 0.2s"
          }}
        >
          Bài đăng của tôi
        </button>
        <button
          onClick={() => setFilter("friends")}
          style={{
            background: filter === "friends" ? "var(--glass-bg-active)" : "transparent",
            borderColor: filter === "friends" ? "var(--accent)" : "var(--glass-border)",
            color: filter === "friends" ? "var(--accent)" : "var(--text-secondary)",
            padding: "6px 16px",
            borderRadius: "20px",
            border: "1px solid",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 600,
            transition: "all 0.2s"
          }}
        >
          Bài đăng của bạn bè
        </button>
      </div>

      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
        <div style={{ width: "100%", maxWidth: "600px" }}>

          <div
            onClick={() => setShowCreateModal(true)}
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              borderRadius: "16px",
              padding: "16px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
              transition: "transform 0.15s, border-color 0.15s"
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = "var(--glass-border-hover)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = "var(--glass-border)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Avatar user={authUser} size={40} />
            <div style={{
              flex: 1,
              background: "var(--glass-bg-hover)",
              border: "1px solid var(--glass-border)",
              borderRadius: "24px",
              padding: "10px 16px",
              color: "var(--text-muted)",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <span>Bạn đang nghĩ gì thế? Đăng bài ngay...</span>
              <PenSquare size={16} color="var(--accent)" />
            </div>
          </div>

          {isLoading && filteredPosts.length === 0 ? (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 0"
            }}>
              <span className="spinner" style={{ width: 36, height: 36 }} />
              <p style={{ marginTop: 12, color: "var(--text-muted)", fontSize: 14 }}>Đang tải bảng tin...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 24px",
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              borderRadius: "16px",
              textAlign: "center"
            }}>
              <Newspaper size={48} style={{ opacity: 0.3, marginBottom: 16, color: "var(--text-primary)" }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 8px 0" }}>
                {filter === "friends" ? "Chưa có bài đăng nào từ bạn bè" : filter === "mine" ? "Bạn chưa có bài đăng nào" : "Bản tin chưa có bài đăng nào"}
              </h3>
              <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0, maxWidth: "340px", lineHeight: 1.5 }}>
                {filter === "friends"
                  ? "Hãy kết thêm bạn bè và tương tác nhiều hơn để bắt đầu xem những cập nhật thú vị!"
                  : filter === "mine"
                    ? "Hãy chia sẻ những khoảnh khắc và suy nghĩ thú vị của bạn bằng cách đăng bài viết mới ngay nhé!"
                    : "Đăng bài viết mới hoặc kết thêm bạn bè để bắt đầu xem những cập nhật thú vị tại đây!"
                }
              </p>
            </div>
          ) : (
            filteredPosts.map(post => (
              <PostCard key={post._id} post={post} />
            ))
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreatePostModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
