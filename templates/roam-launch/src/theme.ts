// Palette, type and the beat grid. Colours and fonts are brand tokens: editable in Studio by Insyd's
// Brand panel and saved back into this file.
import { Easing } from "remotion";
import { brand } from "./insyd";

export const FPS = 30;
export const BPM = 120;
export const BEAT = 15; // frames: 120 BPM at 30 fps
export const BAR = 60;
export const W = 1080;
export const H = 1920;

export const DISPLAY_FONTS = ["Anton", "Archivo Black", "Bricolage Grotesque"];
export const BODY_FONTS = ["Bricolage Grotesque", "Instrument Sans"];

const C = "Colors", B = "Backgrounds", T = "Type";
export const theme = {
  colors: {
    get ink() { return brand("brand.ink", "#0E0E12", { label: "Ink", group: C }); },
    get cream() { return brand("brand.cream", "#FFF4E4", { label: "Cream", group: B }); },
    get blue() { return brand("brand.blue", "#2F3BFF", { label: "Ultramarine", group: B }); },
    get orange() { return brand("brand.orange", "#FF5B1F", { label: "Tangerine", group: B }); },
    get lime() { return brand("brand.lime", "#D8FF3E", { label: "Acid lime", group: B }); },
    get pink() { return brand("brand.pink", "#FFB8D9", { label: "Bubblegum", group: B }); },
    get white() { return brand("brand.white", "#FFFFFF", { label: "Card", group: C }); },
  },
  fonts: {
    get display() { return brand("brand.font.display", "Anton", { kind: "font", options: DISPLAY_FONTS, label: "Display font", group: T }); },
    get body() { return brand("brand.font.body", "Bricolage Grotesque", { kind: "font", options: BODY_FONTS, label: "Body font", group: T }); },
    serif: "Instrument Serif",
    mono: "DM Mono",
  },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    back: Easing.bezier(0.34, 1.56, 0.64, 1),
  },
  spring: {
    slam: { damping: 11, stiffness: 260, mass: 0.6 },
    pop: { damping: 9, stiffness: 220, mass: 0.5 },
    smooth: { damping: 20, stiffness: 120, mass: 1 },
  },
};
