import React from "react";
import { interpolate, interpolateColors } from "remotion";
import { theme } from "../theme";

// The demo app ("Brew"). Every visual property is a lerp between the sloppy dev
// build (t=0) and the Figma design (t=1) so the phone can morph property by property.
export type Fidelity = { color: number; radius: number; spacing: number; type: number; button: number };
export const DESIGN: Fidelity = { color: 1, radius: 1, spacing: 1, type: 1, button: 1 };
export const DEV: Fidelity = { color: 0, radius: 0, spacing: 0, type: 0, button: 0 };

export const AppScreen: React.FC<{ width: number; f: Fidelity; pressed?: number; inFrame?: boolean }> = ({ width, f, pressed = 0, inFrame }) => {
  const u = width / 360; // design units
  const primary = interpolateColors(f.color, [0, 1], [theme.colors.devBlue, theme.colors.hero]);
  const heroBg = interpolateColors(f.color, [0, 1], ["#DBEAFE", "#FFE9E2"]);
  const r = interpolate(f.radius, [0, 1], [6, 22]) * u;
  const gap = interpolate(f.spacing, [0, 1], [10, 20]) * u;
  const pad = interpolate(f.spacing, [0, 1], [14, 22]) * u;
  const titleW = f.type > 0.5 ? 700 : 500;
  const titleLs = interpolate(f.type, [0, 1], [0, -0.03]);
  const titleSize = interpolate(f.type, [0, 1], [24, 30]) * u;
  const btnR = interpolate(f.button, [0, 1], [8, 999]) * u;
  const btnH = interpolate(f.button, [0, 1], [46, 56]) * u;
  const btnW = interpolate(f.button, [0, 1], [0.62, 1]);
  const rows = ["Order history", "Favorites", "Rewards · 240 pts"];
  return (
    <div style={{ position: "absolute", inset: 0, background: "#FBFAF8", fontFamily: theme.fonts.body, color: theme.colors.ink, paddingTop: inFrame ? 20 * u : width * 0.17 }}>
      <div style={{ padding: `0 ${pad}px`, display: "flex", flexDirection: "column", gap }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13 * u, color: theme.colors.inkDim, fontWeight: 500 }}>Good morning,</div>
            <div style={{ fontSize: titleSize, fontWeight: titleW, letterSpacing: `${titleLs}em`, lineHeight: 1.1 }}>Ishan</div>
          </div>
          <div style={{ width: 40 * u, height: 40 * u, borderRadius: interpolate(f.radius, [0, 1], [6, 999]) * u, background: primary, opacity: 0.9 }} />
        </div>
        {/* hero card */}
        <div style={{ background: heroBg, borderRadius: r, padding: pad, position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 12 * u, fontWeight: 600, color: primary, letterSpacing: "0.06em", textTransform: "uppercase" }}>Today's brew</div>
          <div style={{ fontSize: 26 * u, fontWeight: titleW, letterSpacing: `${titleLs}em`, marginTop: 6 * u }}>Flat white</div>
          <div style={{ fontSize: 13 * u, color: theme.colors.inkDim, marginTop: 4 * u, fontWeight: 500 }}>Oat · double shot · 12 oz</div>
          <div style={{ position: "absolute", right: -14 * u, bottom: -18 * u, width: 92 * u, height: 92 * u, borderRadius: "50%", background: primary, opacity: 0.18 }} />
          <div style={{ position: "absolute", right: 16 * u, bottom: 14 * u, width: 44 * u, height: 44 * u, borderRadius: "50%", background: "#5A3A22", boxShadow: `inset 0 0 0 ${4 * u}px #F3E7D8` }} />
        </div>
        {/* list */}
        <div style={{ display: "flex", flexDirection: "column", gap: gap * 0.55 }}>
          {rows.map((t, i) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 12 * u, background: "#fff", borderRadius: r * 0.7, padding: `${pad * 0.6}px ${pad * 0.75}px`, border: `1px solid ${theme.colors.cardBorder}` }}>
              <div style={{ width: 30 * u, height: 30 * u, borderRadius: r * 0.45, background: i === 2 ? primary : "#EFEDE8" }} />
              <div style={{ fontSize: 15 * u, fontWeight: 600, flex: 1 }}>{t}</div>
              <div style={{ width: 8 * u, height: 8 * u, borderTop: `2px solid ${theme.colors.inkFaint}`, borderRight: `2px solid ${theme.colors.inkFaint}`, transform: "rotate(45deg)" }} />
            </div>
          ))}
        </div>
      </div>
      {/* CTA */}
      <div style={{ position: "absolute", left: pad, right: pad, bottom: (inFrame ? 20 : 40) * u, display: "flex", justifyContent: "flex-start" }}>
        <div
          style={{
            width: `${btnW * 100}%`, height: btnH, borderRadius: btnR, background: primary, color: "#fff", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 16 * u, fontWeight: 700, letterSpacing: "-0.01em", transform: `scale(${1 - pressed * 0.05})`,
            boxShadow: `0 ${10 * u}px ${24 * u}px -${10 * u}px ${primary}`, filter: `brightness(${1 - pressed * 0.1})`,
          }}
        >
          Order now
        </div>
      </div>
    </div>
  );
};
