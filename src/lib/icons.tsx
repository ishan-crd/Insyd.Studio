import React from "react";
const I: React.FC<{ d: string | string[]; fill?: boolean; size?: number }> = ({ d, fill, size }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
export const Play = () => <I fill d="M7 4.5v15l12-7.5z" />;
export const Pause = () => <I fill d={["M6 4h4v16H6z", "M14 4h4v16h-4z"]} />;
export const SkipBack = () => <I d={["M19 5v14L8 12z", "M5 5v14"]} />;
export const SkipFwd = () => <I d={["M5 5v14l11-7z", "M19 5v14"]} />;
export const StepBack = () => <I d={["M15 6l-6 6 6 6"]} />;
export const StepFwd = () => <I d={["M9 6l6 6-6 6"]} />;
export const Undo = () => <I d={["M9 14L4 9l5-5", "M4 9h10a6 6 0 0 1 0 12h-3"]} />;
export const Redo = () => <I d={["M15 14l5-5-5-5", "M20 9H10a6 6 0 0 0 0 12h3"]} />;
export const Save = () => <I d={["M5 3h11l3 3v15H5z", "M8 3v6h8V3", "M8 21v-7h8v7"]} />;
export const Export = () => <I d={["M12 3v12", "M7 8l5-5 5 5", "M4 21h16", "M4 15v6M20 15v6"]} />;
export const Folder = () => <I d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />;
export const Eye = () => <I d={["M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"]} />;
export const EyeOff = () => <I d={["M3 3l18 18", "M10.6 6.2A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.7", "M6.4 6.4A16 16 0 0 0 2 12s3.5 6 10 6c1.4 0 2.6-.3 3.7-.7"]} />;
export const Refresh = () => <I d={["M20 12a8 8 0 1 1-2.3-5.7", "M20 4v5h-5"]} />;
export const Text = () => <I d={["M5 6V4h14v2", "M12 4v16", "M9 20h6"]} />;
export const Block = () => <I d={["M4 4h16v16H4z", "M4 10h16", "M10 10v10"]} />;
export const Image = () => <I d={["M4 5h16v14H4z", "M4 16l5-5 4 4 3-3 4 4", "M15 9h.01"]} />;
export const Film = () => <I d={["M4 4h16v16H4z", "M4 9h16M4 15h16", "M8 4v16M16 4v16"]} />;
export const Help = () => <I d={["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7", "M12 17h.01"]} />;
export const Close = () => <I d={["M6 6l12 12", "M18 6L6 18"]} />;
export const Check = () => <I d="M5 12l5 5L20 7" />;
export const Chevron = ({ open }: { open: boolean }) => <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${open ? 90 : 0}deg)`, transition: "transform 120ms" }}><path d="M9 6l6 6-6 6" /></svg>;
// Brand mark: an "S" cut like a film strip.
export const Logo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.5 7.5c-.6-1.6-2.2-2.5-4.3-2.5C9.6 5 8 6.3 8 8.2c0 4.3 8.6 2.3 8.6 7.1 0 2.1-1.9 3.7-4.8 3.7-2.4 0-4.2-1.1-4.8-2.9" />
  </svg>
);
// Wordmark lockup: "Studio" with "By Insyd" beneath.
export const Wordmark = ({ size = 15 }: { size?: number }) => (
  <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1 }}>
    <span style={{ fontWeight: 700, fontSize: size, letterSpacing: "-0.02em" }}>Studio</span>
    <span style={{ fontWeight: 500, fontSize: Math.round(size * 0.62), letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", marginTop: 2 }}>By Insyd</span>
  </span>
);
export const Music = () => <I d={["M9 18V6l10-2v12", "M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z", "M19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"]} />;
export const Waveform = () => <I d={["M3 12h2", "M7 8v8", "M11 5v14", "M15 9v6", "M19 11v2"]} />;
export const Plus = () => <I d={["M12 5v14", "M5 12h14"]} />;
export const Upload = () => <I d={["M12 16V4", "M7 9l5-5 5 5", "M4 20h16"]} />;
export const VolumeIcon = () => <I d={["M4 10v4h4l5 4V6L8 10z", "M16 9a4 4 0 0 1 0 6"]} />;
