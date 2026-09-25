import React from "react";
import { useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { breathe } from "./motion";

/** The glowing orb — the film's recurring "AI" character. */
export const Orb: React.FC<{ size?: number; color?: string; glow?: number; style?: React.CSSProperties }> = ({ size = 90, color = theme.colors.orb, glow = 1, style }) => {
  const frame = useCurrentFrame();
  const pulse = 1 + breathe(frame, 0.04, 40);
  return (
    <div style={{ position: "absolute", width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderRadius: "50%", transform: `scale(${pulse})`,
      background: `radial-gradient(circle at 36% 32%, #fff 0%, ${color} 38%, ${color}CC 62%, ${color}00 100%)`,
      boxShadow: `0 0 ${size * 0.6 * glow}px ${size * 0.18 * glow}px ${color}AA, 0 0 ${size * 2 * glow}px ${size * 0.5 * glow}px ${color}40`, ...style }} />
  );
};

/** Pixel mouse pointer (as in the reference) — `down` shows a click squash. */
export const Pointer: React.FC<{ x: number; y: number; down?: boolean; hand?: boolean; scale?: number }> = ({ x, y, down, hand, scale = 1 }) => (
  <svg width={34 * scale} height={40 * scale} viewBox="0 0 17 20" shapeRendering="crispEdges" style={{ position: "absolute", left: x, top: y, transform: `scale(${down ? 0.88 : 1})`, transformOrigin: "0 0", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.6))" }}>
    {hand ? (
      <path d="M6 1h2v1h1v5h2v1h2v1h2v1h1v6h-1v2h-1v1H6v-1H5v-1H4v-2H3v-2H2v-2h1V9h2v1h1V1z" fill="#fff" stroke="#000" strokeWidth="1" />
    ) : (
      <path d="M1 1v15l4-4 3 6 2-1-3-6h6z" fill="#fff" stroke="#000" strokeWidth="1" strokeLinejoin="miter" />
    )}
  </svg>
);

/** Studio by Insyd lockup: mint tile with a serif S and a play notch, wordmark, "by Insyd". */
export const Logo: React.FC<{ word?: string; by?: string; tile?: string; size?: number; showWord?: number; showBy?: number }> = ({
  word = "Studio", by = "by Insyd", tile = theme.colors.logo, size = 120, showWord = 1, showBy = 1,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.22 }}>
    <div style={{ width: size, height: size, borderRadius: size * 0.24, background: tile, display: "grid", placeItems: "center", position: "relative", flex: "none",
      boxShadow: `0 0 ${size * 0.6}px ${tile}30` }}>
      <span style={{ fontFamily: theme.fonts.serif, fontWeight: 900, fontSize: size * 0.78, color: "#0C0F0E", lineHeight: 1, marginTop: -size * 0.04 }}>S</span>
      <span style={{ position: "absolute", right: size * 0.12, bottom: size * 0.12, width: 0, height: 0, borderLeft: `${size * 0.14}px solid ${theme.colors.orb}`, borderTop: `${size * 0.085}px solid transparent`, borderBottom: `${size * 0.085}px solid transparent` }} />
    </div>
    <div style={{ display: "flex", alignItems: "baseline", gap: size * 0.1, overflow: "hidden", maxWidth: `${showWord * 100}%`, clipPath: `inset(0 ${(1 - showWord) * 100}% 0 0)` }}>
      <span style={{ fontFamily: theme.fonts.serif, fontWeight: 800, fontSize: size * 0.92, color: theme.colors.ink, letterSpacing: "-0.02em", lineHeight: 1 }}>{word}</span>
      <span style={{ fontFamily: theme.fonts.serif, fontWeight: 700, fontSize: size * 0.34, color: theme.colors.ink, opacity: showBy }}>{by}</span>
    </div>
  </div>
);

/** Glass search bar with a magnifier. */
export const SearchBar: React.FC<{ text: string; caret?: boolean; width?: number; style?: React.CSSProperties }> = ({ text, caret, width = 1060, style }) => {
  // once the text is longer than the bar, it slides left so the caret stays in view (as in the reference)
  const overflow = text.length > (width - 180) / 19;
  return (
  <div style={{ width, height: 92, borderRadius: 46, display: "flex", alignItems: "center", padding: "0 40px", gap: 20,
    background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))", border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 30px 80px -20px rgba(0,0,0,0.9)", backdropFilter: "blur(8px)", ...style }}>
    <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: overflow ? "flex-end" : "flex-start", overflow: "hidden" }}>
      <span style={{ fontFamily: theme.fonts.body, fontSize: 38, color: theme.colors.ink, whiteSpace: "nowrap", letterSpacing: "-0.01em", flex: "none" }}>
        {text}{caret && <span style={{ display: "inline-block", width: 3, height: 40, background: theme.colors.ink, marginLeft: 3, verticalAlign: -6 }} />}
      </span>
    </div>
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={theme.colors.ink} strokeWidth="1.8" style={{ flex: "none" }}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" strokeLinecap="round" /></svg>
  </div>
  );
};

/** The dark studio room: slatted wall, a lit shelf, a monitor and two speakers. `screen` renders inside the display. */
export const Room: React.FC<{ screen: React.ReactNode; power?: number }> = ({ screen, power = 1 }) => (
  <div style={{ position: "absolute", inset: 0, background: "#050505", overflow: "hidden" }}>
    {/* slatted wall */}
    <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg, #0b0b0b 0 22px, #1c1c1c 22px 26px, #0d0d0d 26px 30px)", opacity: 0.95 }} />
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 55% at 50% 45%, rgba(255,255,255,0.10), transparent 70%), linear-gradient(180deg, rgba(0,0,0,0.65), transparent 30%, transparent 70%, rgba(0,0,0,0.5))" }} />
    {/* shelf */}
    <div style={{ position: "absolute", left: -40, right: -40, top: 900, height: 22, background: "linear-gradient(180deg, #f4f4f4, #9a9a9a)", boxShadow: "0 -30px 80px 10px rgba(255,255,255,0.25), 0 20px 40px rgba(0,0,0,0.9)" }} />
    <div style={{ position: "absolute", left: -40, right: -40, top: 922, bottom: 0, background: "linear-gradient(180deg, #1a1a1a, #050505)" }} />
    {/* speakers */}
    <div style={{ position: "absolute", left: 90, top: 700, width: 70, height: 200, borderRadius: 6, background: "linear-gradient(90deg, #2a2a2a, #111)", boxShadow: "inset 0 0 0 1px #333" }} />
    <div style={{ position: "absolute", left: 175, top: 800, width: 60, height: 100, borderRadius: 6, background: "linear-gradient(90deg, #262626, #0f0f0f)", boxShadow: "inset 0 0 0 1px #333" }} />
    {/* monitor */}
    <div style={{ position: "absolute", left: 460, top: 150, width: 1000, height: 580, borderRadius: 14, background: "#0a0a0a", padding: 14, boxShadow: "0 0 0 2px #2a2a2a, 0 40px 120px -20px rgba(0,0,0,1)" }}>
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 4, overflow: "hidden", background: "#000" }}>
        <div style={{ position: "absolute", inset: 0, opacity: power }}>{screen}</div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(125deg, rgba(255,255,255,0.07), transparent 40%)" }} />
      </div>
    </div>
    <div style={{ position: "absolute", left: 890, top: 730, width: 140, height: 150, background: "linear-gradient(90deg, #2c2c2c, #151515)" }} />
    <div style={{ position: "absolute", left: 800, top: 876, width: 320, height: 24, borderRadius: 4, background: "linear-gradient(180deg, #3a3a3a, #1a1a1a)" }} />
  </div>
);
