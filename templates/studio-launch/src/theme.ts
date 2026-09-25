// Single source of truth: palette, fonts, easings, springs, beat grid.
// Colours and fonts are brand tokens — editable in Studio by Insyd's Brand panel, saved back into this file.
import { Easing } from "remotion";
import { brand } from "./insyd";

export const FPS = 30;
export const BPM = 120;
export const BEAT = 15; // frames — 120 BPM at 30 fps
export const BAR = 60;

export const FONT_OPTIONS = ["Inter", "Inter Tight", "Space Grotesk", "Geist", "Manrope", "Sora"];

const C = "Colors", B = "Backgrounds", T = "Type";
export const theme = {
  colors: {
    get bg() { return brand("brand.bg", "#030404", { label: "Void", group: B }); },
    get field() { return brand("brand.field", "#2FA784", { label: "ASCII field", group: B }); },
    get ink() { return brand("brand.ink", "#F2F5F3", { label: "Ink", group: C }); },
    get inkDim() { return brand("brand.inkDim", "#8A948F", { label: "Ink dim", group: C }); },
    get orb() { return brand("brand.orb", "#E14BFF", { label: "Orb", group: C }); },
    get accent() { return brand("brand.accent", "#3D74E8", { label: "Accent (Studio blue)", group: C }); },
    get mint() { return brand("brand.mint", "#3FD1A0", { label: "Mint", group: C }); },
    get panel() { return brand("brand.panel", "#161A19", { label: "Panel", group: B }); },
    get panelLine() { return brand("brand.panelLine", "#2A302E", { label: "Panel line", group: B }); },
    get logo() { return brand("brand.logo", "#DDF1EA", { label: "Logo tile", group: C }); },
  },
  fonts: {
    get body() { return brand("brand.font.body", "Inter", { kind: "font", options: FONT_OPTIONS, label: "Body font", group: T }); },
    get display() { return brand("brand.font.display", "Inter", { kind: "font", options: FONT_OPTIONS, label: "Display font", group: T }); },
    mono: "JetBrains Mono",
    serif: "Playfair Display",
  },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
    expo: Easing.bezier(0.87, 0, 0.13, 1),
  },
  spring: {
    snappy: { damping: 16, stiffness: 170, mass: 0.6 },
    smooth: { damping: 22, stiffness: 95, mass: 1 },
    heavy: { damping: 26, stiffness: 70, mass: 1.2 },
  },
};
