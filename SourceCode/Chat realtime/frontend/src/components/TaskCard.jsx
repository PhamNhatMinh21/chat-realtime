import React from "react";
import { Check } from "lucide-react";

export default function TaskCard({ task, authUser, completing, handleCompleteTask, formatTaskTime }) {
  const assignees = task.assignees || [];
  const assigneeNames = assignees.filter(Boolean).map(a => a.displayName || a.username).join(", ") || "Tất cả";

  const isAssignee = assignees.some(a => a && String(a._id || a) === String(authUser?._id));
  const isCreator = task.createdBy && String(task.createdBy?._id || task.createdBy) === String(authUser?._id);
  const canComplete = isAssignee || isCreator;
  const isDone = task.status === "done";

  return (
    <div style={{
      background: isDone ? "rgba(34, 211, 166, 0.05)" : "var(--glass-bg)",
      border: isDone ? "1px solid rgba(34, 211, 166, 0.3)" : "1px solid var(--glass-border)",
      borderRadius: "16px",
      padding: "16px",
      width: "100%",
      boxShadow: isDone ? "0 4px 20px rgba(34, 211, 166, 0.08)" : "0 4px 20px rgba(0, 0, 0, 0.15)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      textAlign: "left"
    }}>
      {/* Header - Tiêu đề và nhãn trạng thái */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", paddingBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13.5, color: "var(--accent)" }}>
          <span style={{ fontSize: 16 }}>📋</span> LỊCH HẸN CÔNG VIỆC
        </div>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          padding: "3px 8px",
          borderRadius: 12,
          background: isDone ? "rgba(34, 211, 166, 0.15)" : "rgba(124, 106, 255, 0.15)",
          color: isDone ? "var(--success)" : "var(--accent)"
        }}>
          {isDone ? "Đã hoàn thành" : "Đang thực hiện"}
        </span>
      </div>

      {/* Chi tiết tiêu đề và mô tả công việc */}
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)", marginBottom: 4 }}>
          {task.title}
        </div>
        {task.description && (
          <div style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
            {task.description}
          </div>
        )}
      </div>

      {/* Lưới thông tin thời gian bắt đầu, hạn chót và người thực hiện */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12.5, background: "rgba(255,255,255,0.02)", padding: 8, borderRadius: 8 }}>
        <div>
          <span style={{ color: "var(--text-muted)" }}>Bắt đầu:</span>
          <div style={{ color: "var(--text-primary)", fontWeight: 500, marginTop: 2 }}>
            {formatTaskTime(task.createdAt)}
          </div>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)" }}>Hạn chót:</span>
          <div style={{ color: "var(--text-primary)", fontWeight: 500, marginTop: 2 }}>
            {formatTaskTime(task.deadline)}
          </div>
        </div>
        <div style={{ gridColumn: "span 2", marginTop: 4 }}>
          <span style={{ color: "var(--text-muted)" }}>Người thực hiện:</span>
          <div style={{ color: "var(--text-primary)", fontWeight: 600, marginTop: 2 }}>
            {assigneeNames}
          </div>
        </div>
      </div>

      {/* Nút bấm hành động hoàn thành công việc */}
      {!isDone && (
        <button
          onClick={() => handleCompleteTask(task._id)}
          disabled={completing || !canComplete}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "10px",
            border: "none",
            background: canComplete ? "var(--accent-gradient)" : "rgba(255,255,255,0.05)",
            color: canComplete ? "white" : "var(--text-muted)",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: canComplete ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "all 0.2s",
            boxShadow: canComplete ? "0 4px 12px rgba(124, 106, 255, 0.3)" : "none"
          }}
          onMouseOver={e => {
            if (canComplete) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(124, 106, 255, 0.4)";
            }
          }}
          onMouseOut={e => {
            if (canComplete) {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(124, 106, 255, 0.3)";
            }
          }}
        >
          {completing ? (
            <span className="spinner" style={{ width: 14, height: 14 }} />
          ) : (
            <Check size={16} />
          )}
          {canComplete ? "Hoàn thành công việc" : "Bạn không phải người thực hiện"}
        </button>
      )}

      {isDone && (
        <div style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
          border: "1px dashed rgba(34, 211, 166, 0.4)",
          color: "var(--success)",
          fontSize: 13.5,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: "rgba(34, 211, 166, 0.03)"
        }}>
          <Check size={16} /> Công việc đã hoàn thành
        </div>
      )}
    </div>
  );
}
