import { useStore, diffLayout } from "../state/store";
import { api } from "./api";
import { playerRef } from "./player";
import type { Layout } from "@project/sdk";

const key = (suffix: string) => `insyd:${suffix}:${__INSYD_PROJECT__}`;

// Unsaved work survives reloads: the draft is the delta between live and persisted overrides.
export const saveDraft = () => {
  const s = useStore.getState();
  try { localStorage.setItem(key("draft"), JSON.stringify(diffLayout(s.layout, s.saved))); } catch {}
};
export const loadDraft = (): Partial<Layout> | null => {
  try { const v = localStorage.getItem(key("draft")); return v ? JSON.parse(v) : null; } catch { return null; }
};
export const clearDraft = () => { try { localStorage.removeItem(key("draft")); } catch {} };

// Editor UI state carried across the reload that follows a save.
export const stashSession = () => {
  const s = useStore.getState();
  try { sessionStorage.setItem(key("session"), JSON.stringify({ frame: playerRef.current?.getCurrentFrame() ?? 0, selection: s.selection, zoom: s.zoom, collapsed: s.collapsed })); } catch {}
};
export const popSession = () => {
  try { const v = sessionStorage.getItem(key("session")); sessionStorage.removeItem(key("session")); return v ? JSON.parse(v) : null; } catch { return null; }
};

/** Save: write every pending override into the source; keep the rest in layout.json; reload with state. */
export const saveToCode = async () => {
  const s = useStore.getState();
  if (!s.def || s.saving) return;
  const pending = s.pending();
  const n = Object.values(pending).filter((v) => typeof v === "object").reduce((a, v: any) => a + Object.keys(v).length, 0);
  if (!n) { s.setToast("Nothing to save"); return; }
  s.setSaving(true);
  try {
    const r = await api.apply(pending, s.def.layoutFile);
    const files = r.changed.length;
    const unresolved = Object.values(r.unresolved).reduce((a: number, v: any) => a + Object.keys(v).length, 0);
    clearDraft();
    stashSession();
    s.setToast(files ? `Saved · ${files} file${files === 1 ? "" : "s"} updated${unresolved ? ` · ${unresolved} kept in layout.json` : ""}` : "Saved to layout.json");
    setTimeout(() => location.reload(), 350);
  } catch (e: any) {
    s.setSaving(false);
    s.setToast("Save failed: " + e.message);
  }
};
