import React from "react";

// One icon set, one stroke weight (1.8 at 24px), round caps — nothing mismatched.
const S: React.FC<{ size?: number; color?: string; children: React.ReactNode; fill?: boolean; sw?: number }> = ({ size = 18, color = "currentColor", children, fill, sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? color : "none"} stroke={fill ? "none" : color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>{children}</svg>
);
export const Check: React.FC<{ size?: number; color?: string; draw?: number }> = ({ size, color, draw = 1 }) => (
  <S size={size} color={color} sw={2.4}><path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} /></S>
);
export const CheckCircle: React.FC<{ size?: number; color?: string; bg?: string }> = ({ size = 18, color = "#000", bg = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}><circle cx="12" cy="12" r="11" fill={bg} /><path d="M7 12.3l3.3 3.3L17 9" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const Prev: React.FC<{ size?: number; color?: string }> = (p) => <S {...p} fill><path d="M6 5.5h2v13H6zM19 6.2v11.6a.8.8 0 0 1-1.25.66L10 13a1.2 1.2 0 0 1 0-2l7.75-5.46A.8.8 0 0 1 19 6.2z" /></S>;
export const Next: React.FC<{ size?: number; color?: string }> = (p) => <S {...p} fill><path d="M16 5.5h2v13h-2zM5 6.2v11.6a.8.8 0 0 0 1.25.66L14 13a1.2 1.2 0 0 0 0-2L6.25 5.54A.8.8 0 0 0 5 6.2z" /></S>;
/** play ▶ ↔ pause ❚❚ as one shape: two quads that morph (t: 0 = play, 1 = pause) */
export const PlayPause: React.FC<{ t: number; size?: number; color?: string }> = ({ t, size = 26, color = "#fff" }) => {
  const L = (a: number, b: number) => a + (b - a) * t;
  // play: left half of the triangle + right half; pause: two bars
  const left = [[L(6, 6), L(4, 5)], [L(12, 10), L(8, 5)], [L(12, 10), L(16, 19)], [L(6, 6), L(20, 19)]];
  const right = [[L(12, 14), L(8, 5)], [L(19, 18), L(12, 5)], [L(19, 18), L(12, 19)], [L(12, 14), L(16, 19)]];
  const d = (pts: number[][]) => "M" + pts.map((p) => p.join(" ")).join("L") + "Z";
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}><path d={d(left)} fill={color} stroke={color} strokeWidth={1.2} strokeLinejoin="round" /><path d={d(right)} fill={color} stroke={color} strokeWidth={1.2} strokeLinejoin="round" /></svg>;
};
export const Speaker: React.FC<{ size?: number; color?: string; level?: number }> = ({ size = 20, color = "#fff", level = 1 }) => (
  <S size={size} color={color}><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill={color} />{level > 0.05 && <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />}{level > 0.5 && <path d="M18.2 6.6a7.6 7.6 0 0 1 0 10.8" />}</S>
);
export const Search: React.FC<{ size?: number; color?: string }> = (p) => <S {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></S>;
export const Square: React.FC<{ size?: number; color?: string }> = (p) => <S {...p}><rect x="5" y="5" width="14" height="14" rx="3" /></S>;
export const Download: React.FC<{ size?: number; color?: string }> = (p) => <S {...p}><path d="M12 4.5v11M7.5 11l4.5 4.5 4.5-4.5M5 19.5h14" /></S>;
export const Film: React.FC<{ size?: number; color?: string }> = (p) => <S {...p}><rect x="4" y="5" width="16" height="14" rx="2.5" /><path d="M8 5v14M16 5v14M4 9.5h4M16 9.5h4M4 14.5h4M16 14.5h4" /></S>;
export const Blur: React.FC<{ size?: number; color?: string }> = (p) => <S {...p}><circle cx="12" cy="12" r="3.2" /><circle cx="12" cy="12" r="7.5" strokeDasharray="2 2.6" /></S>;
export const Code: React.FC<{ size?: number; color?: string }> = (p) => <S {...p}><path d="M9 7.5L4.5 12 9 16.5M15 7.5l4.5 4.5L15 16.5" /></S>;
export const Return: React.FC<{ size?: number; color?: string }> = (p) => <S {...p}><path d="M19 6v5.5a2.5 2.5 0 0 1-2.5 2.5H6M9.5 10.5L6 14l3.5 3.5" /></S>;
