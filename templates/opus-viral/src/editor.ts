// Studio by Insyd entry: lets the editor open this project.
import { defineProject, emptyLayout, mergeLayout, type Layout } from "./insyd";
import savedLayout from "../layout.json";
import { OpusViral, SCENE_DEFS, totalDuration } from "./Root";
import { theme, SIZE, FPS } from "./theme";

export default defineProject({
  id: "OpusViral",
  name: "Opus Viral on X",
  component: OpusViral,
  width: SIZE,
  height: SIZE,
  fps: FPS,
  scenes: SCENE_DEFS,
  defaultLayout: mergeLayout(emptyLayout(), savedLayout as Partial<Layout>),
  entryPoint: "src/index.ts",
  layoutFile: "layout.json",
  durationInFrames: (layout) => totalDuration(layout),
  registerBrand: () => { for (const k of Object.keys(theme.colors)) void (theme.colors as any)[k]; for (const k of Object.keys(theme.fonts)) void (theme.fonts as any)[k]; },
});
