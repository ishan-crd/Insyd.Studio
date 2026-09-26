import React from "react";
import { interpolate } from "remotion";
import { theme } from "../theme";
import { At, Swap } from "../components/Stage";
import { Check } from "../components/Icons";
import { Sfx } from "../components/Sfx";
import { Editable, useCopy, useClip, edit } from "../insyd";

const label = (): React.CSSProperties => ({ color: theme.colors.paper, fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", whiteSpace: "nowrap" });

// beat 0 · the button. Its label is on from frame 0 (the loop lands here) and blurs out as it's clicked.
export const SceneGenerate: React.FC = () => (
  <>
    <Editable id="generate.label" label="Button label" kind="text" delay={0} trimOut={36} style={{ position: "absolute", left: -110, top: -22, width: 220, height: 44 }}><div style={{ position: "absolute", left: 110, top: 22 }}>
      <Swap enter={0} exit={7}><At><span style={{ ...label(), fontSize: edit("generate.label.size", 22, { label: "Size", min: 12, max: 48, step: 1, unit: "px" }) }}>{useCopy("generate.label", "Generate")}</span></At></Swap>
    </div></Editable>
    <Sfx id="generate.sfx.click" name="tap" at={28} volume={0.7} />
  </>
);

const Spinner: React.FC<{ size: number }> = ({ size }) => {
  const { frame } = useClip();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", transform: `rotate(${frame * 11}deg)` }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke={theme.colors.paper} strokeOpacity={0.22} strokeWidth={2.4} />
      <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke={theme.colors.paper} strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  );
};
// beat 1 · the click squashes the button and it collapses into a loader
export const SceneLoader: React.FC = () => (
  <>
    <Editable id="loader.spinner" label="Spinner" delay={5} trimOut={29} style={{ position: "absolute", left: -22, top: -22, width: 44, height: 44 }}><div style={{ position: "absolute", left: 22, top: 22 }}>
      <Swap enter={6} exit={5}><At><Spinner size={edit("loader.spinner.size", 32, { label: "Size", min: 12, max: 60, step: 1, unit: "px" })} /></At></Swap>
    </div></Editable>
    <Sfx id="loader.sfx.release" name="release" at={3} volume={0.5} />
    <Sfx id="loader.sfx.morph" name="morph" at={0} volume={0.35} />
  </>
);

const DrawnCheck: React.FC<{ size: number }> = ({ size }) => {
  const { frame } = useClip();
  const d = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - (1 - t) ** 3 });
  return <Check size={size} color={theme.colors.paper} draw={d} />;
};
// beat 2 · done: the check draws itself
export const SceneCheck: React.FC = () => (
  <>
    <Editable id="check.icon" label="Check" delay={1} trimOut={32} style={{ position: "absolute", left: -22, top: -22, width: 44, height: 44 }}><div style={{ position: "absolute", left: 22, top: 22 }}>
      <Swap enter={3} exit={6}><At><DrawnCheck size={edit("check.icon.size", 34, { label: "Size", min: 12, max: 60, step: 1, unit: "px" })} /></At></Swap>
    </div></Editable>
    <Sfx id="check.sfx.done" name="done" at={1} volume={0.45} />
  </>
);

// beats 26–27 · the toast swaps back into the button, which holds until the loop point
export const SceneLoop: React.FC = () => (
  <>
    <Editable id="loop.label" label="Button label (loop)" kind="text" delay={2} trimOut={57} style={{ position: "absolute", left: -110, top: -22, width: 220, height: 44 }}><div style={{ position: "absolute", left: 110, top: 22 }}>
      <Swap enter={8} exit={0}><At><span style={{ ...label(), fontSize: edit("loop.label.size", 22, { label: "Size", min: 12, max: 48, step: 1, unit: "px" }) }}>{useCopy("loop.label", "Generate")}</span></At></Swap>
    </div></Editable>
    <Sfx id="loop.sfx.morph" name="morph" at={0} volume={0.3} />
  </>
);
