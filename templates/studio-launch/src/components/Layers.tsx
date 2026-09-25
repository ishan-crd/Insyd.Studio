import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { hash } from "./motion";

// Finishing layers over the whole film: film grain, vignette and faint scanlines.
export const Grain: React.FC<{ amount?: number }> = ({ amount = 0.08 }) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2) % 8;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: amount, mixBlendMode: "screen" }}>
      <svg width="100%" height="100%">
        <filter id={`g${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter={`url(#g${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.75 }) => (
  <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse 75% 70% at 50% 50%, transparent 45%, rgba(0,0,0,${strength}) 100%)` }} />
);

export const Scanlines: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none", opacity: 0.12, backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.9) 0 1px, transparent 1px 3px)" }} />
);

/** A 6-frame digital tear used on cuts: displaced slices + RGB split + a flash of noise bars. */
export const GlitchCut: React.FC<{ len?: number }> = ({ len = 6 }) => {
  const frame = useCurrentFrame();
  if (frame < 0 || frame >= len) return null;
  const k = 1 - Math.abs(frame - len / 2) / (len / 2);
  const bars = Array.from({ length: 9 }, (_, i) => {
    const y = hash(i, frame) * 100, h = 1 + hash(frame, i) * 7;
    const x = (hash(i * 3, frame) - 0.5) * 30;
    const c = i % 3 === 0 ? "rgba(255,40,120,0.5)" : i % 3 === 1 ? "rgba(40,230,255,0.45)" : "rgba(255,255,255,0.35)";
    return <div key={i} style={{ position: "absolute", left: `${x}%`, width: "100%", top: `${y}%`, height: `${h}%`, background: c, mixBlendMode: "screen" }} />;
  });
  return <AbsoluteFill style={{ pointerEvents: "none", opacity: k }}>{bars}</AbsoluteFill>;
};
