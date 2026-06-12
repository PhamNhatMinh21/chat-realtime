import { create } from "zustand";

export const useSettingsStore = create((set, get) => ({
  readReceiptsEnabled: localStorage.getItem("readReceiptsEnabled") !== "false",

  toggleReadReceipts: () => {
    const next = !get().readReceiptsEnabled;
    localStorage.setItem("readReceiptsEnabled", String(next));
    set({ readReceiptsEnabled: next });
  },
}));
