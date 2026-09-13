import { create } from "zustand";

// Light is the default look; the choice is remembered per browser.
export type Theme = "light" | "dark";
const KEY = "insyd:theme";
const initial = (): Theme => { try { return localStorage.getItem(KEY) === "dark" ? "dark" : "light"; } catch { return "light"; } };
const apply = (t: Theme) => { document.documentElement.dataset.theme = t; try { localStorage.setItem(KEY, t); } catch {} };

export const useTheme = create<{ theme: Theme; set: (t: Theme) => void; toggle: () => void }>((set, get) => ({
  theme: initial(),
  set: (theme) => { apply(theme); set({ theme }); },
  toggle: () => get().set(get().theme === "dark" ? "light" : "dark"),
}));
apply(useTheme.getState().theme);
