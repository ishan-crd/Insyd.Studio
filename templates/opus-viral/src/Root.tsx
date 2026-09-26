import React from "react";
import { AbsoluteFill, Composition, Freeze, Sequence, getRemotionEnvironment, useCurrentFrame, useVideoConfig } from "remotion";
import "./fonts";
import { FPS, SIZE, theme } from "./theme";
import { Editable, LayoutProvider, LayoutSounds, Sound, edit, sceneDuration, useLayout, type Layout, type SceneDef } from "./insyd";
import savedLayout from "../layout.json";
import { StartsContext, useAbsFrame, useStarts, shapeAt, volumeAt, type Cfg } from "./model";
import { Camera, CameraContext, ShapeContext, InShape, type ShapeRect } from "./components/Stage";
import { Cursor } from "./components/Cursor";
import { LoopMotionBlur } from "./components/MotionBlur";
import { SceneGenerate, SceneLoader, SceneCheck, SceneLoop } from "./scenes/Button";
import { SceneIsland, ScenePlayer } from "./scenes/Player";
import { SceneVolume, SceneToggle, SceneTabs } from "./scenes/Controls";
import { SceneChart } from "./scenes/Chart";
import { SceneCommand, SceneToast } from "./scenes/Command";

// 120 BPM at 60 fps: a beat is 30 frames, a bar 120. 7 bars = 840 frames = 14 s, and the last frame is
// the first frame, so it loops. Each state is a scene; its content overlaps the next scene by TAIL
// frames so every swap can blur across the change.
export const SCENES: Array<{ id: string; label: string; component: React.FC; duration: number }> = [
  { id: "generate", label: "Button", component: SceneGenerate, duration: 30 },      // beat 0
  { id: "loader", label: "Loader", component: SceneLoader, duration: 30 },          // beat 1 — click
  { id: "check", label: "Check", component: SceneCheck, duration: 30 },             // beat 2
  { id: "island", label: "Dynamic island", component: SceneIsland, duration: 30 },  // beat 3
  { id: "player", label: "Player · scrub", component: ScenePlayer, duration: 120 }, // beats 4–7: play on 5, scrub 6–7
  { id: "volume", label: "Volume slider", component: SceneVolume, duration: 90 },   // beats 8–10: drag down, stretch past max
  { id: "toggle", label: "Toggle", component: SceneToggle, duration: 60 },          // beats 11–12: flips on 12
  { id: "tabs", label: "Tabs", component: SceneTabs, duration: 90 },                // beats 13–15: Week on 14, Month on 15
  { id: "chart", label: "Chart", component: SceneChart, duration: 120 },            // beats 16–19: draw, hover, Week on 19
  { id: "command", label: "⌘K", component: SceneCommand, duration: 120 },           // beats 20–23: open, type, filter, enter
  { id: "toast", label: "Toast", component: SceneToast, duration: 60 },             // beats 24–25
  { id: "loop", label: "Back to button", component: SceneLoop, duration: 60 },      // beats 26–27 → frame 0
];
export const SCENE_DEFS: SceneDef[] = SCENES.map((s) => ({ id: s.id, label: s.label, durationInFrames: s.duration }));
const TAIL = 24;

export type Props = { layout?: Partial<Layout>; subframe?: number };
export const totalDuration = (layout?: Partial<Layout>) => SCENES.reduce((a, s) => a + sceneDuration(layout as Layout | undefined, s.id, s.duration), 0);

/** The one shape's rect at a frame: sums of springs through every state, plus the volume over-drag. */
const useShapeRect = (cfg: Cfg) => {
  const f = useAbsFrame();
  const starts = useStarts();
  const s = shapeAt(f, starts, { ink: theme.colors.ink, paper: theme.colors.paper, mute: theme.colors.mute }, cfg);
  const over = Math.max(0, volumeAt(f, starts).over); // the volume slider stretches when dragged past max
  return { w: s.w + over, h: s.h - over * 0.06, r: s.r, dx: over / 2, color: s.color };
};
const Shape: React.FC<{ rect: ShapeRect & { color: string }; shadow: number }> = ({ rect, shadow }) => {
  const { w, h, r, dx, color } = rect;
  return (
    <div style={{ position: "absolute", left: -w / 2 + dx, top: -h / 2, width: w, height: h, borderRadius: Math.min(r, h / 2), background: color,
      boxShadow: `0 ${18 * shadow}px ${44 * shadow}px -${16 * shadow}px rgba(0,0,0,${0.28 * shadow}), 0 1px 2px rgba(0,0,0,${0.06 * shadow})` }} />
  );
};

