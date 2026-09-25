import React from "react";
import { AbsoluteFill } from "remotion";

// Layout for a centred line of text at a vertical position (percent of the frame). The text itself
// is an <Editable> + <Decode> written out in each scene, so Studio can write every edit back here.
export const SIZE = { label: "Size", min: 16, max: 200, step: 1, unit: "px" } as const;
export const TOP = { label: "Vertical position", min: 0, max: 100, step: 1, unit: "%" } as const;

export const Line: React.FC<{ top?: number; children: React.ReactNode }> = ({ top = 50, children }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: `${top}%`, transform: "translateY(-50%)", display: "flex", justifyContent: "center" }}>{children}</div>
  </AbsoluteFill>
);
