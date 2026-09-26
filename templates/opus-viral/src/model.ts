// The motion model. Everything on screen is a pure function of the frame: no state is carried between
// frames. A value that changes target many times is the SUM of one closed-form spring per change:
//   v(f) = v0 + Σ (vᵢ − vᵢ₋₁) · spring(f − tᵢ)
// Key times are written per state (scene-local), so trimming a state in Studio retimes the morph, the
// camera and the cursor together.
import { createContext, useContext } from "react";
import { spring, Internals } from "remotion";
import { FPS, SIZE } from "./theme";

export type Cfg = { damping: number; stiffness: number; mass: number };
/** the UI spring — a tiny overshoot at most (ζ ≈ 0.73) */
export const UI: Cfg = { damping: 20, stiffness: 210, mass: 0.9 };
export const SOFT: Cfg = { damping: 28, stiffness: 130, mass: 1 };
export const CURSOR: Cfg = { damping: 26, stiffness: 115, mass: 0.9 };
/** sum of springs where each change carries its own spring (the leading edge of a move is stiffer) */
export const trackCfg = (f: number, keys: Array<Key & { cfg: Cfg }>) => {
  let v = keys[0]?.v ?? 0;
  for (let i = 1; i < keys.length; i++) v += (keys[i].v - keys[i - 1].v) * sp(f, keys[i].at, keys[i].cfg);
  return v;
};
/**
 * A pill that slides between spans [left, right]: on each move the edge in the direction of travel
 * rides the stiff LEAD spring and the other the soft TRAIL spring, so it stretches ahead and catches up.
 */
export const liquid = (f: number, moves: Array<{ at: number; l: number; r: number }>) => {
  const lk: Array<Key & { cfg: Cfg }> = [], rk: Array<Key & { cfg: Cfg }> = [];
  moves.forEach((m, i) => {
    const prev = moves[i - 1];
    const right = !prev || (m.l + m.r) / 2 >= (prev.l + prev.r) / 2;
    lk.push({ at: m.at, v: m.l, cfg: right ? TRAIL : LEAD });
    rk.push({ at: m.at, v: m.r, cfg: right ? LEAD : TRAIL });
  });
  return { l: trackCfg(f, lk), r: trackCfg(f, rk) };
};
export const LEAD: Cfg = { damping: 22, stiffness: 340, mass: 0.8 };
export const TRAIL: Cfg = { damping: 24, stiffness: 140, mass: 1 };

export const sp = (f: number, at: number, cfg: Cfg = UI) => (f < at ? 0 : spring({ frame: f - at, fps: FPS, config: cfg }));
export type Key = { at: number; v: number };
/** sum-of-springs track through keys (sorted by `at`) */
export const track = (f: number, keys: Key[], cfg: Cfg = UI) => {
  let v = keys[0]?.v ?? 0;
  for (let i = 1; i < keys.length; i++) v += (keys[i].v - keys[i - 1].v) * sp(f, keys[i].at, cfg);
  return v;
};
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------------------------------------------------------------- timing context
/** absolute start frame of every state (from the SCENES table + Studio's scene edits) */
export const StartsContext = createContext<Record<string, number>>({});
export const useStarts = () => useContext(StartsContext);
/** the composition frame, from anywhere (inside scenes and clips too) */
export const useAbsFrame = () => Internals.useTimelinePosition();
export const at = (starts: Record<string, number>, scene: string, local: number) => (starts[scene] ?? 0) + local;

