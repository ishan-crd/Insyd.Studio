import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { AsciiField, AsciiWord } from "../components/Ascii";
import { Line, SIZE, TOP } from "../components/Line";
import { Decode } from "../components/Decode";
import { Sfx } from "../components/Sfx";
import { ramp } from "../components/motion";
import { Editable, edit, useCopy } from "../insyd";

// 24–28 s · the name in glyphs, then the one-line pitch over the terrain.
export const SceneWord: React.FC = () => {
  const f = useCurrentFrame();
  const word = useCopy("word.name", "STUDIO");
  const size = edit("word.name.size", 330, { label: "Word size", min: 120, max: 520, step: 5, unit: "px" });
  return (
    <AbsoluteFill style={{ background: theme.colors.bg }}>
      <Editable id="word.bg" label="ASCII terrain" display="fill"><AsciiField mode="wave" amount={ramp(f, 56, 70)} speed={1.2} /></Editable>
      <Editable id="word.name" label="STUDIO (glyph word)" kind="text" copyId="word.name" display="fill">
        <AsciiWord text={word} size={size} y={0.45} reveal={ramp(f, 0, 10)} exit={ramp(f, 48, 58, theme.ease.in)} glyphs="#Σ*" />
      </Editable>
      <Line top={edit("word.pitch.top", 50, TOP)}><Editable id="word.pitch" label="Pitch" kind="text"><Decode text={useCopy("word.pitch", "pick a template & Claude edits everything")} start={60} dur={14} style={{ fontSize: edit("word.pitch.size", 60, SIZE) }} /></Editable></Line>
      <Sfx id="word.sfx.impact" name="impact" at={0} volume={0.6} />
      <Sfx id="word.sfx.glitch" name="glitch" at={0} volume={0.45} />
      <Sfx id="word.sfx.out" name="glitch" at={48} volume={0.3} />
      <Sfx id="word.sfx.decode" name="decode" at={60} volume={0.35} />
    </AbsoluteFill>
  );
};
