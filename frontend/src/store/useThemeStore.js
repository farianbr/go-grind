import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem("gogrind-theme") || "dark",
  setTheme: (theme) => {
    localStorage.setItem("gogrind-theme", theme);
    set({ theme });
  },
}));