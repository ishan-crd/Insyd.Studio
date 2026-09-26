import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { useSpring, typed, clamp } from "./motion";
import { IconCheck, IconClaude } from "./Icons";

// White UI card, Notion-style: soft corner, hairline border, deep soft shadow.
export const Card: React.FC<{ width: number; children: React.ReactNode; style?: React.CSSProperties; pad?: number }> = ({
  width, children, style, pad = 28,
}) => (
  <div
    style={{
      width, background: theme.colors.card, borderRadius: 22, border: `1px solid ${theme.colors.cardBorder}`,
      boxShadow: theme.shadow.card, padding: pad, boxSizing: "border-box", fontFamily: theme.fonts.body, color: theme.colors.ink,
      ...style,
    }}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<{ title: string; dots?: boolean }> = ({ title, dots = true }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
    {dots && (
      <div style={{ display: "flex", gap: 7 }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
        ))}
      </div>
    )}
    <div style={{ fontSize: 18, fontWeight: 600, color: theme.colors.inkDim, letterSpacing: "-0.01em", marginLeft: dots ? 6 : 0 }}>{title}</div>
  </div>
);

// The human's prompt line, typed in.
export const UserPrompt: React.FC<{ text: string; start: number; size?: number; cpf?: number }> = ({ text, start, size = 26, cpf = 0.9 }) => {
  const frame = useCurrentFrame();
  const shown = typed(text, start, frame, cpf);
  const done = shown.length >= text.length;
  const blink = Math.floor(frame / 8) % 2 === 0;
  const p = useSpring(start - 6, theme.spring.snappy);
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", opacity: p, transform: `translateY(${interpolate(p, [0, 1], [10, 0])}px)` }}>
      <div style={{ width: size * 1.25, height: size * 1.25, borderRadius: 10, background: theme.colors.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.7, fontWeight: 700, flexShrink: 0 }}>›</div>
      <div style={{ fontSize: size, fontWeight: 500, lineHeight: 1.3, letterSpacing: "-0.015em" }}>
        {shown}
        {!done || frame - start < text.length / cpf + 14 ? <span style={{ opacity: blink ? 1 : 0, color: theme.colors.hero }}>▍</span> : null}
      </div>
    </div>
  );
};

// One MCP tool call line: "thumb › open_app("instagram")" then a check + timing.
export const ToolLine: React.FC<{ call: string; start: number; doneAt?: number; result?: string; size?: number }> = ({
  call, start, doneAt, result, size = 22,
}) => {
  const frame = useCurrentFrame();
  const p = useSpring(start, theme.spring.snappy);
  const d = doneAt !== undefined ? useSpring(doneAt, theme.spring.bouncy) : 0;
  const running = doneAt === undefined || frame < doneAt;
  const spin = interpolate(frame, [start, start + 60], [0, 720], clamp);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: p, transform: `translateX(${interpolate(p, [0, 1], [-16, 0])}px)`, fontFamily: theme.fonts.mono, fontSize: size, whiteSpace: "nowrap" }}>
      <div style={{ width: size * 1.15, height: size * 1.15, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: d > 0.05 ? theme.colors.ink : "transparent", transform: `scale(${d > 0.05 ? interpolate(d, [0, 1], [0.6, 1]) : 1})`, flexShrink: 0 }}>
        {running && d < 0.05 ? (
          <svg viewBox="0 0 24 24" width={size * 0.9} height={size * 0.9} style={{ transform: `rotate(${spin}deg)` }}>
            <circle cx="12" cy="12" r="8" fill="none" stroke={theme.colors.inkFaint} strokeWidth="3" />
            <path d="M12 4a8 8 0 0 1 8 8" fill="none" stroke={theme.colors.hero} strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : (
          <IconCheck size={size * 0.7} color="#fff" />
        )}
      </div>
      <span style={{ color: theme.colors.inkDim, fontWeight: 500 }}>thumb</span>
      <span style={{ color: theme.colors.inkFaint }}>›</span>
      <span style={{ color: theme.colors.ink, fontWeight: 600 }}>{call}</span>
      {result && d > 0.05 && (
        <span style={{ color: theme.colors.inkDim, marginLeft: 6, opacity: d }}>{result}</span>
      )}
    </div>
  );
};

// Claude's short reply line.
export const AssistantLine: React.FC<{ text: string; start: number; size?: number }> = ({ text, start, size = 24 }) => {
  const p = useSpring(start, theme.spring.smooth);
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", opacity: p, transform: `translateY(${interpolate(p, [0, 1], [10, 0])}px)`, fontSize: size, fontWeight: 500, color: theme.colors.ink, letterSpacing: "-0.01em" }}>
      <IconClaude size={size * 0.9} />
      <span>{text}</span>
    </div>
  );
};
