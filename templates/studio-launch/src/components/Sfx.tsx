import React from "react";
import { Sound, type SoundKind } from "../insyd";

export type SfxName = "whoosh" | "swish" | "glitch" | "decode" | "impact" | "click" | "key" | "pop" | "tick" | "shimmer" | "riser" | "hum" | "blip";
const LABEL: Record<SfxName, string> = {
  whoosh: "Whoosh", swish: "Swish", glitch: "Glitch", decode: "Decode chatter", impact: "Impact", click: "Click", key: "Key",
  pop: "Pop", tick: "Tick", shimmer: "Shimmer", riser: "Riser", hum: "Monitor hum", blip: "Blip",
};

// Every sound is an editable <Sound>: Studio shows it on the audio tracks and can re-time, replace,
// re-level, speed up or mute it — saved back as shift / src / volume / muted props right here.
export type SfxProps = {
  id: string; name: SfxName; at: number; volume?: number;
  /** frames the sound starts BEFORE the visual (early feels synced) */
  lead?: number;
  shift?: number; src?: string; muted?: boolean; kind?: SoundKind; speed?: number;
};
export const Sfx: React.FC<SfxProps> = ({ id, name, at, volume = 0.5, lead = 1, shift, src, muted, kind = "sfx", speed }) => (
  <Sound id={id} label={LABEL[name]} kind={kind} src={src ?? `sfx/${name}.wav`} at={Math.max(0, at - lead)} volume={volume} shift={shift} muted={muted} speed={speed} />
);

/** A run of keystrokes while text is typed (one clip, repeated). */
export const KeyTicks: React.FC<{ id: string; from: number; count: number; every?: number; volume?: number; shift?: number; src?: string; muted?: boolean }> = ({
  id, from, count, every = 2, volume = 0.22, shift, src, muted,
}) => <Sound id={id} label={`Keys ×${count}`} kind="sfx" src={src ?? "sfx/key.wav"} at={from} volume={volume} repeat={count} every={every} shift={shift} muted={muted} />;
