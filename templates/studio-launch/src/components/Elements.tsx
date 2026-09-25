import React from "react";
import { AbsoluteFill, interpolate, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { AsciiField, AsciiWord, type FieldMode } from "./Ascii";
import { Decode } from "./Decode";
import { Pointer } from "./Props";
import { useClip, animProgress, type AnimSpec } from "../insyd";

// Building blocks that time themselves to their clip. Each is placed inside an
// <Editable delay={start} trimOut={length - 1}>: frame 0 is the clip's first frame on the timeline
// and `end` its last, so moving a clip moves its whole animation and trimming it moves its exit.

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Exit progress 0 → 1 over the last `len` frames of the clip (0 for open-ended clips). */
export const useExit = (len = 10) => {
  const { frame, end } = useClip();
  return end === Infinity ? 0 : interpolate(frame, [end - len, end], [0, 1], { easing: theme.ease.in, ...clamp });
};

/** A glyph texture that fades in at the start of its clip and out at the end. */
export const FieldClip: React.FC<{ mode: FieldMode; amount?: number; fadeIn?: number; fadeOut?: number; color?: string; cell?: number; speed?: number }> = ({
  mode, amount = 1, fadeIn = 10, fadeOut = 10, color, cell, speed,
}) => {
  const { frame } = useClip();
  const inP = interpolate(frame, [0, fadeIn], [0, 1], { easing: theme.ease.out, ...clamp });
  const out = useExit(fadeOut);
  return <AsciiField mode={mode} amount={amount * inP * (1 - out)} color={color} cell={cell} speed={speed} />;
};

/** A giant glyph word: assembles with its entrance animation, breaks apart at the end of its clip. */
export const WordClip: React.FC<{ text: string; size: number; y?: number; glyphs?: string; anim: AnimSpec; outLen?: number }> = ({ text, size, y = 0.42, glyphs, anim, outLen = 10 }) => {
  const { frame } = useClip();
  const { fps } = useVideoConfig();
  return <AsciiWord text={text} size={size} y={y} glyphs={glyphs} reveal={animProgress(anim, frame, fps)} exit={useExit(outLen)} />;
};

/** Text that decodes in (its entrance: `anim.delay` + `anim.duration`) and scrambles out at the end of its clip. */
export const TextClip: React.FC<{ text: string; anim: AnimSpec; outDur?: number; seed?: number; fade?: boolean; style?: React.CSSProperties }> = ({ text, anim, outDur = 8, seed, fade, style }) => {
  const { end } = useClip();
  const out = useExit(fade ? 24 : 1);
  const scramble = !fade && end !== Infinity ? end - outDur - 3 : undefined;
  return <div style={{ opacity: fade ? 1 - out : 1 }}><Decode text={text} start={anim.delay ?? 0} dur={anim.duration ?? 14} out={scramble} outDur={outDur} seed={seed} style={style} /></div>;
};

/** Centre a clip vertically at `top`% of the frame. */
export const At: React.FC<{ top?: number; children: React.ReactNode }> = ({ top = 50, children }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: `${top}%`, transform: "translateY(-50%)", display: "flex", justifyContent: "center" }}>
      <div style={{ pointerEvents: "auto" }}>{children}</div>
    </div>
  </AbsoluteFill>
);

/**
 * A pointer that travels from `from` to `to` over `travel` frames from the start of its clip, then
 * presses at `press` (local frames). Move the clip to re-time the whole gesture.
 */
export const CursorClip: React.FC<{ from: [number, number]; to: [number, number]; travel?: number; press?: number; hand?: boolean }> = ({ from, to, travel = 28, press, hand }) => {
  const { frame } = useClip();
  const p = interpolate(frame, [0, travel], [0, 1], { easing: theme.ease.out, ...clamp });
  const down = press !== undefined && frame >= press && frame < press + 5;
  return <Pointer x={from[0] + (to[0] - from[0]) * p} y={from[1] + (to[1] - from[1]) * p} down={down} hand={hand} />;
};
