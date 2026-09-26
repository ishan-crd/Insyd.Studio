import React from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig, type SpringConfig } from "remotion";
import { theme } from "../theme";
import { useClip } from "../insyd";

// Building blocks that time themselves to their clip. Each sits inside an
// <Editable delay={start} trimOut={length - 1}>: frame 0 is the clip's first frame on the timeline and
// `end` its last, so moving a clip moves its whole animation and trimming it moves its exit.

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** a spring from frame `at` of the clip */
export const useSpringIn = (at = 0, config: Partial<SpringConfig> = theme.spring.slam) => {
  const { frame } = useClip();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config });
};
/** eased 0→1 between two frames of the clip */
export const useRamp = (from: number, to: number, easing = theme.ease.out) => {
  const { frame } = useClip();
  return interpolate(frame, [from, to], [0, 1], { easing, ...clamp });
};
/** exit progress over the last `len` frames of the clip (1 just after its last frame) */
export const useExit = (len = 8, easing: (t: number) => number = theme.ease.in) => {
  const { frame, end } = useClip();
  return end === Infinity || len <= 0 ? 0 : interpolate(frame, [end + 1 - len, end + 1], [0, 1], { easing, ...clamp });
};
/** a decaying shake for the first `len` frames of the clip */
export const useShake = (amount = 18, len = 8, at = 0) => {
  const { frame } = useClip();
  const f = frame - at;
  if (f < 0 || f > len) return { x: 0, y: 0 };
  const k = (1 - f / len) ** 2 * amount;
  return { x: Math.sin(f * 2.7) * k, y: Math.cos(f * 3.9) * k * 0.6 };
};

/** a full-frame colour block (a background you can re-time, recolour or hide) */
export const Block: React.FC<{ color: string; children?: React.ReactNode; enter?: "cut" | "wipe-up" | "wipe-left" | "iris" }> = ({ color, children, enter = "cut" }) => {
  const p = useRamp(0, 9, theme.ease.inOut);
  const clip =
    enter === "wipe-up" ? `inset(${(1 - p) * 100}% 0 0 0)`
    : enter === "wipe-left" ? `inset(0 0 0 ${(1 - p) * 100}%)`
    : enter === "iris" ? `circle(${p * 120}% at 50% 50%)`
    : undefined;
  return <AbsoluteFill style={{ background: color, clipPath: clip }}>{children}</AbsoluteFill>;
};

/**
 * Poster type that slams in: over-scaled and blurred, it lands with a spring and a shake. Fills its
 * clip's box, centred.
 */
export const Slam: React.FC<{ text: string; size: number; color: string; font?: string; align?: "center" | "left"; lineHeight?: number; at?: number; shake?: number; tracking?: number; exit?: number }> = ({
  text, size, color, font = theme.fonts.display, align = "center", lineHeight = 0.92, at = 0, shake = 16, tracking = -0.01, exit = 0,
}) => {
  const s = useSpringIn(at);
  const { frame } = useClip();
  const sh = useShake(shake, 7, at);
  const out = useExit(exit);
  if (frame < at) return null;
  return (
    <AbsoluteFill style={{ alignItems: align === "center" ? "center" : "flex-start", justifyContent: "center" }}>
      <div style={{
        fontFamily: font, fontSize: size, lineHeight, color, textAlign: align, textTransform: font === theme.fonts.display ? "uppercase" : undefined,
        letterSpacing: `${tracking}em`, whiteSpace: "pre-line",
        transform: `translate(${sh.x}px, ${sh.y}px) scale(${(1.45 - 0.45 * s) * (1 - out * 0.25)}) skewX(${(1 - s) * -8}deg)`,
        filter: s < 0.98 ? `blur(${(1 - s) * 14}px)` : undefined,
        opacity: Math.min(1, s * 2.5) * (1 - out),
      }}>{text}</div>
    </AbsoluteFill>
  );
};

/** a line of text that rises out of a mask, `at` frames into the clip */
export const Rise: React.FC<{ children: React.ReactNode; at?: number; style?: React.CSSProperties; exit?: number }> = ({ children, at = 0, style, exit = 6 }) => {
  const p = useRamp(at, at + 12);
  const out = useExit(exit);
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.08em", ...style }}>
      <div style={{ transform: `translateY(${(1 - p) * 110 - out * 110}%)` }}>{children}</div>
    </div>
  );
};

