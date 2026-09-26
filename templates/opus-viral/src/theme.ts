// Palette, type and motion constants. Colours and fonts are brand tokens — editable in Studio's Brand
// panel and saved back into this file.
import { brand } from "./insyd";

export const FPS = 60;
export const BPM = 120;
export const BEAT = 30; // frames at 60 fps
export const BAR = 120;
export const SIZE = 1440;

const C = "Colors", T = "Type";
export const theme = {
  colors: {
    get canvas() { return brand("brand.canvas", "#ECEBE7", { label: "Canvas (warm gray)", group: C }); },
    get ink() { return brand("brand.ink", "#0A0A0A", { label: "Ink (black)", group: C }); },
    get paper() { return brand("brand.paper", "#FFFFFF", { label: "Paper (white)", group: C }); },
    get mute() { return brand("brand.mute", "#8B8B87", { label: "Muted gray", group: C }); },
    get line() { return brand("brand.line", "#E6E5E1", { label: "Hairline", group: C }); },
    get artA() { return brand("brand.artA", "#FF8A3D", { label: "Artwork warm", group: C }); },
    get artB() { return brand("brand.artB", "#8C4DFF", { label: "Artwork cool", group: C }); },
  },
  fonts: {
    get ui() { return brand("brand.font.ui", "Geist", { kind: "font", options: ["Geist", "Inter", "Inter Tight", "Manrope"], label: "UI font", group: T }); },
    mono: "Geist Mono",
  },
};
