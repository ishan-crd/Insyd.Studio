import { create } from "zustand";

// One-shot audio preview for the inspector waveform: plays a clip's trimmed range once at its volume.
type PreviewState = { id: string | null; progress: number; playing: boolean };
export const usePreview = create<PreviewState & { set: (p: Partial<PreviewState>) => void }>((set) => ({ id: null, progress: 0, playing: false, set: (p) => set(p) }));

let audio: HTMLAudioElement | null = null;
let raf = 0;
let stopAt = Infinity;

export const stopPreview = () => {
  cancelAnimationFrame(raf);
  if (audio) { audio.pause(); audio.src = ""; audio = null; }
  usePreview.getState().set({ id: null, progress: 0, playing: false });
};

/** Play `url` from `startSec` for `durationSec` (or to the end) at `volume`, once. */
export const playPreview = (id: string, url: string, startSec = 0, durationSec?: number, volume = 1, speed = 1) => {
  if (usePreview.getState().id === id && usePreview.getState().playing) { stopPreview(); return; }
  stopPreview();
  const el = new Audio(url);
  audio = el;
  el.volume = Math.max(0, Math.min(1, volume));
  el.playbackRate = Math.max(0.25, Math.min(4, speed)); el.preservesPitch = false;
  el.currentTime = startSec;
  stopAt = durationSec !== undefined ? startSec + durationSec : Infinity;
  const total = durationSec ?? NaN;
  usePreview.getState().set({ id, progress: 0, playing: true });
  const tick = () => {
    if (audio !== el) return;
    const t = el.currentTime - startSec;
    const len = Number.isFinite(total) ? total : (el.duration || 1) - startSec;
    usePreview.getState().set({ id, progress: Math.min(1, Math.max(0, t / len)), playing: true });
    if (el.currentTime >= stopAt || el.ended) { stopPreview(); return; }
    raf = requestAnimationFrame(tick);
  };
  el.addEventListener("ended", () => { if (audio === el) stopPreview(); });
  el.addEventListener("loadedmetadata", () => { if (audio === el) el.currentTime = startSec; });
  el.play().then(() => { raf = requestAnimationFrame(tick); }).catch(() => stopPreview());
};
// expose for tests
if (typeof window !== "undefined") (window as any).__insydPreview = { get: () => ({ ...usePreview.getState(), currentTime: audio?.currentTime ?? null, paused: audio?.paused ?? true, volume: audio?.volume ?? null }) };
