import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Smile, Image, Paperclip, X, Mic, Square } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";
import { useChatStore } from "../store/useChatStore";
import { useSocketStore } from "../store/useSocketStore";
import { useAuthStore } from "../store/useAuthStore";

import { BASE_URL } from "../lib/config";

export default function MessageInput({ conversation }) {
  const { sendMessage, replyingToMessage, setReplyingToMessage } = useChatStore();
  const { emitTyping } = useSocketStore();
  const { authUser } = useAuthStore();

  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  const textareaRef = useRef(null);
  const fileRef = useRef(null);
  const imgRef = useRef(null);
  const typingTimer = useRef(null);
  const isTyping = useRef(false);

  const isGroup = conversation?.type === "group";
  const recipientId = !isGroup
    ? conversation?.participants?.find(p => p._id !== authUser?._id)?._id
    : null;

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; }
  }, [text]);

  const handleTyping = () => {
    if (!isTyping.current) {
      isTyping.current = true;
      emitTyping(conversation._id, true);
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
      emitTyping(conversation._id, false);
    }, 1500);
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview({ type: "image", url: ev.target.result, name: f.name });
      reader.readAsDataURL(f);
    } else {
      setFilePreview({ type: "file", name: f.name, size: f.size });
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const f = items[i].getAsFile();
        if (f) {
          setFile(f);
          const reader = new FileReader();
          reader.onload = (ev) => setFilePreview({ type: "image", url: ev.target.result, name: f.name });
          reader.readAsDataURL(f);
          e.preventDefault();
        }
        break;
      }
    }
  };

  const removeFile = () => { setFile(null); setFilePreview(null); if (fileRef.current) fileRef.current.value = ""; if (imgRef.current) imgRef.current.value = ""; };

  const handleSend = async () => {
    if ((!text.trim() && !file) || isSending) return;
    setIsSending(true);
    clearTimeout(typingTimer.current);
    isTyping.current = false;
    emitTyping(conversation._id, false);
    try {
      await sendMessage(conversation._id, {
        content: text.trim(),
        file,
        recipientId,
        isGroup,
        replyTo: replyingToMessage?._id,
      });
      setText("");
      removeFile();
      setReplyingToMessage(null);
      textareaRef.current?.focus();
    } catch (err) {
      alert("Không thể gửi tin nhắn. Vui lòng thử lại.");
    } finally {
      setIsSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "voice-message.webm", { type: "audio/webm" });
        setFile(audioFile);
        setFilePreview({ type: "file", name: "Tin nhắn thoại", size: audioFile.size });
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (error) {
      alert("Không thể truy cập microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="message-input-area">
      {replyingToMessage && (
        <div style={{
          padding: "8px 12px", background: "rgba(124, 106, 255, 0.08)", borderLeft: "4px solid var(--accent)",
          display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8,
          borderRadius: "0 8px 8px 0"
        }}>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 2 }}>
              Trả lời: {replyingToMessage.senderId?.displayName || "Ai đó"}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {replyingToMessage.content || "Đã gửi tệp"}
            </span>
          </div>
          <button
            onClick={() => setReplyingToMessage(null)}
            style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {filePreview && (
        <div className="file-preview">
          <div className="file-preview-item" style={filePreview.type === "file" ? { width: "auto", height: "auto", padding: "8px 12px", display: "flex", gap: 8, alignItems: "center" } : {}}>
            {filePreview.type === "image" ? (
              <img src={filePreview.url} alt="preview" />
            ) : (
              <>
                <Paperclip size={16} color="var(--accent)" />
                <span style={{ fontSize: 12, color: "var(--text-primary)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {filePreview.name}
                </span>
              </>
            )}
            <button className="file-preview-remove" onClick={removeFile} style={filePreview.type === "file" ? { position: "static", marginLeft: 4 } : {}}><X size={10} /></button>
          </div>
        </div>
      )}

      <div className="message-input-wrap">
        <div className="message-input-actions-left">
          <input ref={imgRef} type="file" accept="image/*,video/*" hidden onChange={handleFileChange} />
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.zip,.rar" hidden onChange={handleFileChange} />
          <button className="input-icon-btn" onClick={() => imgRef.current?.click()} title="Gửi ảnh">
            <Image size={20} />
          </button>
          <button className="input-icon-btn" onClick={() => fileRef.current?.click()} title="Gửi file">
            <Paperclip size={20} />
          </button>
        </div>

        {isRecording ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "0 10px", color: "var(--danger)" }}>
            <span className="typing-dots" style={{ filter: "hue-rotate(300deg)" }}><span /><span /><span /></span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>
              Đang ghi âm... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
            </span>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className="message-input"
            placeholder="Nhập tin nhắn..."
            value={text}
            onChange={e => { setText(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={1}
          />
        )}

        <div className="message-input-actions-right">
          {!isRecording && (
            <div style={{ position: "relative" }}>
              <button className="input-icon-btn" onClick={() => setShowEmoji(!showEmoji)} title="Emoji">
                <Smile size={20} />
              </button>
              {showEmoji && (
                <EmojiPicker
                  onSelect={(e) => { setText(t => t + e); textareaRef.current?.focus(); }}
                  onClose={() => setShowEmoji(false)}
                />
              )}
            </div>
          )}

          {isRecording ? (
            <button className="send-btn" onClick={stopRecording} style={{ background: "var(--danger)" }} title="Dừng ghi âm">
              <Square size={16} fill="white" />
            </button>
          ) : text.trim() || file ? (
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={isSending}
              title="Gửi (Enter)"
            >
              <Send size={16} />
            </button>
          ) : (
            <button className="input-icon-btn" onClick={startRecording} title="Ghi âm giọng nói">
              <Mic size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
