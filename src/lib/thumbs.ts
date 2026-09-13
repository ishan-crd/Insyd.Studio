import { create } from "zustand";
import { api } from "./api";
import { useStore } from "../state/store";

// Filmstrip thumbnails for the scene track: rendered server-side in the background, cached per project state.
export type Thumbs = { base: string; every: number; count: number; width: number; height: number; files: string[] };
export const useThumbs = create<{ thumbs: Thumbs | null; status: "idle" | "running" | "ready" | "error"; progress: number; error: string | null; set: (p: Partial<{ thumbs: Thumbs | null; status: "idle" | "running" | "ready" | "error"; progress: number; error: string | null }>) => void }>((set) => ({
  thumbs: null, status: "idle", progress: 0, error: null, set: (p) => set(p),
}));

let polling = false;
export const ensureThumbs = async () => {
  const def = useStore.getState().def;
  if (!def || polling) return;
  polling = true;
  try {
    for (let i = 0; i < 400; i++) {
      const r = await api.thumbs({ compositionId: def.id, entryPoint: def.entryPoint, layoutFile: def.layoutFile }).catch((e) => ({ status: "error" as const, error: e.message, key: "", base: "" }));
      if (r.status === "ready" && r.files) { useThumbs.getState().set({ status: "ready", progress: 1, thumbs: { base: r.base, every: r.every!, count: r.count!, width: r.width!, height: r.height!, files: r.files } }); return; }
      if (r.status === "error") { useThumbs.getState().set({ status: "error", error: r.error ?? "failed" }); return; }
      useThumbs.getState().set({ status: "running", progress: r.progress ?? 0 });
      await new Promise((res) => setTimeout(res, 1500));
    }
  } finally { polling = false; }
};
