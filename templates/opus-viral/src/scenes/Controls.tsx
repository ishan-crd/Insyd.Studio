import React from "react";
import { interpolate } from "remotion";
import { theme } from "../theme";
import { At, Swap } from "../components/Stage";
import { Speaker } from "../components/Icons";
import { Sfx, KeyTicks } from "../components/Sfx";
import { Editable, useCopy, edit } from "../insyd";
import { useAbsFrame, useStarts, volumeAt, VOLUME_TRACK, liquid, press, sp, at, lerp } from "../model";

const mix = (a: string, b: string, t: number) => {
  const h = (c: string) => { const n = parseInt(c.replace("#", "").slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const x = h(a), y = h(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * Math.max(0, Math.min(1, t)))).join(",")})`;
};

// ---------------------------------------------------------------- volume
const Volume: React.FC = () => {
  const f = useAbsFrame();
  const starts = useStarts();
  const { v, over } = volumeAt(f, starts);
  const { x0, x1 } = VOLUME_TRACK, w = x1 - x0, o = Math.max(0, over);
  return (
    <>
      <At x={-178}><Speaker size={22} color={theme.colors.paper} level={v} /></At>
      <div style={{ position: "absolute", left: x0, top: -4, width: w + o, height: 8, borderRadius: 4, background: "rgba(255,255,255,.2)" }} />
      <div style={{ position: "absolute", left: x0, top: -4, width: v * w + o, height: 8, borderRadius: 4, background: theme.colors.paper }} />
    </>
  );
};
// beats 8–10 · the player collapses into a volume slider: drag it down, then past max — it stretches,
// and springs back from wherever it was released
export const SceneVolume: React.FC = () => (
  <>
    <Editable id="volume.slider" label="Volume slider" delay={5} trimOut={88} style={{ position: "absolute", left: -196, top: -18, width: 400, height: 36 }}><div style={{ position: "absolute", left: 196, top: 18 }}>
      <Swap enter={8} exit={6}><Volume /></Swap>
    </div></Editable>
    <Sfx id="volume.sfx.morph" name="morph" at={0} volume={0.35} />
    <Sfx id="volume.sfx.grab" name="tap" at={8} volume={0.55} />
    <KeyTicks id="volume.sfx.down" name="scrub" from={14} count={10} every={2} volume={0.25} />
    <KeyTicks id="volume.sfx.up" name="scrub" from={38} count={10} every={2} volume={0.25} />
    <Sfx id="volume.sfx.stretch" name="stretch" at={52} volume={0.4} />
    <Sfx id="volume.sfx.release" name="release" at={66} volume={0.5} />
  </>
);

// ---------------------------------------------------------------- toggle
const KNOB = 60;
/** the knob flips on the beat; its leading edge runs ahead of the trailing one (it stretches) */
const Knob: React.FC = () => {
  const f = useAbsFrame();
  const starts = useStarts();
  const flip = press(starts, "toggle").from + 2;
  const { l, r } = liquid(f, [{ at: 0, l: -60, r: 0 }, { at: flip, l: 0, r: 60 }]);
  const on = sp(f, flip);
  return <div style={{ position: "absolute", left: l, top: -KNOB / 2, width: r - l, height: KNOB, borderRadius: KNOB / 2, background: mix("#BEBEB9", theme.colors.paper, on), boxShadow: "0 2px 6px rgba(0,0,0,.18)" }} />;
};
// beats 11–12 · the slider tightens into a toggle; the cursor flips it on beat 12
export const SceneToggle: React.FC = () => (
  <>
    <Editable id="toggle.knob" label="Toggle knob" delay={4} trimOut={55} style={{ position: "absolute", left: -66, top: -34, width: 132, height: 68 }}><div style={{ position: "absolute", left: 66, top: 34 }}>
      <Swap enter={7} exit={0}><Knob /></Swap>
    </div></Editable>
    <Sfx id="toggle.sfx.morph" name="morph" at={0} volume={0.3} />
    <Sfx id="toggle.sfx.click" name="tap" at={28} volume={0.6} />
    <Sfx id="toggle.sfx.flip" name="toggle" at={30} volume={0.6} />
  </>
);

// ---------------------------------------------------------------- tabs
export const TAB_X = [-140, 0, 140];
const TAB_HALF = 64;
/** the toggle's knob becomes the indicator: it starts at the knob's rect and flows to Day, Week, Month */
const Indicator: React.FC = () => {
  const f = useAbsFrame();
  const starts = useStarts();
  const t0 = at(starts, "tabs", 0), week = press(starts, "tabs", 0).from + 2, month = press(starts, "tabs", 1).from + 2;
  const { l, r } = liquid(f, [
    { at: 0, l: 0, r: 60 },
    { at: t0 + 2, l: TAB_X[0] - TAB_HALF, r: TAB_X[0] + TAB_HALF },
    { at: week, l: TAB_X[1] - TAB_HALF, r: TAB_X[1] + TAB_HALF },
    { at: month, l: TAB_X[2] - TAB_HALF, r: TAB_X[2] + TAB_HALF },
  ]);
  const k = sp(f, t0);
  const h = lerp(KNOB, 52, k);
  return <div style={{ position: "absolute", left: l, top: -h / 2, width: r - l, height: h, borderRadius: h / 2, background: mix(theme.colors.paper, theme.colors.ink, k) }} />;
};
/** labels are white where the indicator sits under them */
const Labels: React.FC<{ names: string[]; size: number }> = ({ names, size }) => {
  const f = useAbsFrame();
  const starts = useStarts();
  const week = press(starts, "tabs", 0).from + 2, month = press(starts, "tabs", 1).from + 2;
  const active = [1 - sp(f, week), sp(f, week) - sp(f, month), sp(f, month)];
  return <>{names.map((n, i) => <At key={i} x={TAB_X[i]}><span style={{ fontSize: size, fontWeight: 500, color: mix("#6E6E6A", theme.colors.paper, active[i]), whiteSpace: "nowrap" }}>{n}</span></At>)}</>;
};
// beats 13–15 · the knob stretches into a tab indicator on a white segmented control; Week, then Month
export const SceneTabs: React.FC = () => (
  <>
    <Editable id="tabs.indicator" label="Tab indicator" delay={0} trimOut={89} style={{ position: "absolute", left: -210, top: -30, width: 420, height: 60 }}><div style={{ position: "absolute", left: 210, top: 30 }}>
      <Swap enter={0} exit={0}><Indicator /></Swap>
    </div></Editable>
    <Editable id="tabs.labels" label="Tab labels" kind="text" copyId="tabs.labels.day" delay={4} trimOut={85} style={{ position: "absolute", left: -210, top: -30, width: 420, height: 60 }}><div style={{ position: "absolute", left: 210, top: 30 }}>
      <Swap enter={8} exit={0}><Labels size={edit("tabs.labels.size", 17, { label: "Size", min: 10, max: 30, step: 1, unit: "px" })}
        names={[useCopy("tabs.labels.day", "Day"), useCopy("tabs.labels.week", "Week"), useCopy("tabs.labels.month", "Month")]} /></Swap>
    </div></Editable>
    <Sfx id="tabs.sfx.morph" name="morph" at={0} volume={0.3} />
    <Sfx id="tabs.sfx.week" name="tap" at={28} volume={0.6} />
    <Sfx id="tabs.sfx.month" name="tap" at={58} volume={0.6} />
  </>
);
export { mix };
