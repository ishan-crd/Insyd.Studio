import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { useSpring } from "./motion";
import { animAt, type AnimSpec } from "../insyd";
import { useBeatPulse } from "../music";

// Notion-style mascot: the thumb inside a cream circle with a pixel-thick outline.
export const Mascot: React.FC<{ size: number; delay?: number; float?: boolean; style?: React.CSSProperties; anim?: AnimSpec }> = ({
  size, delay = 0, float = true, style, anim,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = anim ? animAt(anim, frame, fps) : null;
  const p = a ? a.p : useSpring(delay, theme.spring.bouncy);
  const y = float ? Math.sin((frame - (anim?.delay ?? delay)) / 26) * size * 0.012 : 0;
  const rot = a ? a.rotate : interpolate(p, [0, 1], [-14, 0]);
  const pulse = useBeatPulse();
  const sc = (a ? a.scale : interpolate(p, [0, 1], [0.6, 1])) * (1 + pulse * 0.035);
  const op = a ? a.opacity : p;
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", background: theme.colors.cream,
        border: `${Math.max(4, size * 0.018)}px solid ${theme.colors.ink}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: op, transform: `translateY(${y}px) scale(${sc}) rotate(${rot}deg)`,
        boxShadow: "0 30px 60px -20px rgba(0,0,0,0.35)",
        ...style,
      }}
    >
      <Img src={staticFile("thumb.png")} style={{ height: size * 0.62, imageRendering: "pixelated" }} />
    </div>
  );
};
