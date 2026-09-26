import React from "react";
import { interpolate } from "remotion";
import { theme } from "../theme";
import { At, AtLeft, Swap } from "../components/Stage";
import { Sfx, KeyTicks } from "../components/Sfx";
import { Editable, useCopy, useClip, edit } from "../insyd";
import { useAbsFrame, useStarts, cursorAt, liquid, press, sp, at, lerp, clamp01, UI } from "../model";
import { mix, TAB_X } from "./Controls";

// Card: 500×380, centred. Plot area in UI px:
const PX0 = -218, PX1 = 218, PY0 = -24, PY1 = 150;
const MONTH = [0.18, 0.26, 0.22, 0.34, 0.3, 0.4, 0.46, 0.42, 0.56, 0.62, 0.74, 0.9];
const WEEK = [0.34, 0.46, 0.38, 0.5, 0.42, 0.56, 0.48, 0.6, 0.5, 0.62, 0.54, 0.58];
const ease = (t: number) => 1 - (1 - t) ** 3;

/** the tab row rises out of the pill into the card's header; Week is clicked on beat 19 */
const ChartTabs: React.FC<{ names: string[] }> = ({ names }) => {
  const f = useAbsFrame();
  const starts = useStarts();
  const t0 = at(starts, "chart", 0), week = press(starts, "chart").from + 2;
  const up = sp(f, t0, UI);
  const s = lerp(1, 0.62, up), y = lerp(0, -150, up);
  const { l, r } = liquid(f, [{ at: 0, l: TAB_X[2] - 64, r: TAB_X[2] + 64 }, { at: week, l: TAB_X[1] - 64, r: TAB_X[1] + 64 }]);
  const wk = sp(f, week);
  const active = [0, wk, 1 - wk];
  return (
    <div style={{ position: "absolute", left: 0, top: y, transform: `scale(${s})`, transformOrigin: "0 0" }}>
      <div style={{ position: "absolute", left: l, top: -26, width: r - l, height: 52, borderRadius: 26, background: theme.colors.ink }} />
      {names.map((n, i) => <At key={i} x={TAB_X[i]}><span style={{ fontSize: 17, fontWeight: 500, color: mix("#6E6E6A", theme.colors.paper, active[i]), whiteSpace: "nowrap" }}>{n}</span></At>)}
    </div>
  );
};

const series = (f: number, starts: Record<string, number>) => {
  const k = sp(f, press(starts, "chart").from + 2);
  return MONTH.map((m, i) => lerp(m, WEEK[i], k));
};
const pointAt = (vals: number[], x: number) => {
  const u = clamp01((x - PX0) / (PX1 - PX0)) * (vals.length - 1), i = Math.min(vals.length - 2, Math.floor(u)), t = u - i;
  const v = lerp(vals[i], vals[i + 1], t * t * (3 - 2 * t));
  return { x, y: PY1 - v * (PY1 - PY0), v };
};
/** smooth path through the points (Catmull-Rom → cubic Bézier) */
const pathOf = (vals: number[]) => {
  const pts = vals.map((v, i) => [PX0 + (i / (vals.length - 1)) * (PX1 - PX0), PY1 - v * (PY1 - PY0)]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
  }
  return d;
};

