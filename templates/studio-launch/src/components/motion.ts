import { interpolate, spring, useCurrentFrame, useVideoConfig, type SpringConfig } from "remotion";
import { theme } from "../theme";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const useSpring = (delay: number, config: Partial<SpringConfig> = theme.spring.smooth) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
};

/** eased 0→1 between two frames */
export const ramp = (frame: number, from: number, to: number, easing = theme.ease.out) =>
  interpolate(frame, [from, to], [0, 1], { easing, ...clamp });

/** scene-level exit progress over the last `len` frames */
export const useExitP = (len = 10) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(frame, [durationInFrames - len, durationInFrames - 1], [0, 1], { easing: theme.ease.in, ...clamp });
};

export const typed = (text: string, start: number, frame: number, cpf = 0.9) =>
  text.slice(0, Math.max(0, Math.floor((frame - start) * cpf)));

export const hash = (i: number, j: number) => { const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return x - Math.floor(x); };

/** idle breathing: tiny sin drift so nothing is ever perfectly frozen */
export const breathe = (frame: number, amp = 1, period = 90, phase = 0) => Math.sin(((frame + phase) / period) * Math.PI * 2) * amp;
