import React from "react";
import { useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { hash } from "./motion";

// Text that decodes out of braille/block noise, character by character, and scrambles away again.
// Layout never jumps: the real string is laid out (invisible) and each scramble glyph is centred
// over its letter.
const NOISE = "⠁⠃⠇⡇⣇⣧⣷⣿⠿⠟⠏⠋▖▘▝▗▚▞░▒";

export const Decode: React.FC<{
  text: string;
  /** frame the decode starts */
  start?: number;
  /** frames to fully resolve */
  dur?: number;
  /** frame the scramble-out starts (omit to stay) */
  out?: number;
  outDur?: number;
  style?: React.CSSProperties;
  seed?: number;
}> = ({ text, start = 0, dur = 14, out, outDur = 10, style, seed = 1 }) => {
  const frame = useCurrentFrame();
  if (frame < start - 1) return null;
  const chars = Array.from(text);
  const n = chars.length;
  const tick = Math.floor(frame / 2);
  return (
    <div style={{ fontFamily: theme.fonts.body, fontWeight: 500, color: theme.colors.ink, whiteSpace: "pre", letterSpacing: "-0.01em", ...style }}>
      {chars.map((c, i) => {
        const r = hash(i + seed * 13, seed);
        const inAt = start + (i / Math.max(1, n)) * dur * 0.6 + r * dur * 0.4;
        const outAt = out !== undefined ? out + (i / Math.max(1, n)) * outDur * 0.5 + r * outDur * 0.5 : Infinity;
        const born = frame >= start + r * dur * 0.35;
        const resolved = frame >= inAt && frame < outAt;
        const gone = frame >= outAt + 4;
        if (c === " ") return <span key={i}> </span>;
        const flash = resolved ? Math.max(0, 1 - (frame - inAt) / 5) : 0;
        return (
          <span key={i} style={{ position: "relative", display: "inline-block" }}>
            <span style={{ opacity: resolved ? 1 : 0, textShadow: flash > 0 ? `0 0 ${14 * flash}px rgba(255,255,255,${0.9 * flash})` : undefined }}>{c}</span>
            {!resolved && born && !gone && (
              <span style={{ position: "absolute", left: 0, right: 0, top: 0, textAlign: "center", opacity: 0.75, color: theme.colors.inkDim, fontFamily: theme.fonts.mono, fontWeight: 400,
                transform: `translateY(${(hash(i, tick) - 0.5) * 6}px)` }}>
                {NOISE[Math.floor(hash(i + tick, seed) * NOISE.length)]}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
};
