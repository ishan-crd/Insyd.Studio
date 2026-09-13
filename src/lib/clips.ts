// Clip vocabulary shared by the timeline, context menus and shortcuts:
// copy / cut / paste (at playhead, relative offsets) / duplicate / split / delete / lock.
import type { SoundOverride, ElementTransform } from "@project/sdk";
import { useStore, selectedOf } from "../state/store";
import { usePlayback } from "../state/playback";
import type { SoundClip } from "../components/AudioTracks";

export type SoundClipboardItem = { rel: number; src: string; volume: number; kind: SoundOverride["kind"]; label: string; trimStart: number; duration: number | null; loop?: boolean };
export type Clipboard = { type: "sound"; items: SoundClipboardItem[] } | { type: "element"; items: Array<{ id: string; rel: number }> } | null;

let clipboard: Clipboard = null;
export const getClipboard = () => clipboard;

// The timeline registers its resolved sound clips here so actions can read start/length.
let currentSoundClips: SoundClip[] = [];
export const setCurrentSoundClips = (c: SoundClip[]) => { currentSoundClips = c; };
export const soundClip = (id: string) => currentSoundClips.find((c) => c.id === id);
export const soundClipIds = () => currentSoundClips.map((c) => c.id);
/** Lock state read from the live layout first (the clip list can lag a render behind rapid edits). */
export const isSoundLocked = (id: string) => {
  const o = useStore.getState().layout.sounds[id];
  if (o && o.locked !== undefined) return o.locked;
  return soundClip(id)?.locked ?? false;
};

const toast = (t: string) => useStore.getState().setToast(t);

export const copySounds = (ids = selectedOf("sound")) => {
  const clips = ids.map(soundClip).filter(Boolean) as SoundClip[];
  if (!clips.length) return false;
  const first = Math.min(...clips.map((c) => c.start));
  clipboard = { type: "sound", items: clips.map((c) => ({ rel: c.start - first, src: c.src, volume: c.volume, kind: c.kind, label: c.label, trimStart: c.trimStart, duration: c.duration ?? c.frames, loop: false })) };
  toast(`Copied ${clips.length} sound${clips.length === 1 ? "" : "s"}`);
  return true;
};

export const deleteSounds = (ids = selectedOf("sound")) => {
  const s = useStore.getState();
  const clips = ids.map(soundClip).filter(Boolean) as SoundClip[];
  if (!clips.length) return;
  const locked = clips.filter((c) => isSoundLocked(c.id));
  if (locked.length) { toast(`${locked.length} locked sound${locked.length === 1 ? "" : "s"} skipped`); }
  const live = clips.filter((c) => !isSoundLocked(c.id));
  if (!live.length) return; // nothing deletable: keep the selection
  s.begin();
  const sounds = { ...s.layout.sounds };
  let muted = 0;
  for (const c of live) {
    if (c.added) delete sounds[c.id];
    else { sounds[c.id] = { ...(sounds[c.id] ?? {}), muted: true }; muted++; }
  }
  const remaining = clips.filter((c) => isSoundLocked(c.id)).map((c) => c.id);
  useStore.setState({ layout: { ...s.layout, sounds }, selection: remaining.length ? { type: "sound", id: remaining[0] } : null, multi: remaining });
  s.end();
  if (muted) toast(`${muted} sound${muted === 1 ? "" : "s"} declared in code — muted instead (⌘Z to undo)`);
};

export const cutSounds = (ids = selectedOf("sound")) => { if (copySounds(ids)) deleteSounds(ids); };

export const pasteSounds = (at = usePlayback.getState().frame) => {
  if (!clipboard || clipboard.type !== "sound") return;
  const s = useStore.getState();
  s.begin();
  const sounds = { ...s.layout.sounds };
  const ids: string[] = [];
  clipboard.items.forEach((it, i) => {
    const id = `added.${Date.now().toString(36)}${i}`;
    sounds[id] = { added: true, src: it.src, at: Math.max(0, Math.round(at + it.rel)), volume: it.volume, kind: it.kind, label: it.label, trimStart: it.trimStart || undefined, duration: it.duration ?? undefined, loop: it.loop };
    ids.push(id);
  });
  useStore.setState({ layout: { ...s.layout, sounds }, selection: { type: "sound", id: ids[ids.length - 1] }, multi: ids });
  s.end();
  toast(`Pasted ${ids.length} sound${ids.length === 1 ? "" : "s"} at f${Math.round(at)}`);
};

export const duplicateSounds = (ids = selectedOf("sound")) => {
  const clips = ids.map(soundClip).filter(Boolean) as SoundClip[];
  if (!clips.length) return;
  const s = useStore.getState();
  s.begin();
  const sounds = { ...s.layout.sounds };
  const newIds: string[] = [];
  clips.forEach((c, i) => {
    const id = `added.${Date.now().toString(36)}${i}`;
    // right after the original, like most editors
    sounds[id] = { added: true, src: c.src, at: c.start + c.frames, volume: c.volume, kind: c.kind, label: c.label, trimStart: c.trimStart || undefined, duration: c.duration ?? undefined };
    newIds.push(id);
  });
  useStore.setState({ layout: { ...s.layout, sounds }, selection: { type: "sound", id: newIds[newIds.length - 1] }, multi: newIds });
  s.end();
};

