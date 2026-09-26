// Studio by Insyd entry: lets the editor open this project.
import { defineProject, emptyLayout, mergeLayout, type Layout } from "./insyd";
import savedLayout from "../layout.json";
import { Roam, SCENE_DEFS, totalDuration } from "./Root";
import { theme, FPS, W, H } from "./theme";

export default defineProject({
  id: "RoamLaunch",
  name: "Roam — launch film",
  component: Roam,
  width: W,
  height: H,
  fps: FPS,
  scenes: SCENE_DEFS,
  defaultLayout: mergeLayout(emptyLayout(), savedLayout as Partial<Layout>),
  entryPoint: "src/index.ts",
  layoutFile: "layout.json",
  durationInFrames: (layout) => totalDuration(layout),
  // Reading every token registers it with the editor's Brand panel.
  registerBrand: () => { for (const k of Object.keys(theme.colors)) void (theme.colors as any)[k]; for (const k of Object.keys(theme.fonts)) void (theme.fonts as any)[k]; },
});
