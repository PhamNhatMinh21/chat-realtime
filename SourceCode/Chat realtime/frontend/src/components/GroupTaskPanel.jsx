import { useState, useEffect } from "react";
import { X, Plus, CheckCircle2, Circle, Clock, AlertTriangle, Trash2, ChevronDown, ChevronUp, Users } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { useAuthStore } from "../store/useAuthStore";
import { BASE_URL } from "../lib/config";

function formatDeadline(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d - now;

  if (diff < 0) return { text: "Quá hạn", color: "var(--danger)", icon: "overdue" };
  if (diff < 3600000) {
    const m = Math.floor(diff / 60000);
    return { text: `Còn ${m} phút`, color: "#f59e0b", icon: "critical" };
  }
  if (diff < 86400000) {
    const h = Math.floor(diff / 3600000);
    return { text: `Còn ${h} giờ`, color: "#f59e0b", icon: "high" };
  }
  return {
    text: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    color: "var(--text-muted)",
    icon: "normal"
  };
}

function Avatar({ user, size = 24 }) {
  const name = user?.displayName || user?.username || "?";
  if (user?.avatarUrl) {
    return (
      <img src={`${BASE_URL}${user.avatarUrl}`} alt={name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--bg-secondary)" }}
        title={name} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: "var(--accent-gradient)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 700, color: "white", border: "2px solid var(--bg-secondary)",
      flexShrink: 0
    }} title={name}>{name.charAt(0).toUpperCase()}</div>
  );
}

