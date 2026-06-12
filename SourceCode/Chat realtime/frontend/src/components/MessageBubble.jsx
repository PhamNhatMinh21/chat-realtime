import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Smile, CornerUpRight, RotateCcw, Flag, Copy, Download, Edit2, Check, X as CloseIcon, Eye, ShieldAlert } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useTaskStore } from "../store/useTaskStore";
import { QUICK_EMOJIS } from "./EmojiPicker";
import ForwardModal from "./ForwardModal";

// Nhập các component con đã được tách ra để làm ngắn và gọn gàng mã nguồn
import ImageLightbox from "./ImageLightbox";
import TaskCard from "./TaskCard";

// Nhập các hàm bổ trợ file đã được tối ưu hóa
import { downloadFile, formatFileSize, FileIcon } from "../lib/fileHelpers";

import { BASE_URL } from "../lib/config";

// Component Hiển thị Ảnh đại diện (Avatar)
function Avatar({ user, size = 30 }) {
  const name = user?.displayName || user?.username || "?";
  if (user?.avatarUrl) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
        <img src={`${BASE_URL}${user.avatarUrl}`} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--accent-gradient)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 700, color: "white", flexShrink: 0 }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// MESSAGE BUBBLE COMPONENT - BONG BÓNG TIN NHẮN CHÍNH
