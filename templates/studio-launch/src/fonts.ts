import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadInterTight } from "@remotion/google-fonts/InterTight";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { loadFont as loadSora } from "@remotion/google-fonts/Sora";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadSerif } from "@remotion/google-fonts/PlayfairDisplay";

// Every font offered in the Brand panel is loaded so switching is instant.
const W = ["400", "500", "600", "700"] as const;
loadInter("normal", { weights: [...W, "800"], subsets: ["latin"] });
loadInterTight("normal", { weights: [...W], subsets: ["latin"] });
loadSpaceGrotesk("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });
loadGeist("normal", { weights: [...W], subsets: ["latin"] });
loadManrope("normal", { weights: [...W], subsets: ["latin"] });
loadSora("normal", { weights: [...W], subsets: ["latin"] });
loadMono("normal", { weights: ["400", "500", "700", "800"], subsets: ["latin", "greek"] });
loadSerif("normal", { weights: ["700", "800", "900"], subsets: ["latin"] });
