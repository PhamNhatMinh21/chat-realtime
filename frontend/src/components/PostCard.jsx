import { useState, useRef, useEffect } from "react";
import { MessageSquare, Heart, Trash2, Send, CornerDownRight } from "lucide-react";
import { usePostStore } from "../store/usePostStore";
import { useAuthStore } from "../store/useAuthStore";

import { BASE_URL } from "../lib/config";

const EMOJI_MAP = {
  like: "👍",
  love: "❤️",
  haha: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😡"
};

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

function formatTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;

  if (diffMs < 0) return "Vừa xong";

  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return "Vừa xong";

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} phút trước`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "numeric",
    year: "numeric"
  });
}

export default function PostCard({ post }) {
  const { reactToPost, commentOnPost, deletePost, deleteComment } = usePostStore();
  const { authUser } = useAuthStore();

  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const enterTimeoutRef = useRef(null);
  const leaveTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (!showReactionPicker) {
      enterTimeoutRef.current = setTimeout(() => {
        setShowReactionPicker(true);
      }, 200);
    }
  };

  const handleMouseLeave = () => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setShowReactionPicker(false);
    }, 600);
  };

  const author = post.authorId;
  const isPostOwner = authUser && author && String(authUser._id) === String(author._id);

  const myReaction = authUser
    ? post.reactions.find(r => String(r.userId) === String(authUser._id))?.type
    : null;

  const reactionCounts = post.reactions.reduce((acc, current) => {
    acc[current.type] = (acc[current.type] || 0) + 1;
    return acc;
  }, {});

  const totalReactions = post.reactions.length;
  const topReactions = Object.keys(reactionCounts)
    .sort((a, b) => reactionCounts[b] - reactionCounts[a])
    .slice(0, 3);

  const handleDeletePost = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) {
      const res = await deletePost(post._id);
      if (!res.success) alert(res.message);
    }
  };

  const handleReact = async (type) => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    await reactToPost(post._id, type);
    setShowReactionPicker(false);
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;

    setSubmittingComment(true);
    const res = await commentOnPost(post._id, commentText.trim());
    if (res.success) {
      setCommentText("");
      setShowComments(true);
    } else {
      alert(res.message);
    }
    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm("Bạn có muốn xóa bình luận này?")) {
      const res = await deleteComment(post._id, commentId);
      if (!res.success) alert(res.message);
    }
  };

  return (
    <div className="post-card" style={{
      background: "var(--glass-bg)",
      border: "1px solid var(--glass-border)",
      borderRadius: "16px",
      padding: "16px",
      marginBottom: "16px",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      transition: "transform 0.2s, box-shadow 0.2s"
    }}>
      {/* Post Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Avatar user={author} size={40} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14.5, color: "var(--text-primary)" }}>
              {author?.displayName || author?.username}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {formatTimeAgo(post.createdAt)}
            </div>
          </div>
        </div>

        {/* Nút xóa post */}
        {isPostOwner && (
          <button
            className="btn-icon"
            onClick={handleDeletePost}
            style={{ color: "var(--text-muted)", padding: 6 }}
            onMouseOver={e => e.currentTarget.style.color = "var(--danger)"}
            onMouseOut={e => e.currentTarget.style.color = "var(--text-muted)"}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Nội dung Post */}
      {post.content && (
        <div style={{
          fontSize: 15,
          color: "var(--text-primary)",
          lineHeight: 1.5,
          marginBottom: "12px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word"
        }}>
          {post.content}
        </div>
      )}

      {/* Ảnh post */}
      {post.imageUrl && (
        <div style={{
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid var(--glass-border)",
          marginBottom: "12px",
          maxHeight: "450px"
        }}>
          <img
            src={`${BASE_URL}${post.imageUrl}`}
            alt="Nội dung bài viết"
            style={{
              width: "100%",
              height: "auto",
              maxHeight: "450px",
              objectFit: "contain",
              display: "block",
              background: "rgba(0,0,0,0.05)"
            }}
          />
        </div>
      )}

      {/* Thả cảm xúc và bình luận */}
      {(totalReactions > 0 || post.comments.length > 0) && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: "10px",
          borderBottom: "1px solid var(--glass-border)",
          fontSize: 13,
          color: "var(--text-muted)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {totalReactions > 0 && (
              <>
                <div style={{ display: "flex", gap: -2, marginRight: 2 }}>
                  {topReactions.map(type => (
                    <span key={type} style={{ fontSize: 14 }}>
                      {EMOJI_MAP[type]}
                    </span>
                  ))}
                </div>
                <span>
                  {myReaction
                    ? `Bạn và ${totalReactions - 1} người khác`
                    : `${totalReactions} lượt tương tác`
                  }
                </span>
              </>
            )}
          </div>

          {post.comments.length > 0 && (
            <button
              onClick={() => setShowComments(!showComments)}
              style={{
                background: "none",
                border: "none",
                fontSize: 13,
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 0
              }}
              onMouseOver={e => e.currentTarget.style.textDecoration = "underline"}
              onMouseOut={e => e.currentTarget.style.textDecoration = "none"}
            >
              {post.comments.length} bình luận
            </button>
          )}
        </div>
      )}

      <div style={{
        display: "flex",
        position: "relative",
        padding: "6px 0",
        borderBottom: showComments || post.comments.length > 0 ? "1px solid var(--glass-border)" : "none",
        gap: 8
      }}>
        <div
          style={{ position: "relative", flex: 1 }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            className="btn btn-secondary"
            style={{
              width: "100%",
              justifyContent: "center",
              gap: 8,
              border: "none",
              background: "transparent",
              color: myReaction ? "var(--accent)" : "var(--text-secondary)",
              fontWeight: myReaction ? 600 : 500,
              padding: "8px"
            }}
            onClick={() => handleReact(myReaction ? myReaction : "like")}
          >
            {myReaction ? (
              <span style={{ fontSize: 16 }}>{EMOJI_MAP[myReaction]}</span>
            ) : (
              <Heart size={18} />
            )}
            <span>{myReaction ? EMOJI_MAP[myReaction] === "👍" ? "Đã thích" : "Đã thả cảm xúc" : "Tương tác"}</span>
          </button>

          {showReactionPicker && (
            <div style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%) translateY(-8px)",
              background: "var(--glass-bg)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid var(--glass-border)",
              borderRadius: "30px",
              padding: "6px 12px",
              display: "flex",
              gap: 8,
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
              zIndex: 10,
              animation: "reaction-pop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            }}>
              {Object.entries(EMOJI_MAP).map(([type, emoji]) => (
                <button
                  key={type}
                  onClick={() => handleReact(type)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 24,
                    cursor: "pointer",
                    padding: 0,
                    transition: "transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = "scale(1.3) translateY(-4px)"}
                  onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
                  title={type.toUpperCase()}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="btn btn-secondary"
          style={{
            flex: 1,
            justifyContent: "center",
            gap: 8,
            border: "none",
            background: "transparent",
            color: "var(--text-secondary)",
            padding: "8px"
          }}
          onClick={() => setShowComments(!showComments)}
        >
          <MessageSquare size={18} />
          <span>Bình luận</span>
        </button>
      </div>

      {showComments && (
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: 12 }}>
          <form onSubmit={handleCommentSubmit} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Avatar user={authUser} size={30} />
            <div style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              background: "var(--glass-bg-hover)",
              border: "1px solid var(--glass-border)",
              borderRadius: "20px",
              padding: "4px 12px"
            }}>
              <input
                placeholder="Viết bình luận..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 13.5,
                  color: "var(--text-primary)",
                  padding: "6px 0"
                }}
              />
              <button
                type="submit"
                disabled={!commentText.trim() || submittingComment}
                style={{
                  background: "none",
                  border: "none",
                  cursor: commentText.trim() ? "pointer" : "default",
                  color: commentText.trim() ? "var(--accent)" : "var(--text-muted)",
                  padding: 4,
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {submittingComment ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Send size={15} />}
              </button>
            </div>
          </form>

          {post.comments.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              {post.comments.filter(Boolean).map(comment => {
                const isCommentOwner = authUser && comment.userId && String(authUser._id) === String(comment.userId._id || comment.userId);
                const canDelete = isPostOwner || isCommentOwner;

                return (
                  <div key={comment._id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <Avatar user={comment.userId} size={28} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <div style={{
                        background: "var(--glass-bg-hover)",
                        borderRadius: "14px",
                        padding: "8px 12px",
                        display: "inline-block",
                        width: "fit-content",
                        maxWidth: "100%",
                        border: "1px solid var(--glass-border-hover)"
                      }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", marginBottom: 2 }}>
                          {comment.userId?.displayName || comment.userId?.username || "Thành viên"}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-primary)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {comment.content}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 2, paddingLeft: 6 }}>
                        <span>{formatTimeAgo(comment.createdAt)}</span>
                        {canDelete && (
                          <>
                            <span>•</span>
                            <button
                              onClick={() => handleDeleteComment(comment._id)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--text-muted)",
                                padding: 0
                              }}
                              onMouseOver={e => e.currentTarget.style.color = "var(--danger)"}
                              onMouseOut={e => e.currentTarget.style.color = "var(--text-muted)"}
                            >
                              Xóa
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
