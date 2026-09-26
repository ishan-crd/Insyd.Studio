import React from "react";
import { theme } from "../theme";

type P = { size?: number; color?: string };
const base = (size: number) => ({ width: size, height: size, display: "block", flexShrink: 0 } as const);

export const IconCamera: React.FC<P> = ({ size = 22, color = theme.colors.ink }) => (
  <svg viewBox="0 0 24 24" style={base(size)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round">
    <rect x="3" y="6" width="18" height="14" rx="4" /><circle cx="12" cy="13" r="3.5" /><circle cx="17.5" cy="9.5" r="0.8" fill={color} />
  </svg>
);
export const IconChat: React.FC<P> = ({ size = 22, color = theme.colors.ink }) => (
  <svg viewBox="0 0 24 24" style={base(size)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round">
    <path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H9l-5 4z" />
  </svg>
);
export const IconWifi: React.FC<P> = ({ size = 22, color = theme.colors.ink }) => (
  <svg viewBox="0 0 24 24" style={base(size)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
    <path d="M2.5 9.5a14 14 0 0 1 19 0" /><path d="M6 13a9 9 0 0 1 12 0" /><path d="M9.5 16.5a4 4 0 0 1 5 0" /><circle cx="12" cy="19.5" r="1" fill={color} />
  </svg>
);
export const IconCode: React.FC<P> = ({ size = 22, color = theme.colors.ink }) => (
  <svg viewBox="0 0 24 24" style={base(size)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 7l-5 5 5 5" /><path d="M16 7l5 5-5 5" /><path d="M14 4l-4 16" />
  </svg>
);
export const IconFigma: React.FC<P> = ({ size = 22, color = theme.colors.ink }) => (
  <svg viewBox="0 0 24 24" style={base(size)} fill="none" stroke={color} strokeWidth={2}>
    <path d="M8 3h4v6H8a3 3 0 0 1 0-6z" /><path d="M12 3h4a3 3 0 0 1 0 6h-4z" /><path d="M8 9h4v6H8a3 3 0 0 1 0-6z" />
    <circle cx="15" cy="12" r="3" /><path d="M8 15h4v3a3 3 0 1 1-4-3z" />
  </svg>
);
export const IconCompass: React.FC<P> = ({ size = 22, color = theme.colors.ink }) => (
  <svg viewBox="0 0 24 24" style={base(size)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" fill={color} />
  </svg>
);
export const IconTerminal: React.FC<P> = ({ size = 22, color = theme.colors.ink }) => (
  <svg viewBox="0 0 24 24" style={base(size)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="3" /><path d="M7 9l3 3-3 3" /><path d="M12 15h5" />
  </svg>
);
export const IconDesktop: React.FC<P> = ({ size = 22, color = theme.colors.ink }) => (
  <svg viewBox="0 0 24 24" style={base(size)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8" /><path d="M12 16v4" />
  </svg>
);
export const IconPlug: React.FC<P> = ({ size = 22, color = theme.colors.ink }) => (
  <svg viewBox="0 0 24 24" style={base(size)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3v5" /><path d="M15 3v5" /><path d="M6 8h12v3a6 6 0 0 1-12 0z" /><path d="M12 17v4" />
  </svg>
);
export const IconPhone: React.FC<P> = ({ size = 22, color = theme.colors.ink }) => (
  <svg viewBox="0 0 24 24" style={base(size)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round">
    <rect x="6" y="2.5" width="12" height="19" rx="3" /><path d="M10 6h4" strokeLinecap="round" />
  </svg>
);
export const IconCheck: React.FC<P> = ({ size = 22, color = theme.colors.ink }) => (
  <svg viewBox="0 0 24 24" style={base(size)} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const IconSearch: React.FC<P> = ({ size = 22, color = theme.colors.ink }) => (
  <svg viewBox="0 0 24 24" style={base(size)} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round">
    <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" />
  </svg>
);
export const IconArrow: React.FC<P> = ({ size = 22, color = theme.colors.ink }) => (
  <svg viewBox="0 0 24 24" style={base(size)} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h13" /><path d="M13 6l6 6-6 6" />
  </svg>
);
export const IconSpark: React.FC<P> = ({ size = 22, color = theme.colors.hero }) => (
  <svg viewBox="0 0 24 24" style={base(size)} fill={color}>
    <path d="M12 2c.6 5.4 4.6 9.4 10 10-5.4.6-9.4 4.6-10 10-.6-5.4-4.6-9.4-10-10 5.4-.6 9.4-4.6 10-10z" />
  </svg>
);
// Minimal Claude-style mark: an asterisk of 8 rounded rays.
export const IconClaude: React.FC<P> = ({ size = 22, color = theme.colors.hero }) => (
  <svg viewBox="0 0 24 24" style={base(size)} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round">
    {Array.from({ length: 8 }).map((_, i) => (
      <line key={i} x1="12" y1="12" x2={12 + 8 * Math.cos((i * Math.PI) / 4)} y2={12 + 8 * Math.sin((i * Math.PI) / 4)} />
    ))}
  </svg>
);
