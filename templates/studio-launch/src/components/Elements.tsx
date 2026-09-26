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

/** Exit progress over the last `len` frames of the clip, reaching 1 just after its last frame (0 for open-ended clips). */
export const useExit = (len = 10, easing: (t: number) => number = theme.ease.in) => {
  const { frame, end } = useClip();
  return end === Infinity || len <= 0 ? 0 : interpolate(frame, [end + 1 - len, end + 1], [0, 1], { easing, ...clamp });
};

/**
 * A glyph texture that fades in over `fadeIn` frames at the start of its clip and is fully faded
 * out right after its last frame. `levels` dims it for stretches of the clip: [from, to, level].
 */
export const FieldClip: React.FC<{ mode: FieldMode; amount?: number; fadeIn?: number; fadeOut?: number; levels?: Array<[number, number, number]>; color?: string; cell?: number; speed?: number; phase?: number }> = ({
  mode, amount = 1, fadeIn = 10, fadeOut = 10, levels, color, cell, speed, phase,
}) => {
  const { frame, end } = useClip();
  const inP = interpolate(frame, [0, fadeIn], [0, 1], { easing: theme.ease.out, ...clamp });
  const outP = end === Infinity ? 1 : 1 - interpolate(frame, [end + 1 - fadeOut, end + 1], [0, 1], { easing: theme.ease.out, ...clamp });
  const level = (levels ?? []).reduce((a, [from, to, l]) => (frame > from && frame < to ? a * l : a), 1);
  return <AsciiField mode={mode} amount={amount * inP * outP * level} color={color} cell={cell} speed={speed} phase={phase} />;
};

/** A giant glyph word: assembles with its entrance animation, breaks apart at the end of its clip. */
export const WordClip: React.FC<{ text: string; size: number; y?: number; glyphs?: string; anim: AnimSpec; outLen?: number }> = ({ text, size, y = 0.42, glyphs, anim, outLen = 10 }) => {
  const { frame } = useClip();
  const { fps } = useVideoConfig();
  return <AsciiWord text={text} size={size} y={y} glyphs={glyphs} reveal={animProgress(anim, frame, fps)} exit={useExit(outLen)} />;
};

/** Text that decodes in (its entrance: `anim.delay` + `anim.duration`) and scrambles out at the end of its clip. */
/**
 * Text that decodes in (`anim.delay` + `anim.duration`) and, at the end of its clip, either
 * scrambles out over `outDur` frames (finishing on its last frame), fades over `fade` frames, or —
 * with outDur 0 — simply cuts.
 */
export const TextClip: React.FC<{ text: string; anim: AnimSpec; outDur?: number; tail?: number; seed?: number; fade?: number; style?: React.CSSProperties }> = ({ text, anim, outDur = 10, tail = 0, seed, fade = 0, style }) => {
  const { end } = useClip();
  const out = useExit(fade, (t) => t);
  // `tail`: frames the scramble would have run past the clip's end (when a scene cut ends it early)
  const scramble = !fade && outDur > 0 && end !== Infinity ? end + tail - outDur - 3 : undefined;
  return <div style={{ opacity: 1 - out }}><Decode text={text} start={anim.delay ?? 0} dur={anim.duration ?? 14} out={scramble} outDur={outDur} seed={seed} style={style} /></div>;
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
