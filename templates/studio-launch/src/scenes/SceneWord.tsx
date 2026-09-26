import React from "react";
import { AbsoluteFill } from "remotion";
import { theme } from "../theme";
import { FieldClip, WordClip, TextClip, At } from "../components/Elements";
import { SIZE, TOP } from "../components/Line";
import { Sfx } from "../components/Sfx";
import { Editable, useCopy, useAnimSpec, edit } from "../insyd";

// 24–28 s · the name in glyphs, then the one-line pitch over the terrain.
export const SceneWord: React.FC = () => (
  <AbsoluteFill style={{ background: theme.colors.bg }}>
    <Editable id="word.bg" label="Terrain" display="fill" delay={56} trimOut={63}>
      <FieldClip mode="wave" amount={edit("word.bg.amount", 1, { label: "Brightness", min: 0, max: 1.5, step: 0.05 })} speed={1.2} fadeIn={14} fadeOut={1} phase={56} />
    </Editable>
    <Editable id="word.name" label="STUDIO (glyph word)" kind="text" display="fill" delay={0} trimOut={57}>
      <WordClip text={useCopy("word.name", "STUDIO")} size={edit("word.name.size", 330, { label: "Size", min: 120, max: 520, step: 5, unit: "px" })} y={0.45} glyphs="#Σ*"
        anim={useAnimSpec("word.name.in", { delay: 0, preset: "bezier", duration: 10, easing: "out" })} outLen={10} />
    </Editable>
    <At top={edit("word.pitch.top", 50, TOP)}><Editable id="word.pitch" label="Pitch" kind="text" delay={60} trimOut={59}>
      <TextClip text={useCopy("word.pitch", "pick a template & Claude edits everything")} anim={useAnimSpec("word.pitch.in", { delay: 0, preset: "bezier", duration: 14, easing: "linear" })} outDur={0} style={{ fontSize: edit("word.pitch.size", 60, SIZE) }} />
    </Editable></At>
    <Sfx id="word.sfx.impact" name="impact" at={0} volume={0.6} />
    <Sfx id="word.sfx.glitch" name="glitch" at={0} volume={0.45} />
    <Sfx id="word.sfx.out" name="glitch" at={48} volume={0.3} />
    <Sfx id="word.sfx.decode" name="decode" at={60} volume={0.35} />
  </AbsoluteFill>
);
