import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { animAt, type AnimSpec } from "../insyd";

export const headlineStyle: React.CSSProperties = {
  fontFamily: theme.fonts.display, fontWeight: 700, fontSize: 96, letterSpacing: "-0.035em",
  lineHeight: 1.04, color: theme.colors.ink, textAlign: "center",
};

// Word-by-word spring reveal. Accepts an array of lines; each word can be a string
// or a React node (for inline images / highlighted words).
export const Headline: React.FC<{
  lines: Array<Array<React.ReactNode>>;
  delay?: number;
  per?: number;
  style?: React.CSSProperties;
  align?: "center" | "left";
  /** editable entrance (from useAnimSpec); `stagger` spaces the words */
  anim?: AnimSpec;
}> = ({ lines, delay = 0, per = 3, style, align = "center", anim }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let idx = 0;
  return (
    <div style={{ ...headlineStyle, textAlign: align, ...style }}>
      {lines.map((words, li) => (
        <div
          key={li}
          style={{ display: "flex", justifyContent: align === "center" ? "center" : "flex-start",
            gap: "0.24em", flexWrap: "nowrap", alignItems: "baseline" }}
        >
          {words.map((w, wi) => {
            const i = idx++;
            const st = anim
              ? animAt(anim, frame - i * (anim.stagger ?? per), fps).style
              : (() => { const p = spring({ frame: frame - delay - i * per, fps, config: theme.spring.snappy }); return { opacity: p, transform: `translateY(${interpolate(p, [0, 1], [34, 0])}px) scale(${interpolate(p, [0, 1], [0.96, 1])})` }; })();
            return (
              <span
                key={wi}
                style={{ display: "inline-block", whiteSpace: "nowrap", ...st }}
              >
                {w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const Sub: React.FC<{ children: React.ReactNode; delay?: number; style?: React.CSSProperties }> = ({
  children, delay = 0, style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: theme.spring.smooth });
  return (
    <div
      style={{
        fontFamily: theme.fonts.body, fontWeight: 500, fontSize: 32, color: theme.colors.inkDim,
        letterSpacing: "-0.01em", opacity: p, transform: `translateY(${interpolate(p, [0, 1], [24, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Underlined, slightly italic emphasis — the "new" in "Meet the new Notion AI".
export const Emph: React.FC<{ children: React.ReactNode; delay?: number; color?: string }> = ({
  children, delay = 0, color = theme.colors.ink,
}) => {
  const frame = useCurrentFrame();
  const w = interpolate(frame, [delay, delay + 14], [0, 100], { easing: theme.ease.out,
    extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <span style={{ position: "relative", display: "inline-block", fontStyle: "italic", color }}>
      {children}
      <span
        style={{
          position: "absolute", left: 0, bottom: "0.02em", height: "0.06em", width: `${w}%`,
          background: color, borderRadius: 4,
        }}
      />
    </span>
  );
};

// "Line one|Line two" -> [["Line","one"],["Line","two"]] for <Headline lines>.
export const linesFrom = (text: string): string[][] =>
  text.split("|").map((l) => l.trim().split(/\s+/).filter(Boolean));
