// Beat grid for "Wannabe" (public/music/wannabe.mp3), measured with librosa:
// 112.3 BPM, first beat at 0.26 s, downbeat every 4th beat starting at 1.32 s, 50.43 s long.
// Every scene cut and every key hit in the film sits on this grid.
import { Internals, useCurrentFrame } from "remotion";
import { FPS } from "./theme";

export const SONG_SECONDS = 50.43;
export const SONG_FRAMES = Math.round(SONG_SECONDS * FPS); // 1513
export const BEAT_SECONDS = 60 / 112.3;
export const BEAT_FRAMES = BEAT_SECONDS * FPS; // ≈16.02
export const BAR_FRAMES = BEAT_FRAMES * 4; // ≈64.1
const FIRST_BEAT = 0.26 * FPS;
const FIRST_DOWNBEAT = 1.32 * FPS;

/** Absolute frame of downbeat n (n = 0 is the first bar at 1.32 s). */
export const downbeat = (n: number) => Math.round(FIRST_DOWNBEAT + n * BAR_FRAMES);
/** Absolute frame of beat n (n = 0 is the first beat at 0.26 s). */
export const beat = (n: number) => Math.round(FIRST_BEAT + n * BEAT_FRAMES);

/** Frames since the most recent beat, for an absolute frame. */
export const sinceBeat = (absFrame: number) => {
  const k = Math.floor((absFrame - FIRST_BEAT) / BEAT_FRAMES);
  return absFrame - (FIRST_BEAT + k * BEAT_FRAMES);
};

/**
 * A soft pulse (1 → 0) that fires on every beat — used to make brand marks breathe with the music.
 * Uses the absolute timeline position so it stays in sync regardless of the scene it is in.
 */
export const useBeatPulse = (decay = 7) => {
  const local = useCurrentFrame();
  const abs = Internals.useTimelinePosition();
  const s = sinceBeat(abs);
  if (s < 0 || Number.isNaN(local)) return 0;
  return Math.exp(-s / decay);
};
