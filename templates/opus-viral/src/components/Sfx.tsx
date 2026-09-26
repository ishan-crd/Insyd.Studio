import React from "react";
import { Sound } from "../insyd";

export type SfxName = "tap" | "release" | "morph" | "done" | "toggle" | "key" | "scrub" | "stretch";
const LABEL: Record<SfxName, string> = { tap: "Click", release: "Release", morph: "Morph", done: "Done", toggle: "Toggle", key: "Key", scrub: "Scrub tick", stretch: "Stretch" };

// Every sound is an editable <Sound> on Studio's audio tracks: re-time, re-level, replace or mute it.
export const Sfx: React.FC<{ id: string; name: SfxName; at: number; volume?: number; shift?: number; src?: string; muted?: boolean }> = ({ id, name, at, volume = 0.5, shift, src, muted }) => (
  <Sound id={id} label={LABEL[name]} kind="sfx" src={src ?? `sfx/${name}.wav`} at={Math.max(0, at)} volume={volume} shift={shift} muted={muted} />
);
/** a run of repeated ticks (typing, scrubbing) as one clip */
export const KeyTicks: React.FC<{ id: string; name: SfxName; from: number; count: number; every: number; volume?: number; shift?: number; src?: string; muted?: boolean }> = ({ id, name, from, count, every, volume = 0.3, shift, src, muted }) => (
  <Sound id={id} label={`${LABEL[name]} ×${count}`} kind="sfx" src={src ?? `sfx/${name}.wav`} at={from} volume={volume} repeat={count} every={every} shift={shift} muted={muted} />
);
