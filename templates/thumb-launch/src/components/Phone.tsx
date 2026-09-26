import React from "react";
import { theme } from "../theme";

// iPhone mockup. Width drives everything; screen content goes in children.
export const PHONE_RATIO = 2.165;
export const Phone: React.FC<{ width?: number; children?: React.ReactNode; style?: React.CSSProperties; dark?: boolean }> = ({
  width = 340, children, style, dark,
}) => {
  const h = width * PHONE_RATIO;
  const bezel = width * 0.035;
  const r = width * 0.16;
  return (
    <div
      style={{
        position: "relative", width, height: h, borderRadius: r, background: theme.colors.ink,
        boxShadow: theme.shadow.phone, padding: bezel, boxSizing: "border-box", ...style,
      }}
    >
      {/* side buttons */}
      <div style={{ position: "absolute", left: -3, top: h * 0.22, width: 3, height: h * 0.05, background: "#2a292f", borderRadius: 2 }} />
      <div style={{ position: "absolute", left: -3, top: h * 0.3, width: 3, height: h * 0.09, background: "#2a292f", borderRadius: 2 }} />
      <div style={{ position: "absolute", right: -3, top: h * 0.27, width: 3, height: h * 0.13, background: "#2a292f", borderRadius: 2 }} />
      <div
        style={{
          position: "relative", width: "100%", height: "100%", borderRadius: r - bezel, overflow: "hidden",
          background: dark ? "#000" : "#F7F7F9",
        }}
      >
        {children}
        {/* status bar */}
        <div
          style={{
            position: "absolute", top: 0, left: 0, right: 0, height: width * 0.14, display: "flex", justifyContent: "space-between",
            alignItems: "center", padding: `0 ${width * 0.09}px`, fontFamily: theme.fonts.body, fontWeight: 600,
            fontSize: width * 0.045, color: dark ? "#fff" : theme.colors.ink, pointerEvents: "none",
          }}
        >
          <span style={{ marginTop: width * 0.005 }}>9:41</span>
          <svg viewBox="0 0 60 12" width={width * 0.17} height={width * 0.034} fill={dark ? "#fff" : theme.colors.ink}>
            <rect x="0" y="6" width="3" height="6" rx="1" /><rect x="5" y="4" width="3" height="8" rx="1" /><rect x="10" y="2" width="3" height="10" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" />
            <path d="M27 4a8 8 0 0 1 9 0" fill="none" stroke={dark ? "#fff" : theme.colors.ink} strokeWidth="1.8" strokeLinecap="round" /><path d="M29 7a5 5 0 0 1 5 0" fill="none" stroke={dark ? "#fff" : theme.colors.ink} strokeWidth="1.8" strokeLinecap="round" /><circle cx="31.5" cy="10" r="1.2" />
            <rect x="41" y="1" width="16" height="10" rx="3" fill="none" stroke={dark ? "#fff" : theme.colors.ink} strokeWidth="1.5" /><rect x="43" y="3" width="11" height="6" rx="1.5" /><rect x="58" y="4" width="2" height="4" rx="1" />
          </svg>
        </div>
        {/* dynamic island */}
        <div
          style={{
            position: "absolute", top: width * 0.03, left: "50%", transform: "translateX(-50%)",
            width: width * 0.3, height: width * 0.085, borderRadius: 999, background: "#000",
          }}
        />
        {/* home indicator */}
        <div
          style={{
            position: "absolute", bottom: width * 0.02, left: "50%", transform: "translateX(-50%)",
            width: width * 0.36, height: width * 0.014, borderRadius: 999, background: dark ? "#fff" : theme.colors.ink, opacity: 0.85,
          }}
        />
      </div>
    </div>
  );
};
