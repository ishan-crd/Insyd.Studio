import React from "react";
import { interpolate } from "remotion";
import { SIZE } from "../theme";
import { useAbsFrame, useStarts, cameraAt } from "../model";
import { useClip } from "../insyd";

// The camera: a layer centred on the canvas and scaled so the current state fills the frame. The shape
// and every state's content render in this same space (UI px, origin = the shape's centre), so they
// always line up. No will-change anywhere: text re-rasterises crisply at every zoom.
export const CameraContext = React.createContext({ fill: 0.68, max: 2.7 });
export const Camera: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useAbsFrame();
  const starts = useStarts();
  const { fill, max } = React.useContext(CameraContext);
  const z = cameraAt(f, starts, fill, max);
  return (
    <div style={{ position: "absolute", left: SIZE / 2, top: SIZE / 2, width: 0, height: 0, transform: `scale(${z})`, transformOrigin: "0 0" }}>
      {children}
    </div>
  );
};

/** The shape's live rect (UI px, centred) — content is clipped to it and can anchor to its edges. */
export type ShapeRect = { w: number; h: number; r: number; dx: number };
export const ShapeContext = React.createContext<ShapeRect>({ w: 240, h: 72, r: 36, dx: 0 });
export const useShape = () => React.useContext(ShapeContext);
/** Clip content to the shape, so a growing shape reveals what's inside and nothing ever pokes out. */
export const InShape: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const s = useShape();
  return (
    <div style={{ position: "absolute", left: -s.w / 2 + s.dx, top: -s.h / 2, width: s.w, height: s.h, borderRadius: Math.min(s.r, s.h / 2), overflow: "hidden" }}>
      <div style={{ position: "absolute", left: s.w / 2 - s.dx, top: s.h / 2, width: 0, height: 0 }}>{children}</div>
    </div>
  );
};

/** Place a child with its centre at (x, y) in UI px. */
export const At: React.FC<{ x?: number; y?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ x = 0, y = 0, children, style }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", ...style }}>{children}</div>
);
/** Place a child with its left-centre at (x, y). */
export const AtLeft: React.FC<{ x?: number; y?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ x = 0, y = 0, children, style }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translateY(-50%)", ...style }}>{children}</div>
);

/**
 * Content swaps with a short blur: in over `enter` frames from the clip's first frame, out over `exit`
 * frames into its last. Each piece of content has its own clip, so text never overlaps its successor.
 */
export const Swap: React.FC<{ enter?: number; exit?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ enter = 7, exit = 6, children, style }) => {
  const { frame, end } = useClip();
  const inP = enter > 0 ? interpolate(frame, [0, enter], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const outP = end === Infinity || exit <= 0 ? 0 : interpolate(frame, [end + 1 - exit, end + 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vis = inP * (1 - outP);
  const e = (t: number) => 1 - (1 - t) ** 3; // ease-out cubic (no bounce)
  const blur = (1 - e(inP)) * 8 + outP * 8;
  return <div style={{ opacity: e(vis), filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined, transform: `scale(${0.97 + 0.03 * e(vis)})`, ...style }}>{children}</div>;
};
