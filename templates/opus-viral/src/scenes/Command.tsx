import React from "react";
import { interpolate } from "remotion";
import { theme } from "../theme";
import { At, AtLeft, Swap } from "../components/Stage";
import { Search, Square, Download, Film, Blur, Code, CheckCircle } from "../components/Icons";
import { Sfx, KeyTicks } from "../components/Sfx";
import { Editable, useCopy, useClip, edit } from "../insyd";
import { useAbsFrame, useStarts, shapeAt, sp, trackCfg, UI } from "../model";

// Palette layout (UI px, relative to the shape's top edge, which moves as the shape grows):
const W = 480, ROW = 46, INPUT = 58;
const TYPE_AT = 56, KEY_EVERY = 6, DOWN_AT = 96, ENTER_AT = 114;
const ICONS = [Square, Download, Film, Blur, Code];

const useTop = () => {
  const f = useAbsFrame();
  const starts = useStarts();
  return -shapeAt(f, starts, { ink: "#000", paper: "#fff", mute: "#888" }).h / 2;
};

const Input: React.FC<{ placeholder: string; query: string }> = ({ placeholder, query }) => {
  const { frame } = useClip();
  const top = useTop();
  const typed = query.slice(0, Math.max(0, Math.min(query.length, Math.floor((frame - TYPE_AT) / KEY_EVERY) + 1)));
  const caret = Math.floor(frame / 16) % 2 === 0;
  return (
    <>
      <AtLeft x={-W / 2 + 22} y={top + INPUT / 2}><Search size={19} color={theme.colors.mute} /></AtLeft>
      <AtLeft x={-W / 2 + 52} y={top + INPUT / 2}>
        <span style={{ fontSize: 17, color: typed ? theme.colors.ink : theme.colors.mute, whiteSpace: "nowrap" }}>
          {typed || placeholder}<span style={{ display: "inline-block", width: 1.5, height: 19, marginLeft: 1, verticalAlign: -3, background: theme.colors.ink, opacity: caret ? 1 : 0 }} />
        </span>
      </AtLeft>
      <div style={{ position: "absolute", right: -W / 2 + 18, top: top + INPUT / 2 - 12, padding: "3px 7px", borderRadius: 6, border: `1px solid ${theme.colors.line}`, fontSize: 12, color: theme.colors.mute }}>⌘K</div>
      <div style={{ position: "absolute", left: -W / 2, top: top + INPUT, width: W, height: 1, background: theme.colors.line, opacity: interpolate(frame, [20, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />
    </>
  );
};

/** the list: rows stagger in when the palette opens, filter as you type, re-flow on springs */
const List: React.FC<{ items: Array<{ label: string; key: string }>; query: string }> = ({ items, query }) => {
  const { frame } = useClip();
  const top = useTop();
  // the query after each keystroke, and each row's index in the filtered list at that time
  const steps = Array.from({ length: query.length + 1 }, (_, n) => ({ at: TYPE_AT + (n - 1) * KEY_EVERY, q: query.slice(0, n).toLowerCase() }));
  const visibleIdx = (q: string) => { const out: number[] = []; let n = 0; items.forEach((it) => out.push(it.label.toLowerCase().includes(q) ? n++ : -1)); return out; };
  const highlightIdx = trackCfg(frame, [{ at: 0, v: 0, cfg: UI }, { at: DOWN_AT, v: 1, cfg: UI }]);
  const enter = sp(frame, ENTER_AT);
  return (
    <>
      <div style={{ position: "absolute", left: -W / 2 + 8, top: top + INPUT + 8 + highlightIdx * ROW, width: W - 16, height: ROW - 4, borderRadius: 10, opacity: interpolate(frame, [22, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), background: `color-mix(in srgb, ${theme.colors.ink} ${Math.round(enter * 100)}%, #F1F0EC)` }} />
      {items.map((it, i) => {
        // y: index in the filtered list, summed over keystrokes; alpha: whether the row still matches
        const ys = steps.map((s) => ({ at: Math.max(0, s.at), v: Math.max(0, visibleIdx(s.q)[i]) , cfg: UI }));
        const y = trackCfg(frame, ys);
        const keep = steps.map((s) => ({ at: Math.max(0, s.at), v: visibleIdx(s.q)[i] >= 0 ? 1 : 0, cfg: UI }));
        const alive = Math.max(0, Math.min(1, trackCfg(frame, keep)));
        const inP = interpolate(frame, [22 + i * 3, 30 + i * 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const vis = inP * alive;
        const Icon = ICONS[i % ICONS.length];
        const selected = Math.round(highlightIdx) === Math.round(y) && alive > 0.5;
        const color = selected && enter > 0.5 ? theme.colors.paper : theme.colors.ink;
        return (
          <div key={i} style={{ position: "absolute", left: -W / 2 + 22, top: top + INPUT + 8 + y * ROW, width: W - 44, height: ROW - 4, display: "flex", alignItems: "center", gap: 12,
            opacity: vis, filter: vis < 0.98 ? `blur(${(1 - vis) * 6}px)` : undefined }}>
            <Icon size={17} color={selected && enter > 0.5 ? theme.colors.paper : theme.colors.mute} />
            <span style={{ fontSize: 15, color, flex: 1, whiteSpace: "nowrap" }}>{it.label}</span>
            <span style={{ fontSize: 12, color: selected && enter > 0.5 ? theme.colors.paper : theme.colors.mute }}>{it.key}</span>
          </div>
        );
      })}
    </>
  );
};

// beats 20–23 · the chart collapses into ⌘K; it opens on 21, you type "frame" (the list filters as you
// type), arrow down, enter on 23
export const SceneCommand: React.FC = () => {
  const query = useCopy("command.query", "frame");
  return (
    <>
      <Editable id="command.input" label="Search input" kind="text" copyId="command.placeholder" delay={4} trimOut={116} style={{ position: "absolute", left: -240, top: -200, width: 480, height: 60 }}><div style={{ position: "absolute", left: 240, top: 200 }}>
        <Swap enter={8} exit={6}><Input placeholder={useCopy("command.placeholder", "Type a command")} query={query} /></Swap>
      </div></Editable>
      <Editable id="command.list" label="Command list" kind="text" copyId="command.item5" delay={4} trimOut={116} style={{ position: "absolute", left: -240, top: -140, width: 480, height: 340 }}><div style={{ position: "absolute", left: 240, top: 140 }}>
        <Swap enter={0} exit={6}><List query={query} items={[
          { label: useCopy("command.item1", "New project"), key: useCopy("command.item1.key", "⌘N") },
          { label: useCopy("command.item2", "Export video"), key: useCopy("command.item2.key", "⌘E") },
          { label: useCopy("command.item3", "Frame rate · 60fps"), key: useCopy("command.item3.key", "") },
          { label: useCopy("command.item4", "Motion blur"), key: useCopy("command.item4.key", "") },
          { label: useCopy("command.item5", "Every frame is code"), key: useCopy("command.item5.key", "↵") },
        ]} /></Swap>
      </div></Editable>
      <Sfx id="command.sfx.collapse" name="morph" at={0} volume={0.35} />
      <Sfx id="command.sfx.open" name="morph" at={26} volume={0.3} />
      <KeyTicks id="command.sfx.type" name="key" from={60} count={5} every={6} volume={0.45} />
      <Sfx id="command.sfx.down" name="key" at={100} volume={0.45} />
      <Sfx id="command.sfx.enter" name="tap" at={118} volume={0.6} />
    </>
  );
};

// beats 24–25 · enter → the palette becomes a toast
export const SceneToast: React.FC = () => (
  <>
    <Editable id="toast.body" label="Toast" kind="text" copyId="toast.text" delay={4} trimOut={59} style={{ position: "absolute", left: -190, top: -24, width: 380, height: 48 }}><div style={{ position: "absolute", left: 190, top: 24 }}>
      <Swap enter={8} exit={7}>
        <At><span style={{ display: "flex", alignItems: "center", gap: 12, whiteSpace: "nowrap" }}>
          <CheckCircle size={22} color={theme.colors.ink} bg={theme.colors.paper} />
          <span style={{ color: theme.colors.paper, fontSize: edit("toast.text.size", 18, { label: "Size", min: 12, max: 32, step: 1, unit: "px" }), fontWeight: 500 }}>{useCopy("toast.text", "Every frame is code")}</span>
        </span></At>
      </Swap>
    </div></Editable>
    <Sfx id="toast.sfx.done" name="done" at={4} volume={0.45} />
  </>
);
