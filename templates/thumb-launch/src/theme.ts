// Single source of truth: palette, easings, springs, fonts, beat grid.
// Colours and fonts are brand tokens: editable in Insyd Studio, saved back into this file.
import { Easing } from "remotion";
import { brand } from "./insyd";

export const FPS = 30;
export const BPM = 100;
export const BEAT = Math.round((FPS * 60) / BPM); // 18 frames

export const FONT_OPTIONS = ["Inter Tight", "Inter", "Space Grotesk", "Manrope", "DM Sans", "Sora"];

const C = "Colors", B = "Backgrounds", T = "Type";
export const theme = {
  colors: {
    get bg() { return brand("brand.paper", "#F4F2ED", { label: "Paper", group: B }); },
    get bgAlt() { return brand("brand.paperAlt", "#EAE7E0", { label: "Paper alt", group: B }); },
    get ink() { return brand("brand.ink", "#16151A", { label: "Ink", group: C }); },
    get inkDim() { return brand("brand.inkDim", "#6F6B65", { label: "Ink dim", group: C }); },
    get inkFaint() { return brand("brand.inkFaint", "#B9B4AC", { label: "Ink faint", group: C }); },
    get hero() { return brand("brand.hero", "#E9573F", { label: "Hero (coral)", group: C }); },
    get heroDeep() { return brand("brand.heroDeep", "#C9402A", { label: "Hero deep", group: C }); },
    get blue() { return brand("brand.blue", "#2B6BF3", { label: "Blue", group: C }); },
    get yellow() { return brand("brand.yellow", "#F5B324", { label: "Yellow", group: C }); },
    get pink() { return brand("brand.pink", "#F7B9C3", { label: "Pink (nail)", group: C }); },
    get skin() { return brand("brand.skin", "#F9B78F", { label: "Skin", group: C }); },
    get outline() { return brand("brand.outline", "#6E3229", { label: "Pixel outline", group: C }); },
    get cream() { return brand("brand.cream", "#FFF9F0", { label: "Cream", group: C }); },
    get card() { return brand("brand.card", "#FFFFFF", { label: "Card", group: B }); },
    cardBorder: "rgba(22,21,26,0.08)",
    glow: "rgba(233,87,63,0.35)",
    // the "wrong" build in the Figma scene
    get devBlue() { return brand("brand.devBlue", "#3B82F6", { label: "Dev build blue", group: C }); },
  },
  fonts: {
    get display() { return brand("brand.font.display", "Inter Tight", { kind: "font", options: FONT_OPTIONS, label: "Display font", group: T }); },
    get body() { return brand("brand.font.body", "Inter Tight", { kind: "font", options: FONT_OPTIONS, label: "Body font", group: T }); },
    mono: "JetBrains Mono",
    pixel: "Silkscreen",
  },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
    soft: Easing.bezier(0.25, 0.1, 0.25, 1),
  },
  spring: {
    snappy: { damping: 16, stiffness: 170, mass: 0.6 },
    smooth: { damping: 22, stiffness: 95, mass: 1 },
    bouncy: { damping: 12, stiffness: 180, mass: 0.7 },
    pixel: { damping: 13, stiffness: 260, mass: 0.5 },
    heavy: { damping: 26, stiffness: 70, mass: 1.2 },
  },
  shadow: {
    card: "0 30px 60px -24px rgba(22,21,26,0.35), 0 2px 6px rgba(22,21,26,0.06)",
    phone: "0 60px 100px -30px rgba(22,21,26,0.55)",
    pill: "0 6px 18px -8px rgba(22,21,26,0.25)",
  },
};