/** Split every selected sound that crosses `frame` into two clips. */
export const splitSounds = (frame = usePlayback.getState().frame, ids = selectedOf("sound")) => {
  const clips = (ids.map(soundClip).filter(Boolean) as SoundClip[]).filter((c) => !isSoundLocked(c.id) && c.repeat === 1 && frame > c.start + 1 && frame < c.start + c.frames - 1);
  if (!clips.length) { toast("Nothing to split at the playhead"); return; }
  const s = useStore.getState();
  s.begin();
  const sounds = { ...s.layout.sounds };
  const newIds: string[] = [];
  clips.forEach((c, i) => {
    const head = frame - c.start;
    sounds[c.id] = { ...(sounds[c.id] ?? {}), duration: head };
    const id = `added.${Date.now().toString(36)}${i}`;
    sounds[id] = { added: true, src: c.src, at: frame, volume: c.volume, kind: c.kind, label: c.label, trimStart: c.trimStart + head, duration: c.frames - head, muted: c.muted || undefined };
    newIds.push(id);
  });
  useStore.setState({ layout: { ...s.layout, sounds }, selection: { type: "sound", id: newIds[newIds.length - 1] }, multi: newIds });
  s.end();
  toast(`Split ${clips.length} sound${clips.length === 1 ? "" : "s"} at f${frame}`);
};

export const setSoundsLocked = (ids: string[], locked: boolean) => {
  const s = useStore.getState();
  s.setSounds(Object.fromEntries(ids.map((id) => [id, { locked }])));
};

/** Trim a sound clip: `edge` "l" moves the start (keeping the end), "r" moves the end. */
export const trimSound = (c: SoundClip, edge: "l" | "r", deltaFrames: number, commit = false) => {
  const s = useStore.getState();
  const total = c.frames;
  if (edge === "l") {
    const d = Math.max(-c.trimStart, Math.min(total - 2, deltaFrames));
    const patch: SoundOverride = { trimStart: c.trimStart + d, duration: total - d, ...(c.added ? { at: Math.max(0, c.natural + d) } : { shift: c.shift + d }) };
    s.setSound(c.id, patch, commit);
  } else {
    const d = Math.max(2 - total, deltaFrames);
    s.setSound(c.id, { duration: total + d }, commit);
  }
};

// ======================= elements =======================
// Elements are React code, so "copies" are linked instances (cloneOf) stored in the layout; they
// render the original's content with their own transform, timing and visibility window.

type ElInfo = { id: string; first: number; last: number };
const elInfo = (id: string): ElInfo | null => {
  const s = useStore.getState();
  const src = s.layout.elements[id]?.cloneOf ?? id;
  const e = s.scan.elements.find((x) => x.id === src);
  return e ? { id, first: e.first, last: e.last } : null;
};
export const elementSource = (id: string) => useStore.getState().layout.elements[id]?.cloneOf ?? id;
export const isElementLocked = (id: string) => useStore.getState().transform(id).locked;
/** natural (unshifted) length of an element's on-screen life, in frames */
export const elementLength = (id: string) => { const e = elInfo(id); return e ? e.last - e.first + 1 : 30; };

const nextCloneId = (src: string) => {
  const els = useStore.getState().layout.elements;
  let n = 1; while (els[`${src}.copy${n}`]) n++;
  return `${src}.copy${n}`;
};

export const copyElements = (ids = selectedOf("element")) => {
  const s = useStore.getState();
  const items = ids.map((id) => { const e = elInfo(id); const t = s.transform(id); return e ? { id, rel: e.first + t.delay } : null; }).filter(Boolean) as Array<{ id: string; rel: number }>;
  if (!items.length) return false;
  const first = Math.min(...items.map((i) => i.rel));
  clipboard = { type: "element", items: items.map((i) => ({ id: i.id, rel: i.rel - first })) };
  toast(`Copied ${items.length} element${items.length === 1 ? "" : "s"}`);
  return true;
};

const cloneFrom = (id: string, patch: Partial<ElementTransform>) => {
  const s = useStore.getState();
  const src = elementSource(id);
  const t = s.transform(id);
  const cid = nextCloneId(src);
  const { locked: _l, ...rest } = t;
  const clone: Partial<ElementTransform> = { ...rest, cloneOf: src, ...patch };
  return [cid, clone] as const;
};

