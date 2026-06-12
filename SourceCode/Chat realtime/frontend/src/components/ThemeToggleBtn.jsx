import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";

export default function ThemeToggleBtn({ style = {} }) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      style={{
        position: "fixed",
        top: 18,
        right: 18,
        zIndex: 9999,
        width: 42,
        height: 42,
        borderRadius: "50%",
        border: "1px solid var(--glass-border)",
        background: "var(--glass-bg)",
        backdropFilter: "var(--blur)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-primary)",
        transition: "var(--transition)",
        boxShadow: "var(--shadow-md)",
        ...style,
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
    >
      {isDark ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color="#6366F1" />}
    </button>
  );
}
