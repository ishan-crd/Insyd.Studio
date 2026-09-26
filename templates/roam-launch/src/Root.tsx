import React from "react";
import { AbsoluteFill, Composition, Sequence } from "remotion";
import "./fonts";
import { FPS, W, H } from "./theme";
import { Grain } from "./components/Kit";
import { Editable, LayoutProvider, LayoutSounds, SceneFrame, Sound, edit, sceneDuration, type Layout, type SceneDef } from "./insyd";
import savedLayout from "../layout.json";
import { SceneHook, SceneQuestion, ScenePrompt, SceneLogo } from "./scenes/Intro";
import { SceneItinerary, SceneMap, SceneBudget, SceneBooked } from "./scenes/Product";
import { SceneMontage, SceneEnd } from "./scenes/Outro";

// Scene list, cut to the score (public/music/track.wav, 120 BPM → a beat every 15 frames, a bar every
// 60). Hook bars 0–1 · build 2–4 (riser into the drop) · drop at f300 (ROAM) · montage from f780 ·
// final hit at f900 (the end card). Every cut sits on a beat.
export const SCENES: Array<{ id: string; label: string; component: React.FC; duration: number }> = [
  { id: "hook", label: "Hook (4 slams)", component: SceneHook, duration: 120 },
  { id: "question", label: "What if…", component: SceneQuestion, duration: 90 },
  { id: "prompt", label: "The ask", component: ScenePrompt, duration: 90 },
  { id: "logo", label: "ROAM (drop)", component: SceneLogo, duration: 60 },
  { id: "itinerary", label: "Itinerary", component: SceneItinerary, duration: 120 },
  { id: "map", label: "Route map", component: SceneMap, duration: 120 },
  { id: "budget", label: "Budget", component: SceneBudget, duration: 90 },
  { id: "booked", label: "Booked", component: SceneBooked, duration: 90 },
  { id: "montage", label: "Anywhere", component: SceneMontage, duration: 120 },
  { id: "end", label: "End card", component: SceneEnd, duration: 150 },
];
export const SCENE_DEFS: SceneDef[] = SCENES.map((s) => ({ id: s.id, label: s.label, durationInFrames: s.duration }));

export type RoamProps = { layout?: Partial<Layout> };
export const totalDuration = (layout?: Partial<Layout>) =>
  SCENES.reduce((a, s) => a + sceneDuration(layout as Layout | undefined, s.id, s.duration), 0);

export const Roam: React.FC<RoamProps> = ({ layout }) => {
  let at = 0;
  const total = totalDuration(layout);
  return (
    <LayoutProvider layout={layout}>
      <AbsoluteFill style={{ background: "#0E0E12", overflow: "hidden" }}>
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
        {/* finishing layer: a clip on the timeline like everything else (click-through on the canvas) */}
        <Editable id="film.grain" label="Paper grain" display="fill" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <Grain amount={edit("film.grain.amount", 0.08, { label: "Amount", min: 0, max: 0.5, step: 0.01 })} />
        </Editable>
        <Sound id="music.track" label="Track — sunny house (120 BPM)" kind="music" src="music/track.wav" at={0} volume={0.8} duration={total} fadeOut={24} />
        <LayoutSounds />
      </AbsoluteFill>
    </LayoutProvider>
  );
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="RoamLaunch"
    component={Roam}
    durationInFrames={totalDuration(savedLayout as Partial<Layout>)}
    fps={FPS}
    width={W}
    height={H}
    defaultProps={{ layout: savedLayout as Partial<Layout> }}
    calculateMetadata={({ props }: { props: RoamProps }) => ({ durationInFrames: totalDuration(props.layout) })}
  />
);
