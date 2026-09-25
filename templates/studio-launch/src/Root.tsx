import React from "react";
import { AbsoluteFill, Composition, Sequence } from "remotion";
import "./fonts";
import { FPS } from "./theme";
import { Grain, Vignette, Scanlines, GlitchCut } from "./components/Layers";
import { LayoutProvider, LayoutSounds, SceneFrame, Sound, sceneDuration, type Layout, type SceneDef } from "./insyd";
import savedLayout from "../layout.json";
import { SceneHook } from "./scenes/SceneHook";
import { SceneWithout } from "./scenes/SceneWithout";
import { SceneSearch } from "./scenes/SceneSearch";
import { SceneIntro } from "./scenes/SceneIntro";
import { SceneWord } from "./scenes/SceneWord";
import { ScenePrompt } from "./scenes/ScenePrompt";
import { SceneQueue } from "./scenes/SceneQueue";
import { SceneNetwork } from "./scenes/SceneNetwork";
import { SceneWall } from "./scenes/SceneWall";
import { SceneEnd } from "./scenes/SceneEnd";

// Scene list, cut to the score (public/music/score.wav, 120 BPM → a beat every 15 frames, a bar
// every 60). Intro bars 0–7 · build 8–9 · drop at f600 (INTRODUCING…) · break at f1380 · final hit
// at f1500 (the logo). Every scene starts on a bar or half-bar.
export const SCENES: Array<{ id: string; label: string; component: React.FC; duration: number }> = [
  { id: "hook", label: "TODAY", component: SceneHook, duration: 180 },
  { id: "without", label: "Without…?", component: SceneWithout, duration: 180 },
  { id: "search", label: "Search bar", component: SceneSearch, duration: 120 },
  { id: "intro", label: "Introducing (room)", component: SceneIntro, duration: 240 },
  { id: "word", label: "STUDIO", component: SceneWord, duration: 120 },
  { id: "prompt", label: "Prompt", component: ScenePrompt, duration: 120 },
  { id: "queue", label: "Edit queue", component: SceneQueue, duration: 150 },
  { id: "network", label: "Feature constellation", component: SceneNetwork, duration: 210 },
  { id: "wall", label: "Template wall", component: SceneWall, duration: 120 },
  { id: "end", label: "End card", component: SceneEnd, duration: 300 },
];
export const SCENE_DEFS: SceneDef[] = SCENES.map((s) => ({ id: s.id, label: s.label, durationInFrames: s.duration }));

export type LaunchProps = { layout?: Partial<Layout> };
export const totalDuration = (layout?: Partial<Layout>) =>
  SCENES.reduce((a, s) => a + sceneDuration(layout as Layout | undefined, s.id, s.duration), 0);

export const Launch: React.FC<LaunchProps> = ({ layout }) => {
  let at = 0;
  const cuts: number[] = [];
  return (
    <LayoutProvider layout={layout}>
      <AbsoluteFill style={{ background: "#000" }}>
        {SCENES.map(({ id, component: Scene, duration }, i) => {
          const dur = sceneDuration(layout as Layout | undefined, id, duration);
          const from = at;
          at += dur;
          if (i > 0) cuts.push(from);
          return (
            <Sequence key={id} from={from} durationInFrames={dur} name={id}>
              <SceneFrame id={id}><Scene /></SceneFrame>
            </Sequence>
          );
        })}
        <Scanlines />
        <Vignette />
        <Grain />
        {cuts.map((c) => <Sequence key={c} from={c - 3} durationInFrames={6} name="glitch cut" layout="none"><GlitchCut /></Sequence>)}
        {/* The score, and any sounds added in the editor */}
        <Sound id="music.score" label="Score — dark pulse (120 BPM)" kind="music" src="music/score.wav" at={0} volume={0.85} duration={1740} fadeOut={20} />
        <LayoutSounds />
      </AbsoluteFill>
    </LayoutProvider>
  );
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="StudioLaunch"
    component={Launch}
    durationInFrames={totalDuration(savedLayout as Partial<Layout>)}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={{ layout: savedLayout as Partial<Layout> }}
    calculateMetadata={({ props }: { props: LaunchProps }) => ({ durationInFrames: totalDuration(props.layout) })}
  />
);
