import React, { useLayoutEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

// The film's signature look: everything is drawn as monospaced glyphs on a character grid.
// <AsciiField> renders procedural textures (terrain waves, diamond knit, quarter-circle tiles,
// ripples); <AsciiWord> renders giant words out of glyphs with a cylindrical bulge and
// chromatic fringing. Both are plain canvases redrawn every frame — deterministic, render-safe.

const W = 1920, H = 1080;
const RAMP = " .·:;i|l!|1YΣ";

// ---------------------------------------------------------------- deterministic noise
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (t: number) => t * t * (3 - 2 * t);
export const noise2 = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  const u = smooth(xf), v = smooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x: number, y: number) => noise2(x, y) * 0.6 + noise2(x * 2.1, y * 2.1) * 0.28 + noise2(x * 4.3, y * 4.3) * 0.12;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const useCanvas = (draw: (ctx: CanvasRenderingContext2D) => void, deps: unknown[]) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    draw(ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
};

// ---------------------------------------------------------------- field
export type FieldMode = "wave" | "diamond" | "tiles" | "ripple" | "haze";
const TILE_COLORS = ["#8C3B35", "#2F4E7A", "#6E7A3A", "#C9B58A", "#3A6E66"];

export const AsciiField: React.FC<{
  mode: FieldMode;
  color?: string;
  /** 0–1 brightness multiplier (fade the field in and out with this) */
  amount?: number;
  cell?: number;
  speed?: number;
  /** vertical camera drift in rows per second */
  drift?: number;
  style?: React.CSSProperties;
}> = ({ mode, color = theme.colors.field, amount = 1, cell = 12, speed = 1, drift = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * speed;
  const ref = useCanvas((ctx) => {
    if (amount <= 0.001) return;
    const cw = cell, ch = Math.round(cell * 1.65);
    const cols = Math.ceil(W / cw), rows = Math.ceil(H / ch);
    const [r, g, b] = hexToRgb(color);
    ctx.font = `500 ${Math.round(ch * 0.82)}px "JetBrains Mono", monospace`;
    ctx.textBaseline = "top";
    for (let j = 0; j < rows; j++) {
      const v = j / rows;
      for (let i = 0; i < cols; i++) {
        const u = i / cols;
        let k = 0; let col: [number, number, number] = [r, g, b];
        if (mode === "wave") {
          // a lit terrain rolling under a dark sky
          const hz = 0.6 + 0.07 * Math.sin(u * 5.2 + t * 0.7) + 0.05 * Math.sin(u * 11 - t * 1.1) + 0.06 * (fbm(u * 3 + t * 0.15, 2.3) - 0.5);
          const d = v - hz;
          const ridge = Math.exp(-((d * 30) ** 2)) * (0.45 + 0.55 * fbm(u * 14 - t * 0.5, 7.1));
          // body: lit near the ridge, falling off with depth, broken up by two octaves of noise
          const light = Math.max(0, 1 - d * 1.6) * (0.35 + 0.65 * Math.exp(-d * 5));
          const body = d > 0 ? light * 1.25 * (0.2 + 0.8 * fbm(u * 11 + t * 0.25, v * 18 - t * 0.5 + drift * t)) : 0;
          const sky = d < 0 ? 0.08 * fbm(u * 6, v * 6 + t * 0.2) * Math.max(0, 1 + d * 2.5) : 0;
          k = Math.max(ridge * 0.9, body, sky) + (hash(i, j + Math.floor(t * 8)) - 0.5) * 0.18;
          if (ridge > 0.55) col = [Math.min(255, r + 110), Math.min(255, g + 80), Math.min(255, b + 80)];
        } else if (mode === "diamond") {
          // knitted diamond texture, dim grey
          const x = u * 18 + Math.sin(t * 0.3) * 0.4, y = v * 10.5;
          const dx = Math.abs((x % 1) - 0.5), dy = Math.abs((y % 1) - 0.5);
          const edge = Math.abs(dx + dy - 0.35);
          k = (edge < 0.08 ? 0.5 : 0.14) * (0.6 + 0.4 * fbm(u * 5, v * 5 + t * 0.2));
          col = [150, 156, 152];
        } else if (mode === "tiles") {
          // quarter-circle tiles in muted colours (the "designer" texture)
          const tx = u * 8, ty = v * 4.5; const ix = Math.floor(tx), iy = Math.floor(ty);
          const fx = tx - ix, fy = ty - iy; const rot = Math.floor(hash(ix, iy) * 4);
          const cx = rot & 1 ? 1 - fx : fx, cy = rot & 2 ? 1 - fy : fy;
          const inside = Math.hypot(cx, cy) < 0.95;
          const pal = TILE_COLORS[Math.floor(hash(ix + (inside ? 7 : 0), iy) * TILE_COLORS.length)];
          col = hexToRgb(pal);
          k = (inside ? 0.85 : 0.45) * (0.75 + 0.25 * Math.sin(t * 2 + ix + iy));
        } else if (mode === "ripple") {
          const dx = (u - 0.5) * 1.78, dy = v - 0.5; const rr = Math.hypot(dx, dy);
          k = (0.5 + 0.5 * Math.sin(rr * 38 - t * 4)) * Math.exp(-rr * 2.6) * 0.8;
        } else {
          // haze: a dim vertical light shaft with grain (end card)
          const shaft = Math.exp(-(((u - 0.72) * 3.2) ** 2)) * (0.55 + 0.45 * v);
          k = shaft * (0.25 + 0.5 * fbm(u * 20, v * 20 + t * 0.5)) * 0.6 + 0.04 * hash(i, j + Math.floor(t * 12));
        }
        k = clamp01(k * amount);
        if (k < 0.04) continue;
        const gi = Math.min(RAMP.length - 1, Math.floor(k * RAMP.length));
        const chr = RAMP[gi];
        if (chr === " ") continue;
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${(0.25 + 0.75 * k).toFixed(3)})`;
        ctx.fillText(chr, i * cw, j * ch);
      }
    }
  }, [frame, mode, color, amount, cell, speed, drift]);
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...style }} />;
};

// ---------------------------------------------------------------- giant glyph word
const scratch = typeof document !== "undefined" ? document.createElement("canvas") : null;

export const AsciiWord: React.FC<{
  text: string;
  /** cap height of the word in output pixels */
  size?: number;
  font?: string;
  weight?: number;
  /** glyphs used to build the letters */
  glyphs?: string;
  color?: string;
  /** 0 → 1 build-in; the word assembles from scattered glyphs */
  reveal?: number;
  /** 0 → 1 break-apart at the end */
  exit?: number;
  bulge?: number;
  fringe?: number;
  cell?: number;
  y?: number;
  style?: React.CSSProperties;
}> = ({ text, size = 330, font = theme.fonts.display, weight = 800, glyphs = "YΣ¥*", color = theme.colors.ink, reveal = 1, exit = 0, bulge = 0.22, fringe = 3, cell = 13, y = 0.5, style }) => {
  const frame = useCurrentFrame();
  const ref = useCanvas((ctx) => {
    if (!scratch || reveal <= 0 || exit >= 1) return;
    const cw = cell, ch = Math.round(cell * 1.55);
    const cols = Math.ceil(W / cw), rows = Math.ceil(H / ch);
    // 1. rasterise the word at grid resolution (cells are taller than wide, so squash vertically)
    scratch.width = cols; scratch.height = rows;
    const s = scratch.getContext("2d", { willReadFrequently: true })!;
    s.clearRect(0, 0, cols, rows);
    s.save(); s.scale(1 / cw, 1 / ch);
    s.fillStyle = "#fff"; s.textAlign = "center"; s.textBaseline = "middle";
    s.font = `${weight} ${size}px "${font}", sans-serif`;
    s.fillText(text, W / 2, H * y);
    s.restore();
    const px = s.getImageData(0, 0, cols, rows).data;
    const at = (c: number, r: number) => (c < 0 || r < 0 || c >= cols || r >= rows ? 0 : px[(Math.floor(r) * cols + Math.floor(c)) * 4 + 3] / 255);
    // 2. draw glyphs, sampling through a cylindrical bulge (centre closer to the camera)
    ctx.font = `700 ${Math.round(ch * 0.86)}px "JetBrains Mono", monospace`;
    ctx.textBaseline = "top";
    const [r, g, b] = hexToRgb(color);
    const cy = rows * y;
    const tick = Math.floor(frame / 2);
    for (let j = 0; j < rows; j++) {
      // per-row glitch offset while building / breaking
      const unstable = Math.max(1 - reveal, exit);
      const shift = unstable > 0.02 && hash(j, tick) > 0.8 ? Math.round((hash(tick, j) - 0.5) * 40 * unstable) : 0;
      for (let i = 0; i < cols; i++) {
        const u = (i / cols - 0.5) * 2;
        const lift = 1 + bulge * (1 - u * u);
        const srcR = cy + (j - cy) / lift;
        const srcC = cols / 2 + (i - cols / 2) * (1 - bulge * 0.18 * (1 - u * u));
        const a = at(srcC + shift, srcR);
        if (a < 0.35) continue;
        // assemble / disassemble per cell with a noise threshold
        const n = hash(i * 0.37, j * 1.3);
        if (n > reveal) continue;
        if (exit > 0 && n < exit) continue;
        const gch = glyphs[Math.floor(hash(i, j) * glyphs.length)];
        const x = i * cw, yy = j * ch;
        if (fringe > 0) {
          ctx.fillStyle = "rgba(255,40,90,0.55)"; ctx.fillText(gch, x - fringe, yy);
          ctx.fillStyle = "rgba(40,230,255,0.55)"; ctx.fillText(gch, x + fringe, yy);
        }
        const edge = a < 0.8 ? 0.55 : 1;
        ctx.fillStyle = `rgba(${r},${g},${b},${edge})`;
        ctx.fillText(gch, x, yy);
      }
    }
  }, [frame, text, size, font, weight, glyphs, color, reveal, exit, bulge, fringe, cell, y]);
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...style }} />;
};