const Number: React.FC<{ month: number; week: number; label: string }> = ({ month, week, label }) => {
  const f = useAbsFrame();
  const starts = useStarts();
  const { frame } = useClip();
  const up = ease(interpolate(frame, [0, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const toWeek = sp(f, press(starts, "chart").from + 2, { damping: 30, stiffness: 90, mass: 1 });
  const n = Math.round(lerp(lerp(month * 0.72, month, up), week, toWeek));
  return (
    <>
      <AtLeft x={PX0} y={-96}><span style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-0.03em", color: theme.colors.ink, fontVariantNumeric: "tabular-nums" }}>{n.toLocaleString("en-US")}</span></AtLeft>
      <AtLeft x={PX0} y={-62}><span style={{ fontSize: 13, color: theme.colors.mute }}>{label}</span></AtLeft>
    </>
  );
};

/** the line draws itself left → right; a soft area sits under it */
const Line: React.FC = () => {
  const f = useAbsFrame();
  const starts = useStarts();
  const { frame } = useClip();
  const draw = ease(interpolate(frame, [0, 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const d = pathOf(series(f, starts));
  const w = PX1 - PX0;
  return (
    <svg style={{ position: "absolute", left: PX0, top: PY0 - 10, overflow: "visible" }} width={w} height={PY1 - PY0 + 10} viewBox={`${PX0} ${PY0 - 10} ${w} ${PY1 - PY0 + 10}`}>
      <defs>
        <linearGradient id="ov-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={theme.colors.ink} stopOpacity={0.07} /><stop offset="1" stopColor={theme.colors.ink} stopOpacity={0} /></linearGradient>
        <clipPath id="ov-draw"><rect x={PX0 - 4} y={PY0 - 40} width={(w + 8) * draw} height={PY1 - PY0 + 60} /></clipPath>
      </defs>
      {[0, 0.5, 1].map((g) => <line key={g} x1={PX0} x2={PX1} y1={PY0 + g * (PY1 - PY0)} y2={PY0 + g * (PY1 - PY0)} stroke={theme.colors.line} strokeWidth={1} />)}
      <g clipPath="url(#ov-draw)">
        <path d={`${d} L${PX1} ${PY1} L${PX0} ${PY1} Z`} fill="url(#ov-area)" />
        <path d={d} fill="none" stroke={theme.colors.ink} strokeWidth={2.2} strokeLinecap="round" />
      </g>
    </svg>
  );
};

/** hovering the plot: a dot on the line and a value pill that follow the cursor */
const Tooltip: React.FC<{ max: number }> = ({ max }) => {
  const f = useAbsFrame();
  const starts = useStarts();
  const c = cursorAt(f, starts);
  const inside = c.x > PX0 - 4 && c.x < PX1 + 4 && c.y > PY0 - 30 && c.y < PY1 + 10;
  const { frame, end } = useClip();
  const show = interpolate(frame, [0, 6, end - 6, end], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * (inside ? 1 : 0);
  const p = pointAt(series(f, starts), Math.max(PX0, Math.min(PX1, c.x)));
  return (
    <div style={{ opacity: show }}>
      <div style={{ position: "absolute", left: p.x - 0.5, top: PY0, width: 1, height: PY1 - PY0, background: theme.colors.line }} />
      <div style={{ position: "absolute", left: p.x - 5, top: p.y - 5, width: 10, height: 10, borderRadius: 5, background: theme.colors.ink, boxShadow: `0 0 0 3px ${theme.colors.paper}` }} />
      <At x={p.x} y={p.y - 26}><span style={{ display: "block", padding: "4px 9px", borderRadius: 8, background: theme.colors.ink, color: theme.colors.paper, fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{Math.round(p.v * max).toLocaleString("en-US")}</span></At>
    </div>
  );
};

// beats 16–19 · the tabs open into a chart that draws itself; hover shows a tooltip; Week re-shapes it
export const SceneChart: React.FC = () => (
  <>
    <Editable id="chart.tabs" label="Tabs (header)" kind="text" copyId="chart.tabs.day" delay={0} trimOut={117} style={{ position: "absolute", left: -140, top: -172, width: 280, height: 44 }}><div style={{ position: "absolute", left: 140, top: 172 }}>
      <Swap enter={0} exit={6}><ChartTabs names={[useCopy("chart.tabs.day", "Day"), useCopy("chart.tabs.week", "Week"), useCopy("chart.tabs.month", "Month")]} /></Swap>
    </div></Editable>
    <Editable id="chart.number" label="Total" kind="text" copyId="chart.number.label" delay={6} trimOut={111} style={{ position: "absolute", left: -222, top: -126, width: 300, height: 76 }}><div style={{ position: "absolute", left: 222, top: 126 }}>
      <Swap enter={8} exit={6}><Number month={edit("chart.number.month", 84320, { label: "Month total", min: 0, max: 9999999, step: 1 })} week={edit("chart.number.week", 19204, { label: "Week total", min: 0, max: 9999999, step: 1 })} label={useCopy("chart.number.label", "total views")} /></Swap>
    </div></Editable>
    <Editable id="chart.line" label="Line chart" delay={8} trimOut={109} style={{ position: "absolute", left: -222, top: -40, width: 444, height: 196 }}><div style={{ position: "absolute", left: 222, top: 40 }}>
      <Swap enter={6} exit={6}><Line /></Swap>
    </div></Editable>
    <Editable id="chart.tooltip" label="Tooltip" delay={22} trimOut={62} style={{ position: "absolute", left: -222, top: -60, width: 444, height: 216 }}><div style={{ position: "absolute", left: 222, top: 60 }}>
      <Tooltip max={edit("chart.tooltip.max", 88000, { label: "Value at the top of the plot", min: 1, max: 9999999, step: 1 })} />
    </div></Editable>
    <Sfx id="chart.sfx.morph" name="morph" at={0} volume={0.35} />
    <KeyTicks id="chart.sfx.count" name="scrub" from={8} count={14} every={2} volume={0.18} />
    <Sfx id="chart.sfx.week" name="tap" at={88} volume={0.6} />
  </>
);
