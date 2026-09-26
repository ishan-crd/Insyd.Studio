import React from "react";
import { AbsoluteFill, Freeze, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Motion blur for a loop: `samples` sub-frames across the shutter, averaged. Unlike Remotion's
 * CameraMotionBlur (which drops sub-frames near frame 0), sub-frames before 0 wrap to the end of the
 * film — the same moment in a loop — so every frame, including the first, is composited identically
 * and the last frame is the first frame.
 */
export const LoopMotionBlur: React.FC<{ samples?: number; shutterAngle?: number; children: React.ReactNode }> = ({ samples = 4, shutterAngle = 180, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const shutter = shutterAngle / 360;
  return (
    <AbsoluteFill style={{ isolation: "isolate" }}>
      {Array.from({ length: samples }, (_, i) => {
        const t = frame - shutter * (i / samples);
        const wrapped = t < 0 ? t + durationInFrames : t;
        return (
          <AbsoluteFill key={i} style={{ mixBlendMode: "plus-lighter", filter: `opacity(${1 / samples})` }}>
            <Freeze frame={wrapped}>{children}</Freeze>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
