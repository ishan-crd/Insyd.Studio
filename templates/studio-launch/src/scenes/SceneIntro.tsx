import React from "react";
import { AbsoluteFill, interpolate, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { Room, Orb } from "../components/Props";
import { StudioUI } from "../components/StudioUI";
import { TextClip } from "../components/Elements";
import { Sfx } from "../components/Sfx";
import { clamp, breathe } from "../components/motion";
import { Editable, useCopy, useAnimSpec, edit, useClip, animProgress, type AnimSpec } from "../insyd";

// The room is one clip that carries the camera: a slow push, then a fly into the display over its
// last 50 frames. The screen content, the orb and the Studio UI are clips nested inside it, so they
// move with the room — or can be re-timed on their own.
const RoomClip: React.FC<{ power: number; flyIn: number; screen: React.ReactNode; orb: React.ReactNode }> = ({ power, flyIn, screen, orb }) => {
  const { frame, end } = useClip();
  const fadeIn = interpolate(frame, [0, 24], [0, 1], { easing: theme.ease.out, ...clamp });
  const pw = interpolate(frame, [power, power + 18], [0, 1], { easing: theme.ease.out, ...clamp });
  const push = interpolate(frame, [0, 180], [1.08, 1], { easing: theme.ease.out, ...clamp });
  const p = end === Infinity ? 0 : interpolate(frame, [end - flyIn, end], [0, 1], { easing: theme.ease.expo, ...clamp });
  const s = push * (1 + p * 0.975);
  const tx = 960 - 960 * s, ty = 440 + 100 * p - 440 * s;
  return (
    <AbsoluteFill style={{ opacity: fadeIn, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
      <Room power={pw} screen={screen} />
      {orb}
    </AbsoluteFill>
  );
};

/** The orb sweeps in on an arc, parks by the monitor, then dives into the screen at the end of its clip. */
const OrbClip: React.FC<{ size: number }> = ({ size }) => {
  const { frame, end } = useClip();
  const e = end === Infinity ? 184 : end;
  const k = [0, 70, e - 54, e];
  const ox = interpolate(frame, k, [2150, 1560, 1520, 960], { easing: theme.ease.inOut, ...clamp });
  const oy = interpolate(frame, k, [260, 330, 300 + breathe(frame, 12, 50), 440], { easing: theme.ease.inOut, ...clamp });
  const sc = interpolate(frame, [e - 24, e], [1, 0.2], clamp);
  return <div style={{ position: "absolute", left: ox, top: oy, transform: `scale(${sc})` }}><Orb size={size} /></div>;
};

const UIClip: React.FC<{ project: string; anim: AnimSpec }> = ({ project, anim }) => {
  const { frame } = useClip();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1600, height: 900, transformOrigin: "0 0", transform: `scale(${972 / 1600})`, opacity: animProgress(anim, frame, fps) }}>
      <StudioUI project={project} playhead={0.1 + 0.3 * interpolate(frame, [8, 78], [0, 1], clamp)} />
    </div>
  );
};

// 16–24 s · the studio room. The orb drifts in, the monitor hums on, and on the drop the screen
// reads INTRODUCING… — then Studio itself appears and the camera flies into the display.
export const SceneIntro: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Editable id="intro.room" label="Studio room (camera)" display="fill" delay={0} trimOut={239}>
      <RoomClip power={edit("intro.room.power", 98, { label: "Screen power-on (frame)", min: 0, max: 200, step: 1, unit: "f" })}
        flyIn={edit("intro.room.flyIn", 50, { label: "Fly-in length", min: 10, max: 120, step: 1, unit: "f" })}
        screen={<>
          <Editable id="intro.word" label="INTRODUCING…" kind="text" display="fill" delay={120} trimOut={41}>
            <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
              <TextClip text={useCopy("intro.word", "INTRODUCING...")} anim={useAnimSpec("intro.word.in", { delay: 0, preset: "bezier", duration: 16, easing: "linear" })} outDur={1}
                style={{ fontFamily: theme.fonts.mono, fontSize: edit("intro.word.size", 64, { label: "Size", min: 24, max: 140, step: 1, unit: "px" }), letterSpacing: "0.12em", color: "#d8d8d8" }} />
            </AbsoluteFill>
          </Editable>
          <Editable id="intro.ui" label="Studio UI on screen" display="fill" delay={162} trimOut={77}>
            <UIClip project={useCopy("intro.ui.project", "Acme — launch video")} anim={useAnimSpec("intro.ui.in", { delay: 0, preset: "bezier", duration: 8, easing: "out" })} />
          </Editable>
        </>}
        orb={<Editable id="intro.orb" label="Orb" display="fill" delay={30} trimOut={183}><OrbClip size={edit("intro.orb.size", 70, { label: "Size", min: 20, max: 200, step: 1, unit: "px" })} /></Editable>} />
    </Editable>
    <Sfx id="intro.sfx.shimmer" name="shimmer" at={32} volume={0.45} />
    <Sfx id="intro.sfx.whoosh" name="whoosh" at={40} volume={0.35} />
    <Sfx id="intro.sfx.hum" name="hum" at={98} volume={0.35} lead={0} />
    <Sfx id="intro.sfx.impact" name="impact" at={120} volume={0.7} />
    <Sfx id="intro.sfx.decode" name="decode" at={120} volume={0.4} />
    <Sfx id="intro.sfx.ui" name="glitch" at={162} volume={0.35} />
    <Sfx id="intro.sfx.dive" name="whoosh" at={186} volume={0.55} />
  </AbsoluteFill>
);