export default function MessageBubble({ message, isOwn, sender, showAvatar, isGroup }) {
  // Lấy các state và hàm từ Zustand để xử lý tin nhắn
  const { recallMessage, addReaction, setReplyingToMessage } = useChatStore();
  const { authUser } = useAuthStore();
  const { updateStatus } = useTaskStore();

  // Các state cục bộ quản lý giao diện
  const [completing, setCompleting] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showQuickReact, setShowQuickReact] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || "");
  const [revealed, setRevealed] = useState(false); // Trạng thái hiển thị tin nhắn nhạy cảm (AI ẩn)

  const editInputRef = useRef(null);

  // Tự động khôi phục ẩn tin nhắn nhạy cảm khi nội dung thay đổi
  useEffect(() => {
    setRevealed(false);
  }, [message.content, message.isToxic]);

  // Tự động focus vào ô nhập liệu khi người dùng bấm Chỉnh sửa tin nhắn
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [isEditing]);

  // Định dạng thời hạn công việc (Format Task Time)
  const formatTaskTime = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Xử lý khi nhấn nút Hoàn thành công việc nhóm
  const handleCompleteTask = async (taskId) => {
    if (completing) return;
    setCompleting(true);
    try {
      await updateStatus(taskId, "done");
    } catch (e) {
      console.error(e);
    } finally {
      setCompleting(false);
    }
  };

  const hideTimer = useRef(null);

  const handleMouseEnter = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowActions(true);
  };

  const handleMouseLeave = () => {
    hideTimer.current = setTimeout(() => {
      setShowActions(false);
      setShowMoreMenu(false);
      setShowQuickReact(false);
    }, 600);
  };

  // Render nội dung Văn bản của tin nhắn (Kiểm duyệt AI tự động làm mờ)
  const renderMessageText = (content) => {
    if (message.isToxic && !revealed) {
      return (
        <div
          onClick={(e) => { e.stopPropagation(); setRevealed(true); }}
          style={{
            display: "flex", alignItems: "center", gap: "8px", cursor: "pointer",
            padding: "10px 14px", borderRadius: "18px",
            background: isOwn ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
            border: "1px dashed #ef4444", color: isOwn ? "#fca5a5" : "#ef4444",
            fontStyle: "italic", fontSize: "13.5px", userSelect: "none",
            transition: "all 0.2s ease", alignSelf: isOwn ? "flex-end" : "flex-start",
            maxWidth: "100%", boxShadow: "0 2px 8px rgba(239, 68, 68, 0.1)"
          }}
          onMouseOver={e => { e.currentTarget.style.background = isOwn ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.2)"; }}
          onMouseOut={e => { e.currentTarget.style.background = isOwn ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)"; }}
          title="Nhấp để hiển thị nội dung"
        >
          <Eye size={15} style={{ flexShrink: 0 }} />
          <span>Tin nhắn nhạy cảm. Nhấp để xem.</span>
        </div>
      );
    }

    return (
      <div
        className="msg-bubble"
        style={message.isToxic ? {
          border: isOwn ? "1px dashed rgba(255, 255, 255, 0.5)" : "1px dashed rgba(239, 68, 68, 0.5)",
          background: isOwn ? "var(--accent-gradient)" : "rgba(239, 68, 68, 0.08)",
          color: isOwn ? "#fff" : "inherit"
        } : {}}
      >
        {content}
        {message.isEdited && <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>(đã chỉnh sửa)</span>}
        {message.isToxic && (
          <span style={{ fontSize: 9, color: isOwn ? "rgba(255, 255, 255, 0.8)" : "#ef4444", marginLeft: 8, fontStyle: "italic", display: "inline-flex", alignItems: "center", gap: 2 }}>
            <ShieldAlert size={10} />(nhạy cảm)
          </span>
        )}
      </div>
    );
  };

  const isImage = message.fileType?.startsWith("image/") || message.fileUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isAudio = message.fileType?.startsWith("audio/") || message.fileUrl?.match(/\.(mp3|wav|ogg|webm)$/i);
  const isFile = message.fileUrl && !isImage && !isAudio;
  const recalled = message.isRecalled;
  const fileUrl = message.fileUrl ? `${BASE_URL}${message.fileUrl}` : null;

  const handleReaction = async (emoji) => {
    await addReaction(message._id, emoji);
    setShowQuickReact(false);
  };

  const handleRecall = async () => {
    if (window.confirm("Thu hồi tin nhắn này?")) await recallMessage(message._id);
    setShowMoreMenu(false);
  };

  const handleEditSave = async () => {
    if (editContent.trim() && editContent.trim() !== message.content) {
      await useChatStore.getState().editMessage(message._id, editContent);
    }
    setIsEditing(false);
  };

  const formattedTime = new Date(message.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const reactionGroups = (message.reactions || []).reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {});
  const isSystemTask = message.type === "system_task";

  return (
    <>
      {/* Lightbox xem ảnh to */}
      {lightbox && <ImageLightbox src={lightbox} filename={message.fileName} onClose={() => setLightbox(null)} />}

      {/* Modal chuyển tiếp tin nhắn */}
      {showForwardModal && <ForwardModal message={message} onClose={() => setShowForwardModal(false)} />}

      <div
        className={`msg-row ${isSystemTask ? "system-task" : isOwn ? "own" : "other"}`}
        style={isSystemTask ? {
          alignSelf: "center", maxWidth: "85%", display: "flex", position: "relative",
          justifyContent: "center", width: "100%", flexDirection: "column", alignItems: "center", margin: "16px 0"
        } : {}}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {!isSystemTask && !isOwn && showAvatar && <div className="msg-sender-avatar"><Avatar user={sender} size={30} /></div>}
        {!isSystemTask && !isOwn && !showAvatar && <div style={{ width: 30, flexShrink: 0 }} />}

        <div className="msg-bubble-wrap" style={isSystemTask ? { width: "100%", maxWidth: "480px" } : {}}>
          {!isSystemTask && !isOwn && showAvatar && isGroup && (
            <span className="msg-sender-name">{sender?.displayName || "Unknown"}</span>
          )}

          {/* Render trích dẫn khi Trả lời tin nhắn */}
          {message.replyTo && !recalled && !isSystemTask && (
            <div className="msg-reply-quote" onClick={() => {
              const el = document.getElementById(`msg-${message.replyTo._id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }} style={{
              background: "rgba(255,255,255,0.05)", borderLeft: "3px solid var(--accent)",
              padding: "6px 10px", borderRadius: "4px 8px 8px 4px", marginBottom: "4px",
              fontSize: "12px", color: "var(--text-muted)", cursor: "pointer",
              maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
            }}>
              <span style={{ fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 2 }}>
                Đang trả lời tin nhắn
              </span>
              {message.replyTo.content || "Đã gửi file"}
            </div>
          )}

          {/* Các trường hợp hiển thị tin nhắn: Thu hồi, Lịch hẹn (Task), Ảnh, Âm thanh, Tệp tin */}
          {recalled ? (
            <div className="msg-bubble recalled" style={isSystemTask ? { alignSelf: "center" } : {}}>
              <RotateCcw size={12} style={{ display: "inline", marginRight: 4 }} />
              Tin nhắn đã được thu hồi
            </div>
          ) : isSystemTask ? (
            // Nếu là công việc hệ thống -> sử dụng component con TaskCard đã tách rời
            typeof message.taskId !== "object" || !message.taskId ? (
              <div className="msg-system-task-bubble" style={{ alignSelf: "center" }}>
                <span style={{ fontSize: 15 }}>📋</span>
                <span>{message.content?.replace(/^📋 /, "") || message.content}</span>
              </div>
            ) : (
              <TaskCard
                task={message.taskId}
                authUser={authUser}
                completing={completing}
                handleCompleteTask={handleCompleteTask}
                formatTaskTime={formatTaskTime}
              />
            )
          ) : isImage ? (
            <div className="msg-image" onClick={() => setLightbox(fileUrl)} style={{ cursor: "zoom-in" }}>
              <img src={fileUrl} alt={message.fileName || "ảnh"} />
              {message.content && !message.content.startsWith("Đã gửi") && (
                <div style={{ padding: "6px 12px", fontSize: 14 }} onClick={(e) => e.stopPropagation()}>
                  {renderMessageText(message.content)}
                </div>
              )}
            </div>
          ) : isAudio ? (
            <div className="msg-audio" style={{ padding: "8px 12px", background: "rgba(255,255,255,0.06)", borderRadius: "18px", border: "1px solid var(--glass-border)" }}>
              <audio controls src={fileUrl} style={{ height: 36, width: 220, outline: "none", borderRadius: 20 }} />
              {message.content && !message.content.startsWith("Đã gửi") && (
                <div style={{ marginTop: 6, fontSize: 14 }}>
                  {renderMessageText(message.content)}
                </div>
              )}
            </div>
          ) : isFile ? (
            <div
              className="msg-file"
              onClick={() => downloadFile(fileUrl, message.fileName)}
              style={{ cursor: "pointer" }}
              title="Nhấn để tải về"
            >
              <FileIcon type={message.fileType} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="msg-file-name" style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                  {message.fileName || "File"}
                </div>
                <div className="msg-file-size">{formatFileSize(message.fileSize)}</div>
              </div>
              <div
                onClick={e => { e.stopPropagation(); downloadFile(fileUrl, message.fileName); }}
                style={{ padding: 7, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", background: "rgba(124,106,255,0.1)", cursor: "pointer" }}
                title="Tải về"
              >
                <Download size={15} />
              </div>
            </div>
          ) : isEditing ? (
            <div className="msg-bubble editing">
              <input
                ref={editInputRef}
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleEditSave(); else if (e.key === "Escape") setIsEditing(false); }}
                style={{ background: "transparent", border: "none", outline: "none", color: "inherit", width: "100%", fontSize: 14 }}
              />
              <div style={{ display: "flex", gap: 4, marginTop: 4, justifyContent: "flex-end" }}>
                <button onClick={() => setIsEditing(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><CloseIcon size={12} /></button>
                <button onClick={handleEditSave} style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer" }}><Check size={12} /></button>
              </div>
            </div>
          ) : (
            renderMessageText(message.content)
          )}

          {/* Tương tác cảm xúc thả Emoji */}
          {Object.keys(reactionGroups).length > 0 && !isSystemTask && (
            <div className="msg-reactions">
              {Object.entries(reactionGroups).map(([emoji, count]) => (
                <button key={emoji} className="reaction-chip" onClick={() => handleReaction(emoji)}>
                  {emoji} {count > 1 && <span>{count}</span>}
                </button>
              ))}
            </div>
          )}
          <span className="msg-time">{formattedTime}</span>
        </div>

        {/* Thanh công cụ hành động khi Hover chuột vào tin nhắn */}
        {showActions && !recalled && (
          <div
            className="msg-actions"
            style={{
              display: "flex",
              ...(isSystemTask ? { left: "calc(50% + 248px)", right: "auto", transform: "translateY(-50%)" } : {})
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {!isSystemTask && (
              <>
                <div style={{ position: "relative" }}>
                  <button className="msg-action-btn" onClick={() => setShowQuickReact(!showQuickReact)} title="React">
                    <Smile size={15} />
                  </button>
                  {showQuickReact && (
                    <div style={{
                      position: "absolute", bottom: "calc(100% + 6px)", [isOwn ? "right" : "left"]: 0,
                      display: "flex", gap: 4, background: "rgba(20,20,40,0.97)",
                      backdropFilter: "var(--blur)", border: "1px solid var(--glass-border)",
                      borderRadius: "var(--radius-full)", padding: "6px 8px",
                      boxShadow: "var(--shadow-md)", zIndex: 20,
                    }}>
                      {QUICK_EMOJIS.map(e => (
                        <button key={e} className="emoji-btn" style={{ width: 32, height: 32, fontSize: 18 }}
                          onClick={() => handleReaction(e)}>{e}</button>
                      ))}
                    </div>
                  )}
                </div>
                <button className="msg-action-btn" title="Chuyển tiếp" onClick={() => { setShowForwardModal(true); setShowMoreMenu(false); }}>
                  <CornerUpRight size={15} />
                </button>
              </>
            )}
            <div style={{ position: "relative" }}>
              <button className="msg-action-btn" onClick={() => setShowMoreMenu(!showMoreMenu)} title="Thêm">
                <MoreHorizontal size={15} />
              </button>
              {showMoreMenu && (
                <div className="msg-dropdown" style={{ bottom: "calc(100% + 4px)", top: "auto", ...(isSystemTask ? { left: 0, right: "auto" } : {}) }}>
                  {isSystemTask ? (
                    isOwn && (
                      <button className="msg-dropdown-item danger" onClick={handleRecall}>
                        <RotateCcw size={14} /> Thu hồi
                      </button>
                    )
                  ) : (
                    <>
                      {message.content && !message.content.startsWith("Đã gửi") && (
                        <button className="msg-dropdown-item" onClick={() => { navigator.clipboard.writeText(message.content); setShowMoreMenu(false); }}>
                          <Copy size={14} /> Sao chép
                        </button>
                      )}
                      <button className="msg-dropdown-item" onClick={() => { setReplyingToMessage(message); setShowMoreMenu(false); }}>
                        <CornerUpRight size={14} style={{ transform: "scaleX(-1)" }} /> Trả lời
                      </button>
                      {fileUrl && (
                        <button className="msg-dropdown-item" onClick={() => { downloadFile(fileUrl, message.fileName); setShowMoreMenu(false); }}>
                          <Download size={14} /> Tải xuống
                        </button>
                      )}
                      <button className="msg-dropdown-item" onClick={() => { setShowForwardModal(true); setShowMoreMenu(false); }}><CornerUpRight size={14} /> Chuyển tiếp</button>
                      {isOwn ? (
                        <>
                          {message.content && !message.content.startsWith("Đã gửi") && (
                            <button className="msg-dropdown-item" onClick={() => { setIsEditing(true); setShowMoreMenu(false); }}><Edit2 size={14} /> Chỉnh sửa</button>
                          )}
                          <button className="msg-dropdown-item danger" onClick={handleRecall}><RotateCcw size={14} /> Thu hồi</button>
                        </>
                      ) : (
                        <button className="msg-dropdown-item danger" onClick={() => setShowMoreMenu(false)}><Flag size={14} /> Báo cáo</button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
