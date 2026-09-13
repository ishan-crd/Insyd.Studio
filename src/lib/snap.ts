import { create } from "zustand";
import { registry, type Rect } from "@project/sdk";
import { useStore } from "../state/store";
import { playhead } from "./clips";

// ---------- timeline snapping ----------
// Candidates: every other clip's start/end (elements and sounds), scene cuts, and the playhead.
export const useSnapUi = create<{ line: number | null; set: (f: number | null) => void }>((set) => ({ line: null, set: (line) => set({ line }) }));

const clipEdges = (exclude: Set<string>, ppf: number) => {
  const out: number[] = [];
  const inner = document.querySelector(".tl-inner") as HTMLElement | null;
  if (!inner) return out;
  for (const el of Array.from(inner.querySelectorAll<HTMLElement>("[data-clip-id]"))) {
    if (exclude.has(el.dataset.clipId!)) continue;
    const left = parseFloat(el.style.left || "0"), w = parseFloat(el.style.width || "0");
    out.push(Math.round(left / ppf), Math.round((left + w + 1) / ppf));
  }
  return out;
};

/**
 * Given the dragged clip's proposed [start, end] (frames), return the delta that snaps whichever
 * edge is closest to a target, or 0. `thresholdPx` is in screen pixels.
 */
export const snapDelta = (start: number, end: number, exclude: Set<string>, ppf: number, opts: { disabled?: boolean; thresholdPx?: number; edges?: ("start" | "end")[] } = {}) => {
  useSnapUi.getState().set(null);
  if (opts.disabled) return 0;
  const thr = (opts.thresholdPx ?? 10) / ppf;
  const s = useStore.getState();
  const targets = [0, s.duration(), playhead(), ...s.scenes().flatMap((sc) => [sc.from, sc.from + sc.duration]), ...clipEdges(exclude, ppf)];
  // smallest non-zero correction wins; an edge that is already aligned only draws the guide
  const best: { d: number; at: number } = { d: Infinity, at: 0 };
  let aligned: number | null = null;
  const consider = (edge: number) => {
    for (const t of targets) {
      const d = t - edge;
      if (Math.abs(d) > thr) continue;
      if (Math.abs(d) < 0.5) { aligned = t; continue; }
      if (Math.abs(d) < Math.abs(best.d)) { best.d = d; best.at = t; }
    }
  };
  const edges = opts.edges ?? ["start", "end"];
  if (edges.includes("start")) consider(start);
  if (edges.includes("end")) consider(end);
  if (Number.isFinite(best.d)) { useSnapUi.getState().set(best.at); return best.d; }
  if (aligned !== null) { useSnapUi.getState().set(aligned); return 0; }
  return 0;
};
export const clearSnap = () => useSnapUi.getState().set(null);

// ---------- canvas snapping ----------
export const useCanvasGuides = create<{ v: number | null; h: number | null; set: (g: { v?: number | null; h?: number | null }) => void }>((set) => ({ v: null, h: null, set: (g) => set({ v: g.v ?? null, h: g.h ?? null }) }));

/** Snap a moving element rect (proposed position) to the canvas centre and to other elements' edges/centres. */
export const snapRect = (r: Rect, exclude: Set<string>, comp: { width: number; height: number }, disabled = false, thr = 8) => {
  if (disabled) { useCanvasGuides.getState().set({}); return { dx: 0, dy: 0 }; }
  const xs = [comp.width / 2], ys = [comp.height / 2];
  for (const en of registry.getElements("main")) {
    if (exclude.has(en.id) || exclude.has(en.cloneOf ?? "") ) continue;
    const o = registry.measure(en.el); if (!o || o.w < 2 || o.h < 2) continue;
    xs.push(o.x, o.x + o.w / 2, o.x + o.w); ys.push(o.y, o.y + o.h / 2, o.y + o.h);
  }
  const mine = { xs: [r.x, r.x + r.w / 2, r.x + r.w], ys: [r.y, r.y + r.h / 2, r.y + r.h] };
  const pick = (mineV: number[], targets: number[]) => {
    let best: { d: number; at: number } | null = null, aligned: number | null = null;
    for (const m of mineV) for (const t of targets) { const d = t - m; if (Math.abs(d) > thr) continue; if (Math.abs(d) < 0.25) { aligned = t; continue; } if (!best || Math.abs(d) < Math.abs(best.d)) best = { d, at: t }; }
    return best ?? (aligned !== null ? { d: 0, at: aligned } : null);
  };
  const bx = pick(mine.xs, xs), by = pick(mine.ys, ys);
  useCanvasGuides.getState().set({ v: bx?.at ?? null, h: by?.at ?? null });
  return { dx: bx?.d ?? 0, dy: by?.d ?? 0 };
};
export const clearCanvasGuides = () => useCanvasGuides.getState().set({});
