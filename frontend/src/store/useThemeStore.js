import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: (() => {
    const saved = localStorage.getItem("kendro-theme");
    // The old build stored stock DaisyUI names (dark/forest/halloween) that no
    // longer exist. Fall back rather than rendering an undefined theme.
    return saved === "kendro" || saved === "kendro-dark" ? saved : "kendro";
  })(),
  setTheme: (theme) => {
    localStorage.setItem("kendro-theme", theme);
    set({ theme });
  },
}));
