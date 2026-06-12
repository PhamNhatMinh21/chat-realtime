import { create } from "zustand";

export const useThemeStore = create((set, get) => ({
  theme: localStorage.getItem("theme") || "dark",
  
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
    set({ theme: next });
  },

  setTheme: (theme) => {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },
}));
