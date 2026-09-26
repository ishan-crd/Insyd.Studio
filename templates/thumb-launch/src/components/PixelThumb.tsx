import React, { useLayoutEffect, useRef } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import grid from "../thumbGrid.json";
import { theme } from "../theme";
import { hash } from "./motion";

type Cell = [number, number, string];
const cells = grid.cells as Cell[];
export const THUMB_COLS = grid.cols;
export const THUMB_ROWS = grid.rows;

// The brand mark, rebuilt pixel by pixel. `cell` is the size of one pixel.
// mode "build": pixels pop in from the bottom up with a little jitter.
// mode "static": fully assembled.
// Drawn on a canvas: 477 individually animated DOM nodes were the single most
// expensive thing to paint at 30fps in the browser preview.
export const PixelThumb: React.FC<{
  cell: number;
  delay?: number;
  mode?: "build" | "static";
  perRow?: number;
  jitter?: number;
  style?: React.CSSProperties;
}> = ({ cell, delay = 0, mode = "build", perRow = 1.1, jitter = 4, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const w = THUMB_COLS * cell;
  const h = THUMB_ROWS * cell;

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    for (const [i, j, c] of cells) {
      let s = 1, o = 1, y = 0;
      if (mode === "build") {
        const d = delay + (THUMB_ROWS - 1 - j) * perRow + hash(i, j) * jitter;
        const p = spring({ frame: frame - d, fps, config: theme.spring.pixel });
        if (p <= 0) continue;
        s = interpolate(p, [0, 1], [0.2, 1]);
        o = interpolate(p, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
        y = interpolate(p, [0, 1], [cell * 0.8, 0]);
      }
      const size = (cell + 0.6) * s;
      const cx = i * cell + (cell + 0.6) / 2;
      const cy = j * cell + (cell + 0.6) / 2 + y;
      ctx.globalAlpha = o;
      ctx.fillStyle = c;
      ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }, [frame, fps, cell, delay, mode, perRow, jitter, w, h]);

  return <canvas ref={ref} width={w} height={h} style={{ display: "block", width: w, height: h, ...style }} />;
};

// How many frames until the last pixel has landed (+ settle).
export const thumbBuildLength = (perRow = 1.1, jitter = 4) =>
  Math.ceil((THUMB_ROWS - 1) * perRow + jitter + 14);
