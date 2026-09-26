import React from "react";
import { theme } from "../theme";
import { AppScreen, DESIGN } from "./AppScreen";
import { IconFigma } from "./Icons";

// A Figma-shaped window: tabs, layers on the left, canvas with the design frame, properties on the right.
export const FigmaCard: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  const layers = ["Home", "  Header", "  Hero card", "  Today list", "  Order CTA"];
  const frameW = 250;
  return (
    <div style={{ width, height, borderRadius: 18, overflow: "hidden", background: "#fff", boxShadow: theme.shadow.card, border: `1px solid ${theme.colors.cardBorder}`, fontFamily: theme.fonts.body, color: theme.colors.ink, display: "flex", flexDirection: "column" }}>
      {/* title bar */}
      <div style={{ height: 46, background: "#2C2C2C", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, color: "#fff", fontSize: 14, fontWeight: 500 }}>
        <div style={{ display: "flex", gap: 7 }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />)}
        </div>
        <div style={{ marginLeft: 10, display: "flex", alignItems: "center", gap: 8, background: "#3C3C3C", padding: "6px 12px", borderRadius: 6 }}>
          <IconFigma size={14} color="#fff" /> Brew — Mobile
        </div>
        <div style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 6, background: theme.colors.blue, fontSize: 12, fontWeight: 600 }}>Share</div>
      </div>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* layers */}
        <div style={{ width: 150, borderRight: `1px solid ${theme.colors.cardBorder}`, padding: "12px 10px", fontSize: 12.5, color: theme.colors.inkDim }}>
          <div style={{ fontWeight: 600, color: theme.colors.ink, marginBottom: 8, fontSize: 12 }}>Layers</div>
          {layers.map((l, i) => (
            <div key={l} style={{ padding: "5px 6px", borderRadius: 5, whiteSpace: "pre", background: i === 0 ? "#E8F0FE" : undefined, color: i === 0 ? theme.colors.blue : undefined, fontWeight: i === 0 ? 600 : 500 }}>
              {i === 0 ? "# " : "▢ "}{l.trim()}
            </div>
          ))}
        </div>
        {/* canvas */}
        <div style={{ flex: 1, background: "#E9E9EB", backgroundImage: "radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)", backgroundSize: "18px 18px", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", fontSize: 11, color: theme.colors.inkDim, fontWeight: 600, whiteSpace: "nowrap" }}>iPhone 15 — Home</div>
          <div style={{ width: frameW, height: frameW * 2.05, position: "relative", overflow: "hidden", borderRadius: 4, boxShadow: "0 0 0 1.5px " + theme.colors.blue + ", 0 10px 30px -10px rgba(0,0,0,0.3)" }}>
            <AppScreen width={frameW} f={DESIGN} inFrame />
          </div>
        </div>
        {/* properties */}
        <div style={{ width: 150, borderLeft: `1px solid ${theme.colors.cardBorder}`, padding: "12px 12px", fontSize: 12, color: theme.colors.inkDim, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontWeight: 600, color: theme.colors.ink, fontSize: 12 }}>Design</div>
          <Prop k="Fill" v="E9573F" swatch={theme.colors.hero} />
          <Prop k="Radius" v="22" />
          <Prop k="Gap" v="20" />
          <Prop k="Type" v="Inter Tight" />
          <Prop k="Weight" v="Bold" />
          <Prop k="CTA" v="Pill · full" />
        </div>
      </div>
    </div>
  );
};

const Prop: React.FC<{ k: string; v: string; swatch?: string }> = ({ k, v, swatch }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F4F4F5", borderRadius: 5, padding: "5px 8px" }}>
    <span>{k}</span>
    <span style={{ display: "flex", alignItems: "center", gap: 6, color: theme.colors.ink, fontWeight: 600, fontFamily: theme.fonts.mono, fontSize: 11 }}>
      {swatch && <span style={{ width: 10, height: 10, borderRadius: 2, background: swatch }} />}{v}
    </span>
  </div>
);