// ---------------------------------------------------------------- the shape
export type Fill = "ink" | "paper" | "mute";
export type ShapeKey = { s: string; at: number; w: number; h: number; r: number; fill: Fill };
/** every size/radius/colour the one shape takes, per state (scene-local frame) */
export const SHAPE: ShapeKey[] = [
  { s: "generate", at: 0, w: 240, h: 72, r: 36, fill: "ink" },
  { s: "loader", at: 0, w: 226, h: 66, r: 33, fill: "ink" },   // press
  { s: "loader", at: 5, w: 76, h: 76, r: 38, fill: "ink" },
  { s: "check", at: 0, w: 86, h: 86, r: 43, fill: "ink" },
  { s: "check", at: 6, w: 76, h: 76, r: 38, fill: "ink" },
  { s: "island", at: 0, w: 330, h: 68, r: 34, fill: "ink" },
  { s: "player", at: 0, w: 460, h: 288, r: 32, fill: "ink" },
  { s: "volume", at: 0, w: 420, h: 64, r: 32, fill: "ink" },
  { s: "toggle", at: 0, w: 136, h: 76, r: 38, fill: "ink" },
  { s: "toggle", at: 30, w: 136, h: 76, r: 38, fill: "mute" }, // flips on the beat
  { s: "tabs", at: 0, w: 440, h: 68, r: 34, fill: "paper" },
  { s: "chart", at: 0, w: 500, h: 380, r: 30, fill: "paper" },
  { s: "command", at: 0, w: 460, h: 92, r: 24, fill: "paper" },
  { s: "command", at: 26, w: 480, h: 400, r: 22, fill: "paper" },
  { s: "command", at: 62, w: 480, h: 214, r: 22, fill: "paper" }, // "f" filters to two rows
  { s: "toast", at: 0, w: 400, h: 72, r: 36, fill: "ink" },
  { s: "loop", at: 0, w: 240, h: 72, r: 36, fill: "ink" },
];
const hex = (c: string): [number, number, number] => { const h = c.replace("#", ""); const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

export const shapeAt = (f: number, starts: Record<string, number>, fills: Record<Fill, string>, cfg: Cfg = UI) => {
  const keys = SHAPE.map((k) => ({ ...k, t: at(starts, k.s, k.at) })).sort((a, b) => a.t - b.t);
  const tr = (sel: (k: ShapeKey) => number) => track(f, keys.map((k) => ({ at: k.t, v: sel(k) })), cfg);
  const rgb = [0, 1, 2].map((c) => tr((k) => hex(fills[k.fill])[c]));
  return { w: tr((k) => k.w), h: tr((k) => k.h), r: tr((k) => k.r), color: `rgb(${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(",")})`, light: rgb[0] > 160 };
};

/** camera: each state fills the frame — zoom so the shape spans `fill` of the canvas, capped */
export const cameraAt = (f: number, starts: Record<string, number>, fill = 0.68, max = 2.7) => {
  const keys = SHAPE.map((k) => ({ at: at(starts, k.s, k.at), v: Math.min(max, (fill * SIZE) / Math.max(k.w, k.h)) })).sort((a, b) => a.at - b.at);
  return track(f, keys, SOFT);
};

// ---------------------------------------------------------------- the cursor
// positions are in UI units relative to the shape's centre (the camera maps them to the screen)
export type CursorKey = { s: string; at: number; x: number; y: number };
export const CURSOR_PATH: CursorKey[] = [
  { s: "generate", at: 0, x: 170, y: 120 },
  { s: "generate", at: 12, x: 18, y: 10 },
  { s: "loader", at: 10, x: 120, y: 96 },
  { s: "island", at: 8, x: 70, y: 84 },
  { s: "player", at: 4, x: 4, y: 104 },
  { s: "player", at: 60, x: -86, y: 60 },
  { s: "player", at: 74, x: -80, y: 60 },
  { s: "player", at: 104, x: 150, y: 58 },
  { s: "volume", at: 2, x: 101, y: 6 },
  { s: "volume", at: 36, x: -110, y: 6 },
  { s: "volume", at: 62, x: 262, y: 4 },
  { s: "volume", at: 72, x: 236, y: 60 },
  { s: "toggle", at: 6, x: 14, y: 14 },
  { s: "tabs", at: 8, x: 4, y: 12 },
  { s: "tabs", at: 40, x: 142, y: 12 },
  { s: "chart", at: 10, x: 150, y: 60 },
  { s: "chart", at: 24, x: -200, y: 92 },
  { s: "chart", at: 78, x: 200, y: 4 },
  { s: "chart", at: 86, x: 2, y: -148 },
  { s: "command", at: 4, x: 220, y: 214 },
  { s: "toast", at: 10, x: 170, y: 120 }, // back to where frame 0 starts — at rest well before the loop point
];
/** mouse-button down intervals (scene-local from/to) — every click and drag */
export const PRESSES: Array<{ s: string; from: number; to: number; s2?: string }> = [
  { s: "generate", from: 28, to: 33 },   // Generate (released 3 frames into the loader)
  { s: "player", from: 28, to: 32 },     // play
  { s: "player", from: 66, to: 110 },    // grab the playhead and drag
  { s: "volume", from: 8, to: 66 },      // drag the volume down, then past max
  { s: "toggle", from: 28, to: 32 },     // toggle
  { s: "tabs", from: 28, to: 32 },       // Week
  { s: "tabs", from: 58, to: 62 },       // Month
  { s: "chart", from: 88, to: 92 },      // Week (in the chart)
];

export const cursorAt = (f: number, starts: Record<string, number>) => {
  const keys = CURSOR_PATH.map((k) => ({ t: at(starts, k.s, k.at), x: k.x, y: k.y })).sort((a, b) => a.t - b.t);
  const x = track(f, keys.map((k) => ({ at: k.t, v: k.x })), CURSOR);
  const y = track(f, keys.map((k) => ({ at: k.t, v: k.y })), CURSOR);
  const down = PRESSES.some((p) => f >= at(starts, p.s, p.from) && f < at(starts, p.s, p.to));
  return { x, y, down };
};
/** frame the n-th press of a state starts / ends (absolute) */
export const press = (starts: Record<string, number>, s: string, n = 0) => { const p = PRESSES.filter((x) => x.s === s)[n]; return { from: at(starts, s, p.from), to: at(starts, s, p.to) }; };

// ---------------------------------------------------------------- direct manipulation
// While the button is held the value is computed from the cursor; on release it stays (or springs back).
export const PROGRESS_TRACK = { x0: -200, x1: 200, y: 56 };
export const VOLUME_TRACK = { x0: -148, x1: 180 };

/** the player's progress (0–1): plays slowly after the play click, follows the cursor while scrubbing */
export const progressAt = (f: number, starts: Record<string, number>) => {
  const play = press(starts, "player", 0).from + 2, grab = press(starts, "player", 1);
  const rate = 0.0006;
  const base = (t: number) => 0.24 + Math.max(0, t - play) * rate;
  if (f < grab.from) return base(f);
  const fromCursor = (t: number) => clamp01((cursorAt(t, starts).x - PROGRESS_TRACK.x0) / (PROGRESS_TRACK.x1 - PROGRESS_TRACK.x0));
  const grabbedAt = base(grab.from), c0 = fromCursor(grab.from);
  // the playhead snaps to where the cursor holds it (it grabbed the thumb, so they start together)
  if (f < grab.to) return clamp01(grabbedAt + (fromCursor(f) - c0));
  const released = clamp01(grabbedAt + (fromCursor(grab.to) - c0));
  return clamp01(released + (f - grab.to) * rate);
};

/** volume (0–1) and over-drag in px: the slider stretches past max and springs back on release */
export const volumeAt = (f: number, starts: Record<string, number>) => {
  const drag = press(starts, "volume");
  const v0 = 0.76;
  const raw = (t: number) => (cursorAt(t, starts).x - VOLUME_TRACK.x0) / (VOLUME_TRACK.x1 - VOLUME_TRACK.x0);
  const c0 = raw(drag.from);
  const value = (t: number) => v0 + (raw(t) - c0);
  const over = (t: number) => Math.max(0, value(t) - 1) * (VOLUME_TRACK.x1 - VOLUME_TRACK.x0);
  // rubber band: pulling further gives less and less
  const band = (px: number) => 70 * (1 - Math.exp(-px / 70));
  if (f < drag.from) return { v: v0, over: 0 };
  if (f < drag.to) return { v: clamp01(value(f)), over: band(over(f)) };
  const o = band(over(drag.to));
  return { v: clamp01(value(drag.to)), over: o * (1 - sp(f, drag.to, UI)) };
};
