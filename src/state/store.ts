import { create } from "zustand";
import type { ElementKind, ElementTransform, Layout, ProjectDefinition } from "@project/sdk";
import { DEFAULT_TRANSFORM, mergeLayout, emptyLayout, projectDuration, sceneDuration } from "@project/sdk";

export type Selection = { type: "element"; id: string } | { type: "scene"; id: string } | { type: "brand" } | null;
export type ScanElement = { id: string; label: string; kind: ElementKind; first: number; last: number; sceneId: string };
export type SceneSpan = { id: string; label: string; from: number; duration: number; index: number };
export type CodeIndex = { locators: Record<string, { file: string; literal: boolean }> };

type State = {
  def: ProjectDefinition<any> | null;
  layout: Layout;      // live overrides (what the preview shows)
  saved: Layout;       // baseline: overrides already persisted (layout.json fallback)
  past: Layout[];
  future: Layout[];
  txn: Layout | null;
  index: CodeIndex | null;
  /** <Editable x={…}> defaults as written in the code, learned from the registry */
  codeDefaults: Record<string, Partial<ElementTransform>>;

  selection: Selection;
  hover: string | null;
  zoom: number | null;
  collapsed: Record<string, boolean>;
  scan: { status: "idle" | "running" | "done"; progress: number; elements: ScanElement[] };
  toast: string | null;
  saving: boolean;

  duration: () => number;
  scenes: () => SceneSpan[];
  transform: (id: string) => ElementTransform;
  dirty: () => boolean;
  /** overrides not yet persisted (layout minus saved) */
  pending: () => Layout;

  init: (def: ProjectDefinition<any>, saved: Partial<Layout> | null, draft: Partial<Layout> | null) => void;
  setIndex: (i: CodeIndex) => void;
  setCodeDefaults: (d: Record<string, Partial<ElementTransform>>) => void;
  select: (s: Selection) => void;
  setHover: (id: string | null) => void;
  setZoom: (z: number | null) => void;
  toggleCollapsed: (sceneId: string) => void;

  begin: () => void;
  end: () => void;
  setLayout: (l: Layout) => void;
  updateElement: (id: string, patch: Partial<ElementTransform>, commit?: boolean) => void;
  resetElement: (id: string) => void;
  setCopy: (id: string, text: string, commit?: boolean) => void;
  setProp: (id: string, value: unknown, commit?: boolean) => void;
  resetProp: (id: string) => void;
  setSceneDuration: (id: string, frames: number, commit?: boolean) => void;
  undo: () => void;
  redo: () => void;
  markSaved: (saved: Layout) => void;
  setScan: (s: Partial<State["scan"]>) => void;
  setToast: (t: string | null) => void;
  setSaving: (b: boolean) => void;
};

const HISTORY = 100;
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export const diffLayout = (layout: Layout, saved: Layout): Layout => {
  const out = emptyLayout();
  for (const k of ["elements", "copy", "scenes", "props"] as const) {
    for (const [id, v] of Object.entries(layout[k])) if (!eq(v, (saved[k] as any)[id])) (out[k] as any)[id] = v;
  }
  return out;
};

export const useStore = create<State>((set, get) => ({
  def: null,
  layout: emptyLayout(), saved: emptyLayout(),
  past: [], future: [], txn: null, index: null, codeDefaults: {},
  selection: null, hover: null, zoom: null, collapsed: {},
  scan: { status: "idle", progress: 0, elements: [] },
  toast: null, saving: false,

  duration: () => { const { def, layout } = get(); return def ? projectDuration(def, layout) : 1; },
  scenes: () => {
    const { def, layout } = get();
    if (!def) return [];
    let at = 0;
    return def.scenes.map((s, index) => {
      const duration = sceneDuration(layout, s.id, s.durationInFrames);
      const span = { id: s.id, label: s.label, from: at, duration, index };
      at += duration;
      return span;
    });
  },
  transform: (id) => ({ ...DEFAULT_TRANSFORM, ...(get().codeDefaults[id] ?? {}), ...(get().layout.elements[id] ?? {}) }),
  dirty: () => !eq(get().layout, get().saved),
  pending: () => diffLayout(get().layout, get().saved),

  init: (def, saved, draft) => {
    const base = mergeLayout(emptyLayout(), saved);
    const layout = mergeLayout(base, draft);
    set({ def, layout, saved: base, past: [], future: [] });
  },
  setIndex: (index) => set({ index }),
  setCodeDefaults: (codeDefaults) => set({ codeDefaults }),
  select: (selection) => set({ selection }),
  setHover: (hover) => set({ hover }),
  setZoom: (zoom) => set({ zoom }),
  toggleCollapsed: (id) => set((s) => ({ collapsed: { ...s.collapsed, [id]: !s.collapsed[id] } })),

  begin: () => { if (!get().txn) set({ txn: get().layout }); },
  end: () => {
    const { txn, layout, past } = get();
    if (!txn) return;
    if (!eq(txn, layout)) set({ past: [...past, txn].slice(-HISTORY), future: [] });
    set({ txn: null });
  },
  setLayout: (layout) => set({ layout }),
  updateElement: (id, patch, commit = true) => {
    const s = get(); if (commit) s.begin();
    const cur = s.layout.elements[id] ?? {};
    set({ layout: { ...s.layout, elements: { ...s.layout.elements, [id]: { ...cur, ...patch } } } });
    if (commit) get().end();
  },
  resetElement: (id) => {
    const s = get(); s.begin();
    const elements = { ...s.layout.elements }; delete elements[id];
    set({ layout: { ...s.layout, elements } }); get().end();
  },
  setCopy: (id, text, commit = true) => {
    const s = get(); if (commit) s.begin();
    set({ layout: { ...s.layout, copy: { ...s.layout.copy, [id]: text } } });
    if (commit) get().end();
  },
  setProp: (id, value, commit = true) => {
    const s = get(); if (commit) s.begin();
    set({ layout: { ...s.layout, props: { ...s.layout.props, [id]: value } } });
    if (commit) get().end();
  },
  resetProp: (id) => {
    const s = get(); s.begin();
    const props = { ...s.layout.props }; delete props[id];
    set({ layout: { ...s.layout, props } }); get().end();
  },
  setSceneDuration: (id, frames, commit = true) => {
    const s = get(); if (commit) s.begin();
    set({ layout: { ...s.layout, scenes: { ...s.layout.scenes, [id]: Math.max(6, Math.round(frames)) } } });
    if (commit) get().end();
  },
  undo: () => { const { past, future, layout } = get(); if (!past.length) return; set({ layout: past[past.length - 1], past: past.slice(0, -1), future: [layout, ...future] }); },
  redo: () => { const { past, future, layout } = get(); if (!future.length) return; set({ layout: future[0], future: future.slice(1), past: [...past, layout] }); },
  markSaved: (saved) => set({ saved }),
  setScan: (patch) => set((s) => ({ scan: { ...s.scan, ...patch } })),
  setToast: (toast) => set({ toast }),
  setSaving: (saving) => set({ saving }),
}));

export const sceneAt = (scenes: SceneSpan[], frame: number) =>
  scenes.find((s) => frame >= s.from && frame < s.from + s.duration) ?? scenes[scenes.length - 1];
