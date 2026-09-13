import type { PlayerRef } from "@remotion/player";
import { createRef } from "react";
// One shared handle so transport, keyboard and timeline can drive the Player.
export const playerRef = createRef<PlayerRef>();
/** hidden player used only to analyze when elements are on screen */
export const scanPlayerRef = createRef<PlayerRef>();
if (typeof window !== "undefined") Object.defineProperty(window, "__insydPlayer", { get: () => playerRef.current });
export const seek = (f: number) => playerRef.current?.seekTo(Math.max(0, Math.round(f)));
export const nextFrames = (n = 2) => new Promise<void>((res) => {
  const step = (k: number) => (k <= 0 ? res() : requestAnimationFrame(() => step(k - 1)));
  step(n);
});
