import { useEffect, useState } from "react";

// Decoded audio metadata + waveform peaks per URL, shared by every clip and the inspector.
export type AudioInfo = { duration: number; peaks: Float32Array; error?: string };
const cache = new Map<string, AudioInfo>();
const pending = new Map<string, Promise<AudioInfo>>();
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;
const BUCKETS = 1600;

export const getAudioInfo = (url: string): Promise<AudioInfo> => {
  const hit = cache.get(url); if (hit) return Promise.resolve(hit);
  const p = pending.get(url); if (p) return p;
  const job = (async () => {
    try {
      const buf = await (await fetch(url)).arrayBuffer();
      ctx = ctx ?? new (window.AudioContext || (window as any).webkitAudioContext)();
      const audio = await ctx.decodeAudioData(buf.slice(0));
      const ch = audio.getChannelData(0);
      const per = Math.max(1, Math.floor(ch.length / BUCKETS));
      const peaks = new Float32Array(Math.ceil(ch.length / per));
      for (let i = 0; i < peaks.length; i++) { let m = 0; const end = Math.min(ch.length, (i + 1) * per); for (let j = i * per; j < end; j++) { const v = Math.abs(ch[j]); if (v > m) m = v; } peaks[i] = m; }
      const info = { duration: audio.duration, peaks };
      cache.set(url, info); return info;
    } catch (e: any) {
      const info = { duration: 0, peaks: new Float32Array(0), error: e.message }; cache.set(url, info); return info;
    } finally { pending.delete(url); listeners.forEach((l) => l()); }
  })();
  pending.set(url, job); return job;
};
export const peekAudioInfo = (url: string) => cache.get(url) ?? null;

export const useAudioInfo = (url: string | null | undefined): AudioInfo | null => {
  const [, tick] = useState(0);
  useEffect(() => { const l = () => tick((n) => n + 1); listeners.add(l); if (url) getAudioInfo(url); return () => { listeners.delete(l); }; }, [url]);
  return url ? cache.get(url) ?? null : null;
};

/** Draw peaks into a canvas; `offset`/`span` select the visible slice in seconds. */
export const drawWave = (canvas: HTMLCanvasElement, info: AudioInfo, color: string, offset = 0, span?: number) => {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const g = canvas.getContext("2d")!; g.scale(dpr, dpr); g.clearRect(0, 0, w, h);
  if (!info.peaks.length || !info.duration) return;
  const total = span ?? info.duration;
  const perPx = (info.peaks.length / info.duration) * (total / w);
  const start = (offset / info.duration) * info.peaks.length;
  g.fillStyle = color;
  for (let x = 0; x < w; x++) {
    const a = Math.floor(start + x * perPx), b = Math.max(a + 1, Math.floor(start + (x + 1) * perPx));
    let m = 0; for (let i = a; i < b && i < info.peaks.length; i++) if (info.peaks[i] > m) m = info.peaks[i];
    const hh = Math.max(1, m * (h - 2));
    g.fillRect(x, (h - hh) / 2, 1, hh);
  }
};
