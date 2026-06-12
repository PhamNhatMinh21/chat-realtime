import { useTaskStore } from "../store/useTaskStore";
import { Bell, X, AlertTriangle } from "lucide-react";

export default function TaskReminderToast() {
  const { reminders, dismissReminder } = useTaskStore();
  if (reminders.length === 0) return null;

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10, maxWidth: 360,
    }}>
      {reminders.map(r => {
        const isCritical = r.urgency === "critical";
        const isHigh = r.urgency === "high";
        const borderColor = isCritical ? "var(--danger)" : isHigh ? "#f59e0b" : "var(--accent)";
        const bgColor = isCritical
          ? "rgba(239,68,68,0.12)"
          : isHigh
            ? "rgba(245,158,11,0.12)"
            : "rgba(124,106,255,0.12)";

        return (
          <div key={r.id}
            style={{
              background: "var(--bg-secondary)",
              border: `1px solid ${borderColor}`,
              borderLeft: `4px solid ${borderColor}`,
              borderRadius: 12,
              padding: "12px 14px",
              backdropFilter: "blur(16px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              animation: "slideInRight 0.3s ease",
            }}
          >
            <div style={{ marginTop: 2, flexShrink: 0, color: borderColor }}>
              {isCritical ? <AlertTriangle size={18} /> : <Bell size={18} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: borderColor, marginBottom: 2 }}>
                {isCritical ? "⚠️ Sắp quá hạn!" : isHigh ? "🔔 Nhắc nhở" : "📋 Lịch hẹn"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, wordBreak: "break-word" }}>
                {r.title}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Còn lại: <strong style={{ color: borderColor }}>{r.timeLeft}</strong>
              </div>
            </div>
            <button
              onClick={() => dismissReminder(r.id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, flexShrink: 0 }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
