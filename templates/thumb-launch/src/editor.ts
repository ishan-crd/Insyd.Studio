// Insyd Studio entry: lets the editor open this project.
import { defineProject, emptyLayout, mergeLayout, type Layout } from "./insyd";
import savedLayout from "../layout.json";
import { Launch, SCENE_DEFS, totalDuration } from "./Root";
import { theme } from "./theme";

export default defineProject({
  id: "ThumbLaunch",
  name: "thumb MCP — launch video",
  component: Launch,
  width: 1920,
  height: 1080,
  fps: 30,
  scenes: SCENE_DEFS,
  defaultLayout: mergeLayout(emptyLayout(), savedLayout as Partial<Layout>),
  entryPoint: "src/index.ts",
  layoutFile: "layout.json",
  durationInFrames: (layout) => totalDuration(layout),
  // Reading every token registers it with the editor's Brand panel.
  registerBrand: () => { for (const k of Object.keys(theme.colors)) void (theme.colors as any)[k]; for (const k of Object.keys(theme.fonts)) void (theme.fonts as any)[k]; },
});
