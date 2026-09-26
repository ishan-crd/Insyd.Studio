import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { PixelThumb } from "./PixelThumb";
import { clamp } from "./motion";

// Expanding ring where a tap landed.
export const Ripple: React.FC<{ x: number; y: number; at: number; size?: number; color?: string }> = ({
  x, y, at, size = 120, color = theme.colors.hero,
}) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const s = interpolate(frame, [at, at + 18], [0.2, 1], { easing: theme.ease.out, ...clamp });
  const o = interpolate(frame, [at, at + 18], [0.9, 0], { easing: theme.ease.out, ...clamp });
  return (
    <div
      style={{
        position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: "50%",
        border: `${size * 0.06}px solid ${color}`, opacity: o, transform: `scale(${s})`, pointerEvents: "none",
      }}
    />
  );
};

// The brand gesture: the pixel thumb rises from below the frame, presses at (x, y), retreats.
// `at` is the frame the press lands. Container must be position: relative/absolute with known size.
export const TapThumb: React.FC<{ x: number; y: number; at: number; cell?: number; rise?: number; hold?: number; containerHeight: number }> = ({
  x, y, at, cell = 7, rise = 18, hold = 8, containerHeight,
}) => {
  const frame = useCurrentFrame();
  const w = 17 * cell, h = 33 * cell;
  const start = at - rise, end = at + hold + rise;
  if (frame < start || frame > end + 4) return null;
  // travel: from below the container to the target (tip of the nail at x,y), slight lean
  const up = interpolate(frame, [start, at], [0, 1], { easing: theme.ease.out, ...clamp });
  const down = interpolate(frame, [at + hold, end], [0, 1], { easing: theme.ease.in, ...clamp });
  const t = up - down;
  const restY = containerHeight + 40;
  const tipY = y - cell * 1.5; // nail tip sits just above the target point
  const top = interpolate(t, [0, 1], [restY, tipY]);
  const press = interpolate(frame, [at - 3, at, at + 4], [0, 1, 0], clamp); // squash on contact
  return (
    <div
      style={{
        position: "absolute", left: x - w / 2, top, width: w, height: h,
        transform: `rotate(${interpolate(t, [0, 1], [8, -4])}deg) scaleY(${1 - press * 0.06})`, transformOrigin: "50% 0%",
        filter: "drop-shadow(0 30px 30px rgba(0,0,0,0.35))",
      }}
    >
      <PixelThumb cell={cell} mode="static" />
    </div>
  );
};