function TaskCard({ task, conversationParticipants, authUser }) {
  const { updateStatus, deleteTask } = useTaskStore();
  const [expanded, setExpanded] = useState(false);
  const deadline = formatDeadline(task.deadline);
  const isDone = task.status === "done";
  const isOverdue = task.status === "overdue";

  const isCreator = task.createdBy && String(task.createdBy?._id || task.createdBy) === String(authUser?._id);
  const isAssignee = task.assignees?.some(a => a && String(a._id || a) === String(authUser?._id));
  const canChange = isCreator || isAssignee;

  const statusColor = isDone ? "var(--success)" : isOverdue ? "var(--danger)" : deadline.color;

  return (
    <div style={{
      background: "var(--glass-bg)", border: `1px solid ${isDone ? "rgba(34,197,94,0.3)" : isOverdue ? "rgba(239,68,68,0.3)" : "var(--glass-border)"}`,
      borderRadius: 12, padding: "12px 14px", marginBottom: 10,
      transition: "all 0.2s ease",
      opacity: isDone ? 0.7 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {canChange && !isOverdue && (
          <button
            onClick={() => updateStatus(task._id, isDone ? "pending" : "done")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 1, flexShrink: 0, color: isDone ? "var(--success)" : "var(--text-muted)" }}
          >
            {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
          </button>
        )}
        {(isOverdue || !canChange) && (
          <div style={{ color: statusColor, marginTop: 1, flexShrink: 0 }}>
            {isOverdue ? <AlertTriangle size={20} /> : isDone ? <CheckCircle2 size={20} color="var(--success)" /> : <Clock size={20} />}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
            <span style={{
              fontSize: 14, fontWeight: 600, color: "var(--text-primary)",
              textDecoration: isDone ? "line-through" : "none",
              wordBreak: "break-word"
            }}>{task.title}</span>

            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => setExpanded(e => !e)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}>
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {isCreator && (
                <button onClick={() => { if (window.confirm("Xóa task này?")) deleteTask(task._id); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 2 }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
            <Clock size={11} color={statusColor} />
            <span style={{ fontSize: 11, color: statusColor, fontWeight: 500 }}>{deadline.text}</span>
            {isOverdue && <span style={{ fontSize: 10, background: "rgba(239,68,68,0.15)", color: "var(--danger)", padding: "1px 6px", borderRadius: 20, fontWeight: 600 }}>QUÁ HẠN</span>}
            {isDone && <span style={{ fontSize: 10, background: "rgba(34,197,94,0.15)", color: "var(--success)", padding: "1px 6px", borderRadius: 20, fontWeight: 600 }}>HOÀN THÀNH</span>}
          </div>

          {task.assignees?.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
              <Users size={11} color="var(--text-muted)" />
              <div style={{ display: "flex", gap: -4 }}>
                {task.assignees.filter(Boolean).map(a => <Avatar key={a._id} user={a} size={20} />)}
              </div>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--glass-border)" }}>
          {task.description && (
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 8px", lineHeight: 1.5 }}>{task.description}</p>
          )}
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Tạo bởi: <strong>{task.createdBy?.displayName || "?"}</strong>
            {" · "}
            {new Date(task.createdAt).toLocaleDateString("vi-VN")}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GroupTaskPanel({ conversation, onClose }) {
  const { tasks, getTasks, createTask, isLoading } = useTaskStore();
  const { authUser } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", deadline: "", assigneeIds: [] });
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("all"); // "all" | "pending" | "done" | "overdue"

  const participants = conversation?.participants || [];

  useEffect(() => {
    if (conversation?._id) getTasks(conversation._id);
  }, [conversation?._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.deadline) return;
    setSubmitting(true);
    try {
      await createTask(conversation._id, {
        title: form.title.trim(),
        description: form.description.trim(),
        deadline: form.deadline,
        assigneeIds: form.assigneeIds,
      });
      setForm({ title: "", description: "", deadline: "", assigneeIds: [] });
      setShowForm(false);
    } catch (err) {
      alert("Không thể tạo task. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAssignee = (id) => {
    setForm(f => ({
      ...f,
      assigneeIds: f.assigneeIds.includes(id)
        ? f.assigneeIds.filter(a => a !== id)
        : [...f.assigneeIds, id]
    }));
  };

  const filtered = tasks.filter(t => filter === "all" || t.status === filter);
  const counts = {
    pending: tasks.filter(t => t.status === "pending").length,
    done: tasks.filter(t => t.status === "done").length,
    overdue: tasks.filter(t => t.status === "overdue").length,
  };

  return (
    <div style={{
      width: 340, borderLeft: "1px solid var(--glass-border)", background: "var(--bg-secondary)",
      display: "flex", flexDirection: "column", height: "100vh", flexShrink: 0, overflow: "hidden"
    }}>
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>📋 Lịch hẹn nhóm</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            {counts.pending} đang chờ · {counts.done} xong · {counts.overdue} quá hạn
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setShowForm(f => !f)}
            style={{
              background: showForm ? "transparent" : "var(--accent)", color: showForm ? "var(--text-muted)" : "white",
              border: showForm ? "1px solid var(--glass-border)" : "none", borderRadius: 8,
              padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600
            }}
            title="Thêm task mới"
          >
            {showForm ? <X size={14} /> : <><Plus size={14} /> Thêm</>}
          </button>
          <button onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ padding: "12px 16px", borderBottom: "1px solid var(--glass-border)", background: "rgba(124,106,255,0.04)" }}>
          <div style={{ marginBottom: 8 }}>
            <input
              required value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Tiêu đề nhiệm vụ *"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Mô tả (tuỳ chọn)"
              rows={2}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 13, resize: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Hạn chót *</label>
            <input
              type="datetime-local" required value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              min={new Date().toISOString().slice(0, 16)}
              style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Chỉ định cho</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {participants.filter(Boolean).map(p => {
                const selected = form.assigneeIds.includes(p._id);
                return (
                  <button key={p._id} type="button" onClick={() => toggleAssignee(p._id)}
                    style={{
                      padding: "4px 10px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontWeight: 500,
                      background: selected ? "var(--accent)" : "transparent",
                      color: selected ? "white" : "var(--text-secondary)",
                      border: selected ? "none" : "1px solid var(--glass-border)",
                      transition: "all 0.15s"
                    }}>
                    {p.displayName || p.username}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="submit" disabled={submitting}
            style={{ width: "100%", padding: "8px", borderRadius: 8, background: "var(--accent)", color: "white", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? "Đang tạo..." : "Tạo nhiệm vụ"}
          </button>
        </form>
      )}

      <div style={{ display: "flex", padding: "8px 16px 0", gap: 4, borderBottom: "1px solid var(--glass-border)" }}>
        {[["all", "Tất cả"], ["pending", "Chờ"], ["done", "Xong"], ["overdue", "Quá hạn"]].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{
              padding: "5px 10px", borderRadius: "8px 8px 0 0", fontSize: 12, cursor: "pointer", fontWeight: filter === key ? 700 : 400,
              background: filter === key ? "var(--bg-primary)" : "transparent",
              color: filter === key ? "var(--accent)" : "var(--text-muted)",
              border: filter === key ? "1px solid var(--glass-border)" : "none",
              borderBottom: filter === key ? "1px solid var(--bg-primary)" : "none",
            }}>
            {label} {key !== "all" && counts[key] > 0 && <span style={{ marginLeft: 3, fontSize: 10, background: key === "overdue" ? "var(--danger)" : key === "done" ? "var(--success)" : "var(--accent)", color: "white", borderRadius: "50%", padding: "0 5px" }}>{counts[key]}</span>}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 24, fontSize: 14 }}>
            <span className="spinner" style={{ display: "inline-block" }} /> Đang tải...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px 0", fontSize: 13 }}>
            {filter === "all" ? "Chưa có nhiệm vụ nào. Nhấn + Thêm để tạo!" : "Không có nhiệm vụ nào ở đây."}
          </div>
        ) : (
          filtered.map(task => (
            <TaskCard key={task._id} task={task} conversationParticipants={participants} authUser={authUser} />
          ))
        )}
      </div>
    </div>
  );
}