/** a sticker: pops in with a spin, sits at a slight angle */
export const Sticker: React.FC<{ children: React.ReactNode; at?: number; angle?: number; bg: string; color: string; size?: number; round?: boolean; style?: React.CSSProperties }> = ({ children, at = 0, angle = -6, bg, color, size = 40, round, style }) => {
  const s = useSpringIn(at, theme.spring.pop);
  const out = useExit(5);
  const { frame } = useClip();
  if (frame < at) return null;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{
        background: bg, color, fontFamily: theme.fonts.body, fontWeight: 800, fontSize: size, letterSpacing: "-0.02em",
        padding: round ? 0 : `${size * 0.32}px ${size * 0.62}px`, borderRadius: round ? "50%" : size * 0.5,
        border: `${Math.max(3, size * 0.1)}px solid ${theme.colors.ink}`, boxShadow: `${size * 0.14}px ${size * 0.14}px 0 ${theme.colors.ink}`,
        transform: `rotate(${angle + (1 - s) * -40}deg) scale(${s * (1 - out)})`, whiteSpace: "nowrap", display: "flex", alignItems: "center", justifyContent: "center", gap: size * 0.3,
        width: round ? "100%" : undefined, height: round ? "100%" : undefined,
        ...style,
      }}>{children}</div>
    </AbsoluteFill>
  );
};

/** a rubber stamp: drops from big and tilted, thuds, a little ink bleeds out */
export const Stamp: React.FC<{ text: string; color: string; size?: number; angle?: number; at?: number }> = ({ text, color, size = 120, angle = -10, at = 0 }) => {
  const { frame } = useClip();
  const f = frame - at;
  const p = interpolate(f, [0, 6], [0, 1], { easing: theme.ease.in, ...clamp });
  const sh = useShake(22, 8, at + 6);
  if (f < 0) return null;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{
        fontFamily: theme.fonts.display, fontSize: size, color, textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 1,
        padding: `${size * 0.14}px ${size * 0.32}px`, border: `${size * 0.075}px solid ${color}`, borderRadius: size * 0.16,
        transform: `translate(${sh.x}px, ${sh.y}px) rotate(${angle}deg) scale(${3 - 2 * p})`, opacity: p,
        mixBlendMode: "multiply",
        maskImage: STAMP_MASK, WebkitMaskImage: STAMP_MASK, maskSize: "260px 260px", WebkitMaskSize: "260px 260px",
      }}>{text}</div>
    </AbsoluteFill>
  );
};
// speckled ink: the stamp doesn't print solid
const STAMP_MASK = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.9'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`,
)}")`;

/** a card with the look: thick ink outline, hard offset shadow */
export const Card: React.FC<{ bg: string; children: React.ReactNode; radius?: number; shadow?: number; style?: React.CSSProperties }> = ({ bg, children, radius = 34, shadow = 14, style }) => (
  <div style={{ position: "absolute", inset: 0, background: bg, borderRadius: radius, border: `6px solid ${theme.colors.ink}`, boxShadow: `${shadow}px ${shadow}px 0 ${theme.colors.ink}`, overflow: "hidden", ...style }}>{children}</div>
);

/** animated paper grain over everything */
export const Grain: React.FC<{ amount: number }> = ({ amount }) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2) % 12;
  const x = Math.floor(random(`gx${seed}`) * 200), y = Math.floor(random(`gy${seed}`) * 200);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: amount, mixBlendMode: "multiply", backgroundImage: GRAIN, backgroundSize: "300px 300px", backgroundPosition: `${x}px ${y}px` }} />
  );
};
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`,
)}")`;

/** the Roam mark: a four-point compass star in a ring */
export const Mark: React.FC<{ size: number; color: string; fill: string; spin?: number }> = ({ size, color, fill, spin = 0 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", overflow: "visible" }}>
    <circle cx="50" cy="50" r="46" fill={fill} stroke={color} strokeWidth="7" />
    <g transform={`rotate(${spin} 50 50)`}>
      <path d="M50 12 L58 42 L88 50 L58 58 L50 88 L42 58 L12 50 L42 42 Z" fill={color} />
      <circle cx="50" cy="50" r="6" fill={fill} />
    </g>
  </svg>
);
