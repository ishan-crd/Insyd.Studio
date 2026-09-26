import React from "react";
import { AbsoluteFill, Composition, Sequence } from "remotion";
import "./fonts";
import { FPS } from "./theme";
import { Finish } from "./components/Layers";
import { LayoutProvider, LayoutSounds, SceneFrame, Sound, sceneDuration, type Layout, type SceneDef } from "./insyd";
import savedLayout from "../layout.json";
import { SceneLogo } from "./scenes/SceneLogo";
import { SceneMeet } from "./scenes/SceneMeet";
import { ScenePills } from "./scenes/ScenePills";
import { SceneControl } from "./scenes/SceneControl";
import { SceneSearch } from "./scenes/SceneSearch";
import { SceneShip } from "./scenes/SceneShip";
import { SceneFigma } from "./scenes/SceneFigma";
import { SceneNo } from "./scenes/SceneNo";
import { SceneYellow } from "./scenes/SceneYellow";
import { SceneCTA } from "./scenes/SceneCTA";
import { SceneEnd } from "./scenes/SceneEnd";

// Scene list, cut to "Wannabe" (112 BPM): every scene starts 3 frames BEFORE a downbeat, so its
// entrance is visibly moving when the beat lands (sound effects lead by 2 frames for the same reason).
// Bars (frames): 0 | 102 | 167 | 233 | 298 | 364 | 430 | 495 | 560 | 625 | 690 | 756 | 821 | 887 | 952 | 1018 | 1083 | 1149 | 1214 | 1280 | 1345 | 1411 | 1476 | end 1513
export const SCENES: Array<{ id: string; label: string; component: React.FC; duration: number }> = [
  { id: "logo", label: "Logo sting", component: SceneLogo, duration: 164 },      // quiet intro; the click + burst land on the song's entrance (f102)
  { id: "meet", label: "Meet the thumb", component: SceneMeet, duration: 66 },   // 1 bar
  { id: "pills", label: "Ask Claude to…", component: ScenePills, duration: 179 }, // 2 bars, one pill per beat
  { id: "control", label: "Control your iPhone", component: SceneControl, duration: 66 },
  { id: "search", label: "Search demo", component: SceneSearch, duration: 195 },  // 3 bars
  { id: "ship", label: "Build faster", component: SceneShip, duration: 65 },
  { id: "figma", label: "Figma match", component: SceneFigma, duration: 289 },    // 5 bars, edits on beats
  { id: "no", label: "No jailbreak", component: SceneNo, duration: 82 },          // the section lift at 33.9 s
  { id: "yellow", label: "Settings demo", component: SceneYellow, duration: 88 }, // 2 bars, chips on beats
  { id: "cta", label: "Call to action", component: SceneCTA, duration: 92 },
  { id: "end", label: "End card", component: SceneEnd, duration: 236 },           // lands on the biggest hit (42.66 s), holds to the end of the song
];
export const SCENE_DEFS: SceneDef[] = SCENES.map((s) => ({ id: s.id, label: s.label, durationInFrames: s.duration }));

export type LaunchProps = { layout?: Partial<Layout> };
export const totalDuration = (layout?: Partial<Layout>) =>
  SCENES.reduce((a, s) => a + sceneDuration(layout as Layout | undefined, s.id, s.duration), 0);

export const Launch: React.FC<LaunchProps> = ({ layout }) => {
  let at = 0;
  return (
    <LayoutProvider layout={layout}>
      <AbsoluteFill style={{ background: "#F4F2ED" }}>
        {SCENES.map(({ id, component: Scene, duration }) => {
          const dur = sceneDuration(layout as Layout | undefined, id, duration);
          const from = at;
          at += dur;
          return (
            <Sequence key={id} from={from} durationInFrames={dur} name={id}>
              <SceneFrame id={id}><Scene /></SceneFrame>
            </Sequence>
          );
        })}
        <Finish />
        {/* Music bed and any sounds added in the editor */}
        <Sound id="music.bed" label="Wannabe" kind="music" src="music/wannabe.mp3" at={0} volume={0.65} duration={1513} fadeOut={14} />
        <LayoutSounds />
      </AbsoluteFill>
    </LayoutProvider>
  );
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="ThumbLaunch"
    component={Launch}
    durationInFrames={totalDuration(savedLayout as Partial<Layout>)}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={{ layout: savedLayout as Partial<Layout> }}
    calculateMetadata={({ props }: { props: LaunchProps }) => ({ durationInFrames: totalDuration(props.layout) })}
  />
);