export const pasteElements = (at = usePlayback.getState().frame) => {
  if (!clipboard || clipboard.type !== "element") return;
  const s = useStore.getState();
  const scenes = s.scenes();
  s.begin();
  const elements = { ...s.layout.elements };
  const ids: string[] = [];
  let clamped = 0;
  for (const it of clipboard.items) {
    const info = elInfo(it.id); if (!info) continue;
    // A linked copy lives in its source's scene (it renders the source's content), so the target
    // time is clamped into that scene; the copy's natural start lands at the playhead (+ offset).
    const scene = scenes.find((sc) => info.first >= sc.from && info.first < sc.from + sc.duration);
    let target = Math.round(at + it.rel);
    if (scene && (target < scene.from || target >= scene.from + scene.duration)) { target = info.first; clamped++; }
    const [cid, clone] = cloneFrom(it.id, { delay: target - info.first, x: (s.transform(it.id).x ?? 0) + 24, y: (s.transform(it.id).y ?? 0) + 24 });
    elements[cid] = clone; ids.push(cid);
  }
  useStore.setState({ layout: { ...s.layout, elements }, selection: ids.length ? { type: "element", id: ids[ids.length - 1] } : s.selection, multi: ids });
  s.end();
  if (ids.length) toast(clamped ? `Pasted ${ids.length} — linked copies stay in their source scene, so ${clamped} kept the original timing` : `Pasted ${ids.length} element${ids.length === 1 ? "" : "s"} at f${Math.round(at)}`);
};

export const duplicateElements = (ids = selectedOf("element")) => {
  const s = useStore.getState();
  if (!ids.length) return;
  s.begin();
  const elements = { ...s.layout.elements };
  const out: string[] = [];
  for (const id of ids) { const [cid, clone] = cloneFrom(id, { x: s.transform(id).x + 24, y: s.transform(id).y + 24 }); elements[cid] = clone; out.push(cid); }
  useStore.setState({ layout: { ...s.layout, elements }, selection: { type: "element", id: out[out.length - 1] }, multi: out });
  s.end();
};

export const cutElements = (ids = selectedOf("element")) => { if (copyElements(ids)) deleteElements(ids); };

/** Delete: linked copies are removed; code-declared elements are hidden. */
export const deleteElements = (ids = selectedOf("element")) => {
  const s = useStore.getState();
  const live = ids.filter((id) => !isElementLocked(id));
  if (!live.length) { if (ids.length) toast("Locked — unlock first"); return; }
  s.begin();
  const elements = { ...s.layout.elements };
  let hidden = 0;
  for (const id of live) {
    if (elements[id]?.cloneOf) delete elements[id];
    else { elements[id] = { ...(elements[id] ?? {}), hidden: true }; hidden++; }
  }
  const remaining = ids.filter((id) => isElementLocked(id));
  useStore.setState({ layout: { ...s.layout, elements }, selection: remaining.length ? { type: "element", id: remaining[0] } : null, multi: remaining });
  s.end();
  if (hidden) toast(`${hidden} element${hidden === 1 ? "" : "s"} declared in code — hidden instead (⌘Z to undo)`);
};

/** Split at `frame`: the original keeps the first part (trimOut), a linked copy shows the rest (trimIn). */
export const splitElements = (frame = usePlayback.getState().frame, ids = selectedOf("element")) => {
  const s = useStore.getState();
  const targets = ids.filter((id) => {
    const info = elInfo(id); if (!info || isElementLocked(id)) return false;
    const t = s.transform(id); const local = frame - (info.first + t.delay);
    const end = t.trimOut ?? (info.last - info.first);
    return local > t.trimIn + 1 && local < end - 1;
  });
  if (!targets.length) { toast("Nothing to split at the playhead"); return; }
  s.begin();
  const elements = { ...s.layout.elements };
  const out: string[] = [];
  for (const id of targets) {
    const info = elInfo(id)!; const t = s.transform(id); const local = frame - (info.first + t.delay);
    elements[id] = { ...(elements[id] ?? {}), trimOut: local - 1 };
    const [cid, clone] = cloneFrom(id, { trimIn: local, trimOut: t.trimOut ?? null });
    elements[cid] = clone; out.push(cid);
  }
  useStore.setState({ layout: { ...s.layout, elements }, selection: { type: "element", id: out[out.length - 1] }, multi: out });
  s.end();
  toast(`Split ${targets.length} element${targets.length === 1 ? "" : "s"} at f${frame}`);
};

export const setElementsLocked = (ids: string[], locked: boolean) => useStore.getState().updateElements(Object.fromEntries(ids.map((id) => [id, { locked }])));

/** Trim an element clip's visibility window by dragging its edges. */
export const trimElement = (id: string, base: ElementTransform, edge: "l" | "r", deltaFrames: number, commit = false) => {
  const len = elementLength(id);
  const end = base.trimOut ?? len - 1;
  if (edge === "l") useStore.getState().updateElement(id, { trimIn: Math.max(0, Math.min(end - 1, base.trimIn + deltaFrames)) }, commit);
  else useStore.getState().updateElement(id, { trimOut: Math.max(base.trimIn + 1, Math.min(len - 1, end + deltaFrames)) }, commit);
};

/** Paste whatever is on the clipboard at the playhead. */
export const pasteClipboard = (at?: number) => { if (clipboard?.type === "element") pasteElements(at); else if (clipboard?.type === "sound") pasteSounds(at); };
