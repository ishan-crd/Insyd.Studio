export const timecode = (frame: number, fps: number) => {
  const s = Math.max(0, frame) / fps;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const f = Math.round(frame % fps);
  return `${m}:${String(sec).padStart(2, "0")}.${String(f).padStart(2, "0")}`;
};
export const seconds = (frames: number, fps: number) => `${(frames / fps).toFixed(2)}s`;
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const round = (v: number, d = 0) => { const p = 10 ** d; return Math.round(v * p) / p; };
