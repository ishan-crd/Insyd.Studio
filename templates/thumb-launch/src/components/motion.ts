import { interpolate, spring, useCurrentFrame, useVideoConfig, SpringConfig } from "remotion";
import { theme } from "../theme";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Spring progress starting at `delay` (frames).
export const useSpring = (delay: number, config: Partial<SpringConfig> = theme.spring.smooth) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
};

// Eased 0→1 between two frames.
export const useRamp = (from: number, to: number, easing = theme.ease.out) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, to], [0, 1], { easing, ...clamp });
};

// Scene-level exit: everything lifts and fades in the last `len` frames.
export const useExit = (len = 8, lift = -40) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = interpolate(frame, [durationInFrames - len, durationInFrames - 1], [0, 1], {
    easing: theme.ease.in, ...clamp,
  });
  return { opacity: 1 - p, y: p * lift, p };
};

export const typed = (text: string, start: number, frame: number, cpf = 0.9) =>
  text.slice(0, Math.max(0, Math.floor((frame - start) * cpf)));

export const hash = (i: number, j: number) => {
  const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
