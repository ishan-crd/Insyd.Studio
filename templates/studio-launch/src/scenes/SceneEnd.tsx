import React from "react";
import { AbsoluteFill, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { Logo } from "../components/Props";
import { FieldClip, TextClip, At, useExit } from "../components/Elements";
import { SIZE, TOP } from "../components/Line";
import { Sfx } from "../components/Sfx";
import { clamp } from "../components/motion";
import { Editable, useCopy, useAnimSpec, edit, useClip } from "../insyd";

// The lockup lands from frame 0 of its clip (tile springs in with a flash, wordmark wipes), and
// fades out over the last 24 frames.
const LogoClip: React.FC<{ word: string; by: string; size: number }> = ({ word, by, size }) => {
  const { frame: f } = useClip();
  const { fps } = useVideoConfig();
  const tile = spring({ frame: f, fps, config: { damping: 11, stiffness: 190, mass: 0.7 } });
  const wipe = interpolate(f, [10, 26], [0, 1], { easing: theme.ease.expo, ...clamp });
  const flash = interpolate(f, [0, 8], [0.45, 0], clamp);
  const out = useExit(24, (t) => t);
  return (
    <>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - out }}>
        <div style={{ transform: `scale(${0.6 + 0.4 * tile})`, opacity: Math.min(1, tile * 1.5), pointerEvents: "auto" }}><Logo word={word} by={by} showWord={wipe} size={size} /></div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff", opacity: flash, pointerEvents: "none" }} />
    </>
  );
};

// 48–58 s · "You pick a template. / Claude makes it yours." → the lockup lands on the final hit.
export const SceneEnd: React.FC = () => (
  <AbsoluteFill style={{ background: theme.colors.bg }}>
    <Editable id="end.bg" label="Haze texture" display="fill" delay={0} trimOut={299}>
      <FieldClip mode="haze" amount={edit("end.bg.amount", 0.9, { label: "Brightness", min: 0, max: 1.5, step: 0.05 })} fadeIn={30} fadeOut={24} />
    </Editable>
    <At top={edit("end.l1.top", 50, TOP)}><Editable id="end.l1" label="Line 1" kind="text" delay={2} trimOut={33}>
      <TextClip text={useCopy("end.l1", "You pick a template.")} anim={useAnimSpec("end.l1.in", { delay: 0, preset: "bezier", duration: 10, easing: "linear" })} outDur={6} style={{ fontSize: edit("end.l1.size", 56, SIZE) }} />
    </Editable></At>
    <At top={edit("end.l2.top", 50, TOP)}><Editable id="end.l2" label="Line 2" kind="text" delay={30} trimOut={33}>
      <TextClip text={useCopy("end.l2", "Claude makes it yours.")} anim={useAnimSpec("end.l2.in", { delay: 0, preset: "bezier", duration: 10, easing: "linear" })} outDur={4} seed={2} style={{ fontSize: edit("end.l2.size", 56, SIZE) }} />
    </Editable></At>
    <Editable id="end.logo" label="Logo lockup" kind="text" copyId="end.logo.word" display="fill" delay={60} trimOut={239}>
      <LogoClip word={useCopy("end.logo.word", "Studio")} by={useCopy("end.logo.by", "by Insyd")} size={edit("end.logo.size", 170, { label: "Size", min: 60, max: 320, step: 2, unit: "px" })} />
    </Editable>
    <At top={edit("end.tag.top", 76.5, TOP)}><Editable id="end.tag" label="Tagline" kind="text" delay={90} trimOut={209}>
      <TextClip text={useCopy("end.tag", "Launch videos, edited by Claude.")} anim={useAnimSpec("end.tag.in", { delay: 0, preset: "bezier", duration: 14, easing: "linear" })} fade={24} style={{ fontSize: edit("end.tag.size", 38, SIZE), color: theme.colors.inkDim }} />
    </Editable></At>
    <At top={edit("end.url.top", 83.3, TOP)}><Editable id="end.url" label="URL" kind="text" delay={104} trimOut={195}>
      <TextClip text={useCopy("end.url", "insyd.studio")} anim={useAnimSpec("end.url.in", { delay: 0, preset: "bezier", duration: 12, easing: "linear" })} fade={24} seed={4} style={{ fontSize: edit("end.url.size", 36, SIZE), fontFamily: theme.fonts.mono, letterSpacing: "0.06em" }} />
    </Editable></At>
    <Sfx id="end.sfx.d1" name="decode" at={2} volume={0.3} />
    <Sfx id="end.sfx.d2" name="decode" at={30} volume={0.3} />
    <Sfx id="end.sfx.riser" name="riser" at={15} volume={0.3} lead={0} />
    <Sfx id="end.sfx.impact" name="impact" at={60} volume={0.8} />
    <Sfx id="end.sfx.wipe" name="swish" at={70} volume={0.35} />
    <Sfx id="end.sfx.tag" name="decode" at={90} volume={0.25} />
    <Sfx id="end.sfx.url" name="blip" at={104} volume={0.35} />
  </AbsoluteFill>
);
