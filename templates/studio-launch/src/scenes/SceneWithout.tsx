import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { AsciiField, AsciiWord } from "../components/Ascii";
import { Line, SIZE, TOP } from "../components/Line";
import { Decode } from "../components/Decode";
import { Sfx } from "../components/Sfx";
import { ramp } from "../components/motion";
import { Editable, edit, useCopy } from "../insyd";

// 6–12 s · "how to make a VIDEO … without an editor? without a budget? without a designer?"
// Each question lands on its own glyph texture.
export const SceneWithout: React.FC = () => {
  const f = useCurrentFrame();
  const word = useCopy("without.word", "VIDEO");
  const wordSize = edit("without.word.size", 340, { label: "Word size", min: 120, max: 520, step: 5, unit: "px" });
  const seg = (a: number, b: number) => ramp(f, a, a + 6) * (1 - ramp(f, b - 6, b));
  return (
    <AbsoluteFill style={{ background: theme.colors.bg }}>
      <Editable id="without.bg1" label="Terrain" display="fill"><AsciiField mode="wave" amount={seg(10, 66) + seg(66, 102) * 0.25} speed={1.4} /></Editable>
      <Editable id="without.bg2" label="Knit texture" display="fill"><AsciiField mode="diamond" amount={seg(102, 138)} /></Editable>
      <Editable id="without.bg3" label="Tile texture" display="fill"><AsciiField mode="tiles" amount={seg(138, 180) * 0.9} cell={14} /></Editable>
      <Line top={edit("without.lead.top", 50, TOP)}><Editable id="without.lead" label="Lead-in" kind="text"><Decode text={useCopy("without.lead", "how to make a")} start={0} dur={10} out={14} outDur={6} style={{ fontSize: edit("without.lead.size", 72, SIZE) }} /></Editable></Line>
      <Editable id="without.wordmark" label="VIDEO (glyph word)" kind="text" copyId="without.word" display="fill">
        <AsciiWord text={word} size={wordSize} y={0.42} reveal={ramp(f, 15, 27)} exit={ramp(f, 56, 66, theme.ease.in)} />
      </Editable>
      <Line top={edit("without.q1.top", 46, TOP)}><Editable id="without.q1" label="Question 1" kind="text"><Decode text={useCopy("without.q1", "without an editor?")} start={66} dur={8} out={96} outDur={6} style={{ fontSize: edit("without.q1.size", 104, SIZE), fontWeight: 600 }} /></Editable></Line>
      <Line top={edit("without.q2.top", 46, TOP)}><Editable id="without.q2" label="Question 2" kind="text"><Decode text={useCopy("without.q2", "without a budget?")} start={102} dur={8} out={132} outDur={6} seed={2} style={{ fontSize: edit("without.q2.size", 96, SIZE), fontWeight: 600 }} /></Editable></Line>
      <Line top={edit("without.q3.top", 50, TOP)}><Editable id="without.q3" label="Question 3" kind="text"><Decode text={useCopy("without.q3", "without a designer?")} start={138} dur={8} out={172} outDur={6} seed={3} style={{ fontSize: edit("without.q3.size", 84, SIZE), fontWeight: 600 }} /></Editable></Line>
      <Sfx id="without.sfx.d0" name="decode" at={0} volume={0.3} />
      <Sfx id="without.sfx.impact" name="impact" at={15} volume={0.45} />
      <Sfx id="without.sfx.glitch" name="glitch" at={15} volume={0.4} />
      <Sfx id="without.sfx.q1" name="glitch" at={66} volume={0.35} />
      <Sfx id="without.sfx.q2" name="glitch" at={102} volume={0.35} />
      <Sfx id="without.sfx.q3" name="glitch" at={138} volume={0.35} />
    </AbsoluteFill>
  );
};
