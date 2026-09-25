import React from "react";
import { AbsoluteFill } from "remotion";
import { theme } from "../theme";
import { FieldClip, WordClip, TextClip, At } from "../components/Elements";
import { SIZE, TOP } from "../components/Line";
import { Sfx } from "../components/Sfx";
import { Editable, useCopy, useAnimSpec, edit } from "../insyd";

// 0–6 s · "TODAY" built from glyphs over a rolling terrain, then the problem, decoded line by line.
// Every clip's timeline position is its `delay` (start) and `trimOut` (last frame) below.
export const SceneHook: React.FC = () => (
  <AbsoluteFill style={{ background: theme.colors.bg }}>
    <Editable id="hook.bg" label="Terrain" display="fill" delay={0} trimOut={179}>
      <FieldClip mode={edit("hook.bg.mode", "wave", { label: "Texture", options: ["wave", "diamond", "tiles", "ripple", "haze"] }) as "wave"} amount={edit("hook.bg.amount", 0.85, { label: "Brightness", min: 0, max: 1.5, step: 0.05 })} fadeIn={20} fadeOut={20} />
    </Editable>
    <Editable id="hook.word" label="TODAY (glyph word)" kind="text" display="fill" delay={0} trimOut={59}>
      <WordClip text={useCopy("hook.word", "TODAY")} size={edit("hook.word.size", 300, { label: "Size", min: 120, max: 520, step: 5, unit: "px" })} y={0.4}
        anim={useAnimSpec("hook.word.in", { delay: 0, preset: "bezier", duration: 16, easing: "linear" })} outLen={12} />
    </Editable>
    <At top={edit("hook.l1.top", 50, TOP)}><Editable id="hook.l1" label="Line 1" kind="text" delay={62} trimOut={37}>
      <TextClip text={useCopy("hook.l1", "Launch day happens once.")} anim={useAnimSpec("hook.l1.in", { delay: 0, preset: "bezier", duration: 14, easing: "linear" })} style={{ fontSize: edit("hook.l1.size", 58, SIZE) }} />
    </Editable></At>
    <At top={edit("hook.l2.top", 50, TOP)}><Editable id="hook.l2" label="Line 2" kind="text" delay={100} trimOut={37}>
      <TextClip text={useCopy("hook.l2", "Most founders ship it without a video.")} anim={useAnimSpec("hook.l2.in", { delay: 0, preset: "bezier", duration: 14, easing: "linear" })} seed={2} style={{ fontSize: edit("hook.l2.size", 58, SIZE) }} />
    </Editable></At>
    <At top={edit("hook.l3.top", 50, TOP)}><Editable id="hook.l3" label="Line 3" kind="text" delay={140} trimOut={37}>
      <TextClip text={useCopy("hook.l3", "we're changing that...")} anim={useAnimSpec("hook.l3.in", { delay: 0, preset: "bezier", duration: 14, easing: "linear" })} seed={3} style={{ fontSize: edit("hook.l3.size", 58, SIZE) }} />
    </Editable></At>
    <Sfx id="hook.sfx.glitch" name="glitch" at={0} volume={0.55} />
    <Sfx id="hook.sfx.impact" name="impact" at={2} volume={0.5} />
    <Sfx id="hook.sfx.out" name="glitch" at={48} volume={0.3} />
    <Sfx id="hook.sfx.d1" name="decode" at={62} volume={0.35} />
    <Sfx id="hook.sfx.d2" name="decode" at={100} volume={0.35} />
    <Sfx id="hook.sfx.d3" name="decode" at={140} volume={0.35} />
  </AbsoluteFill>
);
