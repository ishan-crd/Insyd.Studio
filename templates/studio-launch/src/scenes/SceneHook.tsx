import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { AsciiField, AsciiWord } from "../components/Ascii";
import { Line, SIZE, TOP } from "../components/Line";
import { Decode } from "../components/Decode";
import { Sfx } from "../components/Sfx";
import { ramp } from "../components/motion";
import { Editable, edit, useCopy } from "../insyd";

// 0–6 s · "TODAY" built from glyphs over a rolling terrain, then the problem, decoded line by line.
export const SceneHook: React.FC = () => {
  const f = useCurrentFrame();
  const word = useCopy("hook.word", "TODAY");
  const wordSize = edit("hook.word.size", 300, { label: "Word size", min: 120, max: 520, step: 5, unit: "px" });
  const fieldMode = edit("hook.field", "wave", { label: "Texture", options: ["wave", "diamond", "tiles", "ripple", "haze"] }) as "wave";
  const field = ramp(f, 0, 20) * (1 - ramp(f, 150, 172)) * (f > 60 && f < 140 ? 0.55 : 1);
  return (
    <AbsoluteFill style={{ background: theme.colors.bg }}>
      <Editable id="hook.bg" label="ASCII terrain" display="fill"><AsciiField mode={fieldMode} amount={field} /></Editable>
      <Editable id="hook.wordmark" label="TODAY (glyph word)" kind="text" copyId="hook.word" display="fill">
        <AsciiWord text={word} size={wordSize} y={0.4} reveal={ramp(f, 0, 16)} exit={ramp(f, 46, 60, theme.ease.in)} />
      </Editable>
      <Line top={edit("hook.l1.top", 50, TOP)}><Editable id="hook.l1" label="Line 1" kind="text"><Decode text={useCopy("hook.l1", "Launch day happens once.")} start={62} out={96} style={{ fontSize: edit("hook.l1.size", 58, SIZE) }} /></Editable></Line>
      <Line top={edit("hook.l2.top", 50, TOP)}><Editable id="hook.l2" label="Line 2" kind="text"><Decode text={useCopy("hook.l2", "Most founders ship it without a video.")} start={100} out={134} seed={2} style={{ fontSize: edit("hook.l2.size", 58, SIZE) }} /></Editable></Line>
      <Line top={edit("hook.l3.top", 50, TOP)}><Editable id="hook.l3" label="Line 3" kind="text"><Decode text={useCopy("hook.l3", "we're changing that...")} start={140} out={168} seed={3} style={{ fontSize: edit("hook.l3.size", 58, SIZE) }} /></Editable></Line>
      <Sfx id="hook.sfx.glitch" name="glitch" at={0} volume={0.55} />
      <Sfx id="hook.sfx.impact" name="impact" at={2} volume={0.5} />
      <Sfx id="hook.sfx.out" name="glitch" at={48} volume={0.3} />
      <Sfx id="hook.sfx.d1" name="decode" at={62} volume={0.35} />
      <Sfx id="hook.sfx.d2" name="decode" at={100} volume={0.35} />
      <Sfx id="hook.sfx.d3" name="decode" at={140} volume={0.35} />
    </AbsoluteFill>
  );
};
