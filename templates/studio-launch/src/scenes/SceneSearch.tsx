import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { theme } from "../theme";
import { SearchBar } from "../components/Props";
import { FieldClip, CursorClip, useExit } from "../components/Elements";
import { Sfx, KeyTicks } from "../components/Sfx";
import { typed } from "../components/motion";
import { Editable, useCopy, useAnimSpec, edit, animAt, useClip, type AnimSpec } from "../insyd";
import { useVideoConfig } from "remotion";

// The bar types its query from the start of its clip; the click squash lands at `press`.
const Bar: React.FC<{ query: string; anim: AnimSpec; cps: number; press: number }> = ({ query, anim, cps, press }) => {
  const { frame } = useClip();
  const { fps } = useVideoConfig();
  const a = animAt(anim, frame, fps);
  const out = useExit(18);
  const down = frame >= press && frame < press + 5;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - out, filter: out ? `blur(${out * 14}px)` : undefined, transform: `scaleX(${1 + out * 0.3})` }}>
      <div style={{ ...a.style, transform: `${a.style.transform} scale(${down ? 0.985 : 1})`, pointerEvents: "auto" }}>
        <SearchBar text={typed(query, (anim.delay ?? 0) + 8, frame, cps)} caret={Math.floor(frame / 8) % 2 === 0 || frame < 70} />
      </div>
    </AbsoluteFill>
  );
};

// 12–16 s · the question gets typed into a glass search bar; the pointer clicks search.
export const SceneSearch: React.FC = () => (
  <AbsoluteFill style={{ background: theme.colors.bg }}>
    <Editable id="search.bg" label="Ripple texture" display="fill" delay={0} trimOut={119}>
      <FieldClip mode="ripple" amount={edit("search.bg.amount", 0.25, { label: "Brightness", min: 0, max: 1.5, step: 0.05 })} color={theme.colors.inkDim} fadeIn={1} fadeOut={18} />
    </Editable>
    <Editable id="search.bar" label="Search bar" kind="text" display="fill" delay={0} trimOut={117}>
      <Bar query={useCopy("search.bar", "how to make a launch video without a designer?")} anim={useAnimSpec("search.bar.in", { delay: 0, preset: "smooth", from: { x: 260, opacity: 0, blur: 12 } })}
        cps={edit("search.bar.speed", 0.75, { label: "Typing speed (chars/frame)", min: 0.2, max: 3, step: 0.05 })} press={84} />
    </Editable>
    <Editable id="search.cursor" label="Pointer" display="fill" delay={40} trimOut={67}>
      <CursorClip from={[1500, 760]} to={[1446, 548]} travel={42} press={44} />
    </Editable>
    <Sfx id="search.sfx.in" name="whoosh" at={0} volume={0.4} />
    <KeyTicks id="search.sfx.keys" from={8} count={28} every={2} volume={0.2} />
    <Sfx id="search.sfx.click" name="click" at={84} volume={0.8} lead={0} />
    <Sfx id="search.sfx.out" name="glitch" at={100} volume={0.4} />
    <Sfx id="search.sfx.riser" name="riser" at={75} volume={0.35} lead={0} />
  </AbsoluteFill>
);
