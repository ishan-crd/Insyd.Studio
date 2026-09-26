import React from "react";
import { Sound, type SoundKind } from "../insyd";

export type SfxName = "whoosh" | "pop" | "pop-soft" | "click" | "thump" | "chime" | "riser";
const LABEL: Record<SfxName, string> = { whoosh: "Whoosh", pop: "Pop", "pop-soft": "Soft pop", click: "Click", thump: "Thump", chime: "Chime", riser: "Riser" };

// Every sound is an editable <Sound>: the editor shows it on the audio tracks and can re-time,
// replace, re-level or mute it (saved back as shift / src / volume / muted props here).
export type SfxProps = {
  id: string; name: SfxName; at: number; volume?: number;
  /** frames the sound starts BEFORE the visual (early feels synced) */
  lead?: number;
  shift?: number; src?: string; muted?: boolean; kind?: SoundKind;
};
export const Sfx: React.FC<SfxProps> = ({ id, name, at, volume = 0.6, lead = 2, shift, src, muted, kind = "sfx" }) => (
  <Sound id={id} label={LABEL[name]} kind={kind} src={src ?? `sfx/${name}.wav`} at={Math.max(0, at - lead)} volume={volume} shift={shift} muted={muted} />
);

export const KeyTicks: React.FC<{ id: string; from: number; count: number; every?: number; volume?: number; shift?: number; src?: string; muted?: boolean }> = ({
  id, from, count, every = 2, volume = 0.18, shift, src, muted,
}) => (
  <Sound id={id} label={`Key ticks ×${count}`} kind="sfx" src={src ?? "sfx/click.wav"} at={from} volume={volume} repeat={count} every={every} shift={shift} muted={muted} />
);