const Film: React.FC = () => {
  const layout = useLayout();
  let at = 0;
  const starts: Record<string, number> = {};
  for (const s of SCENES) { starts[s.id] = at; at += sceneDuration(layout as Layout, s.id, s.duration); }
  const cfg: Cfg = {
    damping: edit("film.spring.damping", 20, { label: "Shape spring · damping", min: 8, max: 60, step: 1, group: "Motion" }),
    stiffness: edit("film.spring.stiffness", 210, { label: "Shape spring · stiffness", min: 40, max: 600, step: 5, group: "Motion" }),
    mass: 0.9,
  };
  const camera = {
    fill: edit("film.camera.fill", 0.68, { label: "Camera · how much of the frame a state fills", min: 0.2, max: 0.9, step: 0.01, group: "Camera" }),
    max: edit("film.camera.max", 2.7, { label: "Camera · max zoom", min: 1, max: 4, step: 0.05, group: "Camera" }),
  };
  const shadow = edit("film.shape.shadow", 1, { label: "Shadow", min: 0, max: 2, step: 0.05 });
  return (
    <StartsContext.Provider value={starts}><ShapeLayer cfg={cfg} shadow={shadow} camera={camera} layout={layout as Layout} starts={starts} /></StartsContext.Provider>
  );
};

const ShapeLayer: React.FC<{ cfg: Cfg; shadow: number; camera: { fill: number; max: number }; layout: Layout; starts: Record<string, number> }> = ({ cfg, shadow, camera, layout, starts }) => {
  const rect = useShapeRect(cfg);
  return (
    <ShapeContext.Provider value={rect}>
      <CameraContext.Provider value={camera}>
        <Editable id="film.canvas" label="Canvas" display="fill">
          <AbsoluteFill style={{ background: theme.colors.canvas }}>
            <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(255,255,255,.55), transparent 70%)" }} />
          </AbsoluteFill>
        </Editable>
        <Editable id="film.shape" label="The shape" display="fill"><Camera><Shape rect={rect} shadow={shadow} /></Camera></Editable>
        {SCENES.map(({ id, component: Scene }, i) => {
          const dur = sceneDuration(layout as Layout, id, SCENES[i].duration);
          const last = i === SCENES.length - 1;
          return <Sequence key={id} from={starts[id]} durationInFrames={dur + (last ? 0 : TAIL)} name={id}><Camera><InShape><Scene /></InShape></Camera></Sequence>;
        })}
        <Editable id="film.cursor" label="Cursor" display="fill" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <Cursor size={edit("film.cursor.size", 30, { label: "Size", min: 16, max: 60, step: 1, unit: "px" })} />
        </Editable>
      </CameraContext.Provider>
    </ShapeContext.Provider>
  );
};

export const OpusViral: React.FC<Props> = ({ layout, subframe }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // a sub-frame pass: this frame, offset back by `subframe` frames (wrapping, since it loops)
  const shifted = (o: number) => { const t = frame - o; return t < 0 ? t + durationInFrames : t; };
  // motion blur (sub-frames across a 180° shutter) only when rendering — the editor stays real-time.
  // scripts/render.mjs renders the sub-frames as separate passes and averages them in ffmpeg instead
  // (full colour precision); it sets `subframe`, which turns the in-composition blur off.
  const blur = edit("film.motionBlur", true, { label: "Motion blur (in renders)", group: "Motion" });
  const samples = edit("film.motionBlur.samples", 4, { label: "Motion blur · sub-frames", min: 2, max: 12, step: 1, group: "Motion" });
  const rendering = getRemotionEnvironment().isRendering && subframe === undefined;
  return (
    <LayoutProvider layout={layout}>
      <AbsoluteFill style={{ background: "#ECEBE7", fontFamily: `"${theme.fonts.ui}", system-ui, sans-serif`, WebkitFontSmoothing: "antialiased" }}>
        {subframe !== undefined ? <Freeze frame={shifted(subframe)}><Film /></Freeze> : blur && rendering ? <LoopMotionBlur samples={samples} shutterAngle={180}><Film /></LoopMotionBlur> : <Film />}
        <Sound id="music.loop" label="Loop — 120 BPM (7 bars)" kind="music" src="music/loop.wav" at={0} volume={0.55} duration={840} />
        <LayoutSounds />
      </AbsoluteFill>
    </LayoutProvider>
  );
};

export const RemotionRoot: React.FC = () => (
  <Composition id="OpusViral" component={OpusViral} durationInFrames={totalDuration(savedLayout as Partial<Layout>)} fps={FPS} width={SIZE} height={SIZE}
    defaultProps={{ layout: savedLayout as Partial<Layout> }} calculateMetadata={({ props }: { props: Props }) => ({ durationInFrames: totalDuration(props.layout) })} />
);
