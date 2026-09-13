// Studio entry — describe the composition the editor should open.
// Wrap editable pieces of UI in <Editable id="..."> from "./insyd" and read
// scene lengths with useSceneDuration(). See the Insyd Studio README.
import { defineProject, emptyLayout } from "./insyd";
import layout from "../layout.json";
// import { MyVideo, SCENES } from "./Root";

export default defineProject({
  id: "MyVideo",
  name: "My video",
  component: (() => null) as any, // TODO: your composition component, receives { layout }
  width: 1920,
  height: 1080,
  fps: 30,
  scenes: [], // TODO: [{ id: "intro", label: "Intro", durationInFrames: 90 }, ...]
  defaultLayout: { ...emptyLayout(), ...layout },
  entryPoint: "src/index.ts",
  layoutFile: "layout.json",
});
