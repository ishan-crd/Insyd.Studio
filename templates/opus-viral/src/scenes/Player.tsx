import React from "react";
import { theme } from "../theme";
import { At, AtLeft, Swap } from "../components/Stage";
import { PlayPause, Prev, Next } from "../components/Icons";
import { Sfx, KeyTicks } from "../components/Sfx";
import { Editable, useCopy, useClip, edit } from "../insyd";
import { useAbsFrame, useStarts, progressAt, press, sp, PROGRESS_TRACK } from "../model";

const Art: React.FC<{ size: number; radius: number }> = ({ size, radius }) => (
  <div style={{ width: size, height: size, borderRadius: radius, background: `linear-gradient(145deg, ${theme.colors.artA}, #F2557A 55%, ${theme.colors.artB})` }} />
);

/** four equalizer bars, a pure function of the clip's frame */
const Eq: React.FC = () => {
  const { frame } = useClip();
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center", height: 22 }}>
      {[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ width: 3, borderRadius: 2, background: theme.colors.paper, height: 6 + 14 * (0.5 + 0.5 * Math.sin(frame * 0.32 + i * 1.7)) }} />)}
    </div>
  );
};

// beat 3 · the check stretches into a dynamic island: artwork + a live equalizer
export const SceneIsland: React.FC = () => (
  <>
    <Editable id="island.art" label="Island artwork" delay={5} trimOut={29} style={{ position: "absolute", left: -155, top: -24, width: 48, height: 48 }}><div style={{ position: "absolute", left: 155, top: 24 }}>
      <Swap enter={7} exit={6}><At x={-131}><Art size={edit("island.art.size", 40, { label: "Size", min: 20, max: 60, step: 1, unit: "px" })} radius={10} /></At></Swap>
    </div></Editable>
    <Editable id="island.eq" label="Equalizer" delay={7} trimOut={27} style={{ position: "absolute", left: 108, top: -16, width: 42, height: 32 }}><div style={{ position: "absolute", left: -108, top: 16 }}>
      <Swap enter={7} exit={6}><At x={128}><Eq /></At></Swap>
    </div></Editable>
    <Sfx id="island.sfx.morph" name="morph" at={0} volume={0.35} />
  </>
);

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** progress bar + times: the value comes from the model (plays, then follows the cursor while scrubbing) */
const Progress: React.FC<{ length: number }> = ({ length }) => {
  const f = useAbsFrame();
  const starts = useStarts();
  const p = progressAt(f, starts);
  const grab = press(starts, "player", 1);
  const held = sp(f, grab.from) - sp(f, grab.to); // the thumb grows while held
  const { x0, x1, y } = PROGRESS_TRACK, w = x1 - x0;
  const mono: React.CSSProperties = { fontFamily: `"${theme.fonts.mono}", monospace`, fontSize: 12, color: theme.colors.mute };
  return (
    <>
      <div style={{ position: "absolute", left: x0, top: y - 2, width: w, height: 4, borderRadius: 2, background: "rgba(255,255,255,.18)" }} />
      <div style={{ position: "absolute", left: x0, top: y - 2, width: p * w, height: 4, borderRadius: 2, background: theme.colors.paper }} />
      <div style={{ position: "absolute", left: x0 + p * w, top: y, width: 12, height: 12, marginLeft: -6, marginTop: -6, borderRadius: 6, background: theme.colors.paper, transform: `scale(${0.7 + 0.5 * held})` }} />
      <AtLeft x={x0} y={y + 22}><span style={mono}>{fmt(p * length)}</span></AtLeft>
      <div style={{ position: "absolute", right: -x1, top: y + 14 }}><span style={mono}>-{fmt((1 - p) * length)}</span></div>
    </>
  );
};

const Controls: React.FC = () => {
  const f = useAbsFrame();
  const starts = useStarts();
  const t = sp(f, press(starts, "player", 0).from + 1);
  return (
    <>
      <At x={-56} y={104}><Prev size={22} color={theme.colors.paper} /></At>
      <At x={0} y={104}><PlayPause t={t} size={30} color={theme.colors.paper} /></At>
      <At x={56} y={104}><Next size={22} color={theme.colors.paper} /></At>
    </>
  );
};

// beats 4–7 · the island opens into a music player: play on beat 5 (play ▸ pause morph), then the
// cursor grabs the playhead on beat 6 and scrubs it to the right.
export const ScenePlayer: React.FC = () => (
  <>
    <Editable id="player.art" label="Artwork" delay={6} trimOut={119} style={{ position: "absolute", left: -212, top: -126, width: 80, height: 80 }}><div style={{ position: "absolute", left: 212, top: 126 }}>
      <Swap enter={9} exit={6}><At x={-172} y={-86}><Art size={edit("player.art.size", 72, { label: "Size", min: 40, max: 110, step: 1, unit: "px" })} radius={14} /></At></Swap>
    </div></Editable>
    <Editable id="player.title" label="Title" kind="text" delay={8} trimOut={117} style={{ position: "absolute", left: -124, top: -114, width: 300, height: 32 }}><div style={{ position: "absolute", left: 124, top: 114 }}>
      <Swap enter={9} exit={6}><AtLeft x={-120} y={-98}><span style={{ color: theme.colors.paper, fontSize: edit("player.title.size", 19, { label: "Size", min: 12, max: 32, step: 1, unit: "px" }), fontWeight: 600, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{useCopy("player.title", "motion study 02")}</span></AtLeft></Swap>
    </div></Editable>
    <Editable id="player.subtitle" label="Subtitle" kind="text" delay={9} trimOut={116} style={{ position: "absolute", left: -124, top: -86, width: 300, height: 24 }}><div style={{ position: "absolute", left: 124, top: 86 }}>
      <Swap enter={9} exit={6}><AtLeft x={-120} y={-74}><span style={{ color: theme.colors.mute, fontSize: 14, whiteSpace: "nowrap" }}>{useCopy("player.subtitle", "made in code")}</span></AtLeft></Swap>
    </div></Editable>
    <Editable id="player.progress" label="Progress bar" delay={10} trimOut={115} style={{ position: "absolute", left: -206, top: 46, width: 412, height: 42 }}><div style={{ position: "absolute", left: 206, top: -46 }}>
      <Swap enter={9} exit={6}><Progress length={edit("player.progress.length", 179, { label: "Track length", min: 30, max: 600, step: 1, unit: "s" })} /></Swap>
    </div></Editable>
    <Editable id="player.controls" label="Controls (play ▸ pause)" delay={11} trimOut={114} style={{ position: "absolute", left: -80, top: 86, width: 160, height: 38 }}><div style={{ position: "absolute", left: 80, top: -86 }}>
      <Swap enter={9} exit={6}><Controls /></Swap>
    </div></Editable>
    <Sfx id="player.sfx.morph" name="morph" at={0} volume={0.35} />
    <Sfx id="player.sfx.play" name="tap" at={28} volume={0.7} />
    <Sfx id="player.sfx.grab" name="tap" at={66} volume={0.55} />
    <KeyTicks id="player.sfx.scrub" name="scrub" from={70} count={16} every={2} volume={0.28} />
    <Sfx id="player.sfx.release" name="release" at={110} volume={0.5} />
  </>
);
