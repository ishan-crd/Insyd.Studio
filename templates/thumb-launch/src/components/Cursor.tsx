import React from "react";
import { theme } from "../theme";

export const Cursor: React.FC<{ x: number; y: number; size?: number; pressed?: boolean }> = ({ x, y, size = 34, pressed }) => (
  <svg
    viewBox="0 0 24 24" width={size} height={size}
    style={{ position: "absolute", left: x, top: y, transform: `scale(${pressed ? 0.88 : 1})`, transformOrigin: "20% 10%",
      filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.25))" }}
  >
    <path d="M5 3l14 9-6 1.2 3.5 6.8-2.6 1.3-3.5-6.9L5 19z" fill={theme.colors.ink} stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
  </svg>
);
