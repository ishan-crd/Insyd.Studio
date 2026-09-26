import { loadFont as loadInterTight } from "@remotion/google-fonts/InterTight";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadSora } from "@remotion/google-fonts/Sora";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadPixel } from "@remotion/google-fonts/Silkscreen";

// Every font offered in the Brand panel is loaded so switching is instant.
const W = ["500", "600", "700"] as const;
loadInterTight("normal", { weights: [...W, "800"], subsets: ["latin"] });
loadInter("normal", { weights: [...W], subsets: ["latin"] });
loadSpaceGrotesk("normal", { weights: [...W], subsets: ["latin"] });
loadManrope("normal", { weights: [...W], subsets: ["latin"] });
loadDMSans("normal", { weights: [...W], subsets: ["latin"] });
loadSora("normal", { weights: [...W], subsets: ["latin"] });
loadMono("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });
loadPixel("normal", { weights: ["400", "700"], subsets: ["latin"] });
