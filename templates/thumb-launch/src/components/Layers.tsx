import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";

// Bottom layer: warm paper with two slow-drifting soft blobs so it is never flat.
export const Paper: React.FC<{ color?: string }> = ({ color = theme.colors.bg }) => {
  const frame = useCurrentFrame();
  const d1 = Math.sin(frame / 90) * 60;
  const d2 = Math.cos(frame / 110) * 50;
  return (
    <AbsoluteFill style={{ background: color }}>
      {/* blobs move via transform so the blurred layer is rasterized once and composited */}
      <div
        style={{
          position: "absolute", width: 1400, height: 1400, borderRadius: "50%",
          top: -700, left: -400, filter: "blur(90px)", willChange: "transform",
          transform: `translate3d(${d1}px, ${d2}px, 0)`,
          background: `radial-gradient(circle, rgba(255,255,255,0.55), transparent 62%)`,
        }}
      />
      <div
        style={{
          position: "absolute", width: 1100, height: 1100, borderRadius: "50%",
          bottom: -600, right: -300, filter: "blur(100px)", willChange: "transform",
          transform: `translate3d(${-d2}px, ${d1}px, 0)`,
          background: `radial-gradient(circle, rgba(233,87,63,0.07), transparent 65%)`,
        }}
      />
    </AbsoluteFill>
  );
};

// Above content: unifies everything into one warm look.
export const Grade: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill style={{ backgroundColor: theme.colors.hero, mixBlendMode: "soft-light", opacity: 0.07 }} />
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, rgba(0,0,0,0.035), transparent 25%, transparent 75%, rgba(0,0,0,0.06))",
      }}
    />
  </AbsoluteFill>
);

export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden", opacity: 0.04, mixBlendMode: "multiply" }}>
      <div
        style={{
          position: "absolute", left: -220, top: -220, right: -220, bottom: -220,
          backgroundImage: noise, backgroundSize: "220px", willChange: "transform",
          transform: `translate3d(${(frame * 7) % 220}px, ${(frame * 13) % 220}px, 0)`,
        }}
      />
    </AbsoluteFill>
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background: "radial-gradient(ellipse at center, transparent 58%, rgba(30,20,10,0.13) 100%)",
    }}
  />
);

export const Finish: React.FC = () => (
  <>
    <Grade />
    <Grain />
    <Vignette />
  </>
);
