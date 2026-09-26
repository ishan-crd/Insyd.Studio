import React from "react";
import { SIZE } from "../theme";
import { useAbsFrame, useStarts, cursorAt, cameraAt, sp, PRESSES, at } from "../model";
import { CameraContext } from "./Stage";

// The cursor lives outside the camera (it stays the same size on screen) but is positioned through it.
// Its path and presses are in model.ts; a press dips it slightly (no ripples, no bursts).
export const Cursor: React.FC<{ size?: number }> = ({ size = 30 }) => {
  const f = useAbsFrame();
  const starts = useStarts();
  const { fill, max } = React.useContext(CameraContext);
  const z = cameraAt(f, starts, fill, max);
  const c = cursorAt(f, starts);
  // press depth: a spring in on mouse-down and out on mouse-up, summed over every press
  let depth = 0;
  for (const p of PRESSES) depth += sp(f, at(starts, p.s, p.from)) - sp(f, at(starts, p.s, p.to));
  const x = SIZE / 2 + c.x * z, y = SIZE / 2 + c.y * z;
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 20 24" style={{ position: "absolute", left: x - size * 0.12, top: y - size * 0.06, transform: `scale(${1 - 0.12 * depth})`, transformOrigin: "12% 6%", overflow: "visible", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.28))" }}>
      <path d="M2.5 1.8v17.4l4.6-4.4 3 6.6 3.1-1.4-3-6.4h6.3z" fill="#0A0A0A" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
};
