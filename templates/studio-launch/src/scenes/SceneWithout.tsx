import React from "react";
import { AbsoluteFill } from "remotion";
import { theme } from "../theme";
import { FieldClip, WordClip, TextClip, At } from "../components/Elements";
import { SIZE, TOP } from "../components/Line";
import { Sfx } from "../components/Sfx";
import { Editable, useCopy, useAnimSpec, edit } from "../insyd";

// 6–12 s · "how to make a VIDEO … without an editor? without a budget? without a designer?"
// Each question lands on its own glyph texture; each texture is its own clip.
export const SceneWithout: React.FC = () => (
  <AbsoluteFill style={{ background: theme.colors.bg }}>
    <Editable id="without.bg1" label="Terrain" display="fill" delay={10} trimOut={91}>
      <FieldClip mode="wave" amount={edit("without.bg1.amount", 0.8, { label: "Brightness", min: 0, max: 1.5, step: 0.05 })} speed={1.4} fadeIn={8} fadeOut={8} />
    </Editable>
    <Editable id="without.bg2" label="Knit texture" display="fill" delay={102} trimOut={35}>
      <FieldClip mode="diamond" amount={edit("without.bg2.amount", 1, { label: "Brightness", min: 0, max: 1.5, step: 0.05 })} fadeIn={6} fadeOut={6} />
    </Editable>
    <Editable id="without.bg3" label="Tile texture" display="fill" delay={138} trimOut={41}>
      <FieldClip mode="tiles" amount={edit("without.bg3.amount", 0.9, { label: "Brightness", min: 0, max: 1.5, step: 0.05 })} cell={14} fadeIn={6} fadeOut={6} />
    </Editable>
    <At top={edit("without.lead.top", 50, TOP)}><Editable id="without.lead" label="Lead-in" kind="text" delay={0} trimOut={17}>
      <TextClip text={useCopy("without.lead", "how to make a")} anim={useAnimSpec("without.lead.in", { delay: 0, preset: "bezier", duration: 10, easing: "linear" })} outDur={5} style={{ fontSize: edit("without.lead.size", 72, SIZE) }} />
    </Editable></At>
    <Editable id="without.word" label="VIDEO (glyph word)" kind="text" display="fill" delay={15} trimOut={50}>
      <WordClip text={useCopy("without.word", "VIDEO")} size={edit("without.word.size", 340, { label: "Size", min: 120, max: 520, step: 5, unit: "px" })} y={0.42}
        anim={useAnimSpec("without.word.in", { delay: 0, preset: "bezier", duration: 12, easing: "linear" })} />
    </Editable>
    <At top={edit("without.q1.top", 46, TOP)}><Editable id="without.q1" label="Question 1" kind="text" delay={66} trimOut={33}>
      <TextClip text={useCopy("without.q1", "without an editor?")} anim={useAnimSpec("without.q1.in", { delay: 0, preset: "bezier", duration: 8, easing: "linear" })} outDur={6} style={{ fontSize: edit("without.q1.size", 104, SIZE), fontWeight: 600 }} />
    </Editable></At>
    <At top={edit("without.q2.top", 46, TOP)}><Editable id="without.q2" label="Question 2" kind="text" delay={102} trimOut={33}>
      <TextClip text={useCopy("without.q2", "without a budget?")} anim={useAnimSpec("without.q2.in", { delay: 0, preset: "bezier", duration: 8, easing: "linear" })} outDur={6} seed={2} style={{ fontSize: edit("without.q2.size", 96, SIZE), fontWeight: 600 }} />
    </Editable></At>
    <At top={edit("without.q3.top", 50, TOP)}><Editable id="without.q3" label="Question 3" kind="text" delay={138} trimOut={37}>
      <TextClip text={useCopy("without.q3", "without a designer?")} anim={useAnimSpec("without.q3.in", { delay: 0, preset: "bezier", duration: 8, easing: "linear" })} outDur={6} seed={3} style={{ fontSize: edit("without.q3.size", 84, SIZE), fontWeight: 600 }} />
    </Editable></At>
    <Sfx id="without.sfx.d0" name="decode" at={0} volume={0.3} />
    <Sfx id="without.sfx.impact" name="impact" at={15} volume={0.45} />
    <Sfx id="without.sfx.glitch" name="glitch" at={15} volume={0.4} />
    <Sfx id="without.sfx.q1" name="glitch" at={66} volume={0.35} />
    <Sfx id="without.sfx.q2" name="glitch" at={102} volume={0.35} />
    <Sfx id="without.sfx.q3" name="glitch" at={138} volume={0.35} />
  </AbsoluteFill>
);
