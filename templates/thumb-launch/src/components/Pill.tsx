import React from "react";
import { interpolate } from "remotion";
import { theme } from "../theme";
import { useSpring } from "./motion";

// Notion-style chip: light grey rounded pill with an icon and a label.
export const Pill: React.FC<{
  icon?: React.ReactNode; children: React.ReactNode; delay?: number; size?: number;
  bg?: string; color?: string; mono?: boolean; style?: React.CSSProperties; shadow?: boolean; pop?: boolean;
}> = ({ icon, children, delay = 0, size = 30, bg = theme.colors.bgAlt, color = theme.colors.ink, mono, style, shadow = true, pop = true }) => {
  const p = pop ? useSpring(delay, theme.spring.snappy) : 1;
  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center", gap: size * 0.4, padding: `${size * 0.42}px ${size * 0.72}px ${size * 0.42}px ${icon ? size * 0.55 : size * 0.72}px`,
        borderRadius: 999, background: bg, color,
        fontFamily: mono ? theme.fonts.mono : theme.fonts.body, fontWeight: mono ? 500 : 600, fontSize: size,
        letterSpacing: mono ? "-0.01em" : "-0.02em", whiteSpace: "nowrap",
        boxShadow: shadow ? theme.shadow.pill : undefined,
        opacity: p, transform: `translateY(${interpolate(p, [0, 1], [18, 0])}px) scale(${interpolate(p, [0, 1], [0.9, 1])})`,
        ...style,
      }}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
};
