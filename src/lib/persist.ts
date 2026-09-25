import { useStore, diffLayout } from "../state/store";
import { api } from "./api";
import { playerRef } from "./player";
import { registry, type Layout } from "@project/sdk";

const key = (suffix: string) => `insyd:${suffix}:${__INSYD_PROJECT__}`;

// Unsaved work survives reloads: the draft is the delta between live and persisted overrides, plus
// the code values each edit was made against ("base"). If the code has changed since — a template
// update, a git pull, Claude editing the source — an edit made against the old value is ambiguous,
// so it is dropped on restore instead of silently overriding the new code.
type Base = { elements: Record<string, Record<string, unknown>>; props: Record<string, unknown> };
let base: Base = { elements: {}, props: {} };
let pendingCheck: Base | null = null;
let legacyCheck = false;

const codeProps = () => Object.fromEntries(registry.getProps().map((p) => [p.id, p.value]));
export const saveDraft = () => {
  const s = useStore.getState();
  const delta = diffLayout(s.layout, s.saved) as Partial<Layout>;
  const props = codeProps();
  // remember the code value behind every override (keep what we knew if the element is not mounted now)
  const next: Base = { elements: {}, props: {} };
  for (const id of Object.keys(delta.elements ?? {})) next.elements[id] = (s.codeDefaults[id] as Record<string, unknown>) ?? base.elements[id] ?? {};
  for (const id of Object.keys(delta.props ?? {})) next.props[id] = id in props ? props[id] : base.props[id];
  base = next;
  try { localStorage.setItem(key("draft"), JSON.stringify({ v: 2, layout: delta, base })); } catch {}
};
export const loadDraft = (): { layout: Partial<Layout>; legacy: boolean } | null => {
  try {
    const raw = localStorage.getItem(key("draft")); if (!raw) return null;
    const v = JSON.parse(raw);
    if (v && v.v === 2) { legacyCheck = false; base = v.base ?? { elements: {}, props: {} }; pendingCheck = JSON.parse(JSON.stringify(base)); return { layout: v.layout, legacy: false }; }
    // Drafts written before bases were recorded: assume the code had no explicit value for what was
    // edited, so an edit is dropped where the code now sets that value itself (e.g. a template update
    // that gave every clip its real start). Props cannot be checked and are kept.
    legacyCheck = true;
    pendingCheck = { elements: Object.fromEntries(Object.keys(v?.elements ?? {}).map((id) => [id, {}])), props: {} };
    return { layout: v, legacy: true };
  } catch { return null; }
};
export const clearDraft = () => { base = { elements: {}, props: {} }; pendingCheck = null; try { localStorage.removeItem(key("draft")); } catch {} };

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
/**
 * Called whenever code defaults / props become known: drops restored edits whose code value changed
 * since the draft was written. Elements report as the scan reaches them, so this runs progressively.
 */
export const reconcileDraft = () => {
  if (!pendingCheck) return;
  const s = useStore.getState();
  const props = codeProps();
  const dropped: string[] = [];
  const elements = { ...s.layout.elements };
  for (const [id, was] of Object.entries(pendingCheck.elements)) {
    // the code's literal attributes: from the index right away, else once the element has rendered
    const now = (s.index?.locators[`jsx:${id}`]?.values ?? s.codeDefaults[id]) as Record<string, unknown> | undefined;
    if (!now) continue; // not known yet
    const o = elements[id] ? { ...elements[id] } as Record<string, unknown> : null;
    if (o) for (const k of Object.keys(o)) if (k !== "cloneOf" && (legacyCheck ? now[k] !== undefined && !same(o[k], now[k]) : !same(was[k], now[k]))) { delete o[k]; dropped.push(`${id}.${k}`); }
    if (o) { if (Object.keys(o).length) elements[id] = o as any; else { delete elements[id]; if (!dropped.length) dropped.push(""); } }
    delete pendingCheck.elements[id];
  }
  const lprops = { ...s.layout.props };
  for (const [id, was] of Object.entries(pendingCheck.props)) {
    const loc = s.index?.locators[`call:${id}`];
    const code = id in props ? props[id] : loc && "value" in loc ? loc.value : undefined;
    if (code === undefined && !(id in props)) continue;
    if (id in lprops && !same(was, code)) { delete lprops[id]; dropped.push(id); }
    delete pendingCheck.props[id];
  }
  if (!Object.keys(pendingCheck.elements).length && !Object.keys(pendingCheck.props).length) pendingCheck = null;
  const real = dropped.filter(Boolean);
  if (dropped.length) {
    useStore.setState({ layout: { ...s.layout, elements, props: lprops } });
    if (real.length) s.setToast(`Dropped ${real.length} unsaved edit${real.length === 1 ? "" : "s"} — the code changed since you made ${real.length === 1 ? "it" : "them"}`);
    saveDraft();
  }
};

/** Throw away every unsaved edit and go back to what is in the code. */
export const discardDraft = () => {
  const s = useStore.getState();
  s.begin();
  useStore.setState({ layout: s.saved });
  s.end();
  clearDraft();
  s.setToast("Discarded unsaved changes · ⌘Z to bring them back");
};

// Editor UI state carried across the reload that follows a save.
export const stashSession = () => {
  const s = useStore.getState();
  try { sessionStorage.setItem(key("session"), JSON.stringify({ frame: playerRef.current?.getCurrentFrame() ?? 0, selection: s.selection, zoom: s.zoom, collapsed: s.collapsed })); } catch {}
};
export const popSession = () => {
  try { const v = sessionStorage.getItem(key("session")); sessionStorage.removeItem(key("session")); return v ? JSON.parse(v) : null; } catch { return null; }
};

/** Save: write every pending override into the source; keep the rest in layout.json; reload with state. */
export const saveToCode = async (): Promise<{ changed: string[]; unresolved: Record<string, Record<string, unknown>> } | undefined> => {
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
    return { changed: r.changed, unresolved: r.unresolved };
  } catch (e: any) {
    s.setSaving(false);
    s.setToast("Save failed: " + e.message);
  }
};
