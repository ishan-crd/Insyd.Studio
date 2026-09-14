import React, { useState } from "react";
import { useStore, sceneAt } from "../state/store";
import { usePlayback } from "../state/playback";
import { playerRef, seek } from "../lib/player";
import { timecode } from "../lib/format";
import { saveToCode } from "../lib/persist";
import { copyClaudePrompt } from "../lib/claude";
import { scanProject } from "../lib/scan";
import { useTheme } from "../lib/theme";
import { useEscape } from "../lib/useEscape";
import { splitElements, duplicateElements, deleteElements, setElementsLocked, isElementLocked, splitSounds, duplicateSounds, deleteSounds, setSoundsLocked, isSoundLocked, soundClip } from "../lib/clips";
import { Back, Export, Sun, Moon, Undo, Redo, Play, Pause, PrevScene, NextScene, Layers as LayersIcon, Sliders, Palette, More as MoreIcon, ClaudeMark, Copy, Refresh, Scissors, Duplicate, Lock, Unlock, Trash, Save, EyeOff, Mute } from "../lib/icons";
import { Stage } from "./Preview";
import { Library } from "./Library";
import { Inspector } from "./Inspector";
import { Timeline } from "./Timeline";
import { ExportDialog } from "./ExportDialog";
import { ClaudeDialog } from "./ClaudeDialog";
import { ContextMenuHost } from "./ContextMenu";

// The phone layout ("Studio Editor Mobile"): the same store, player, inspector, library and timeline
// as the desktop editor, arranged in one column — preview, transport, timeline, and a panel switched
// by a bottom dock (Layers · Inspect · Brand · More). Everything the top bar and shortcuts offer on
// desktop lives in the More sheet here.
type Tab = "layers" | "inspect" | "brand";

const TopBar: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const def = useStore((s) => s.def)!;
  const dirty = useStore((s) => s.dirty());
  const pendingCount = useStore((s) => Object.values(s.pending()).filter((v) => typeof v === "object").reduce((a, v: any) => a + Object.keys(v).length, 0));
  const theme = useTheme((s) => s.theme);
  const [exp, setExp] = useState(false);
  return (
    <header className="m-top">
      <button className="m-ib" onClick={onOpen} title="Projects"><Back /></button>
      <div className="m-title">
        <div className="name">{def.name}</div>
        <div className="meta">{def.width}×{def.height} · {def.fps} fps · <b className={dirty ? "" : "ok"}>{dirty ? `${pendingCount || 1} unsaved` : "saved"}</b></div>
      </div>
      <button className="m-ib" title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={() => useTheme.getState().toggle()}>{theme === "dark" ? <Sun /> : <Moon />}</button>
      <button className="btn primary m-export" onClick={() => setExp(true)}><Export /> Export</button>
      {exp && <ExportDialog onClose={() => setExp(false)} />}
    </header>
  );
};

const Transport: React.FC = () => {
  const def = useStore((s) => s.def)!;
  const duration = useStore((s) => s.duration());
  const scenes = useStore((s) => s.scenes());
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const frame = usePlayback((s) => s.frame);
  const playing = usePlayback((s) => s.playing);
  const scene = sceneAt(scenes, frame);
  const i = scene ? scenes.indexOf(scene) : -1;
  // ◀ goes to the start of this scene, or the previous one when already near its start
  const prev = () => { if (!scene) return seek(0); seek(frame > scene.from + 10 ? scene.from : (scenes[i - 1]?.from ?? 0)); };
  const next = () => seek(scenes[i + 1]?.from ?? duration - 1);
  return (
    <div className="m-transport">
      <button className="m-ib" title="Undo" disabled={!canUndo} onClick={() => useStore.getState().undo()}><Undo /></button>
      <button className="m-ib" title="Redo" disabled={!canRedo} onClick={() => useStore.getState().redo()}><Redo /></button>
      <div className="spacer" />
      <button className="m-ib" title="Previous scene" onClick={prev}><PrevScene /></button>
      <button className="m-play" title="Play / pause" onClick={() => playerRef.current?.toggle()}>{playing ? <Pause /> : <Play />}</button>
      <button className="m-ib" title="Next scene" onClick={next}><NextScene /></button>
      <div className="spacer" />
      <div className="tc">{timecode(frame, def.fps)}<span> / {timecode(duration, def.fps)}</span></div>
    </div>
  );
};

const Row: React.FC<{ icon?: React.ReactNode; label: string; detail?: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }> = ({ icon, label, detail, onClick, disabled, danger }) => (
  <button className={`m-row ${danger ? "danger" : ""}`} onClick={onClick} disabled={disabled}><span className="ico">{icon}</span><span className="lbl">{label}</span><span className="det">{detail}</span></button>
);

const MoreSheet: React.FC<{ onClose: () => void; onClaude: () => void }> = ({ onClose, onClaude }) => {
  const dirty = useStore((s) => s.dirty());
  const saving = useStore((s) => s.saving);
  const pendingCount = useStore((s) => Object.values(s.pending()).filter((v) => typeof v === "object").reduce((a, v: any) => a + Object.keys(v).length, 0));
  const selection = useStore((s) => s.selection);
  const scan = useStore((s) => s.scan);
  const zoom = useStore((s) => s.zoom) ?? 1;
  useEscape(onClose);
  const store = useStore.getState;
  const kind = selection?.type === "element" || selection?.type === "sound" ? selection.type : null;
  const ids = kind ? store().selectedIds() : [];
  const n = ids.length;
  const locked = n > 0 && ids.every((id) => (kind === "sound" ? isSoundLocked(id) : isElementLocked(id)));
  const hidden = kind === "element" && n > 0 && ids.every((id) => store().transform(id).hidden);
  const muted = kind === "sound" && n > 0 && ids.every((id) => !!store().layout.sounds[id]?.muted);
  const one = n === 1 ? (kind === "sound" ? soundClip(ids[0])?.label : store().allElements().find((e) => e.id === ids[0])?.label) ?? ids[0] : "";
  const sel = n ? (n > 1 ? `${n} ${kind === "sound" ? "sounds" : "elements"}` : one) : "select a clip first";
  const then = (f: () => void) => () => { f(); onClose(); };
  const frame = () => usePlayback.getState().frame;
  return (
    <div className="modal-bg" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal m-sheet" data-testid="more-sheet">
        <h2>More</h2>
        <div className="m-group">Project</div>
        <Row icon={<Save />} label="Save to source" detail={saving ? "Saving…" : dirty ? `${pendingCount} change${pendingCount === 1 ? "" : "s"}` : "up to date"} disabled={!dirty || saving} onClick={then(() => { saveToCode(); })} />
        <Row icon={<span style={{ color: "var(--claude)", display: "inline-grid" }}><ClaudeMark /></span>} label="Open in Claude Code" detail="MCP" onClick={() => { onClose(); onClaude(); }} />
        <Row icon={<Copy />} label="Copy prompt" detail="no MCP" onClick={then(() => { copyClaudePrompt(); })} />
        <Row icon={<Refresh />} label="Rescan project" detail={scan.status === "running" ? `${Math.round(scan.progress * 100)}%` : ""} disabled={scan.status === "running"} onClick={then(() => scanProject(3, true))} />
        <div className="m-group">Selection <span>{sel}</span></div>
        <Row icon={<Scissors />} label="Split at playhead" disabled={!n || locked} onClick={then(() => (kind === "sound" ? splitSounds(frame(), ids) : splitElements(frame(), ids)))} />
        <Row icon={<Duplicate />} label={kind === "element" ? "Duplicate (linked copy)" : "Duplicate"} disabled={!n} onClick={then(() => (kind === "sound" ? duplicateSounds(ids) : duplicateElements(ids)))} />
        <Row icon={locked ? <Unlock /> : <Lock />} label={locked ? "Unlock" : "Lock"} disabled={!n} onClick={then(() => (kind === "sound" ? setSoundsLocked(ids, !locked) : setElementsLocked(ids, !locked)))} />
        {kind === "sound"
          ? <Row icon={<Mute />} label={muted ? "Unmute" : "Mute"} disabled={!n} onClick={then(() => store().setSounds(Object.fromEntries(ids.map((id) => [id, { muted: !muted }]))))} />
          : <Row icon={<EyeOff />} label={hidden ? "Show" : "Hide"} disabled={!n || locked} onClick={then(() => store().updateElements(Object.fromEntries(ids.map((id) => [id, { hidden: !hidden }]))))} />}
        <Row icon={<Trash />} label={n > 1 ? `Delete ${n}` : "Delete"} detail={kind ? "code items: hide / mute" : ""} disabled={!n || locked} danger onClick={then(() => (kind === "sound" ? deleteSounds(ids) : deleteElements(ids)))} />
        <div className="m-group">Timeline <span>{Math.round(zoom * 100)}%</span></div>
        <div className="m-zoom">
          <button className="btn" onClick={() => store().setZoom(Math.max(1, zoom / 1.25))} disabled={zoom <= 1}>−</button>
          <button className="btn" onClick={() => store().setZoom(null)} disabled={zoom === 1}>Fit</button>
          <button className="btn" onClick={() => store().setZoom(Math.min(8, zoom * 1.25))} disabled={zoom >= 8}>+</button>
        </div>
      </div>
    </div>
  );
};

export const MobileApp: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const def = useStore((s) => s.def)!;
  const toast = useStore((s) => s.toast);
  const [tab, setTab] = useState<Tab>("layers");
  const [more, setMore] = useState(false);
  const [claude, setClaude] = useState(false);
  // a tap on a list row in Layers / Brand selects something — show it in Inspect right away
  const inspectAfterTap = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest(".eye, .group, .tabs, .panel-foot")) return;
    if (!t.closest(".row, .swatch, .token")) return;
    setTimeout(() => { if (useStore.getState().selection) setTab("inspect"); }, 0);
  };
  // picking an element on the canvas opens the inspector too (the timeline keeps the current tab)
  const canvasUp = () => setTimeout(() => { if (useStore.getState().selection?.type === "element") setTab("inspect"); }, 0);
  const dock = (t: Tab | "more", icon: React.ReactNode, label: string) => (
    <button className={`m-dock-btn ${tab === t && !more ? "on" : ""}`} onClick={() => (t === "more" ? setMore(true) : setTab(t))} data-tab={t}>{icon}<span>{label}</span></button>
  );
  return (
    <div className="app mobile" data-tab={tab}>
      <TopBar onOpen={onOpen} />
      <div className="m-preview" onPointerUpCapture={canvasUp}><Stage pad={0} className="m" style={{ aspectRatio: `${def.width} / ${def.height}` }} /></div>
      <Transport />
      <Timeline />
      <div className="m-panel">
        {tab === "layers" && <div className="m-fill" onClickCapture={inspectAfterTap}><Library only={["scenes", "elements", "sounds"]} /></div>}
        {tab === "inspect" && <Inspector />}
        {tab === "brand" && <div className="m-fill" onClickCapture={inspectAfterTap}><Library only={["brand"]} /></div>}
      </div>
      <nav className="m-dock">
        {dock("layers", <LayersIcon />, "Layers")}
        {dock("inspect", <Sliders />, "Inspect")}
        {dock("brand", <Palette />, "Brand")}
        {dock("more", <MoreIcon />, "More")}
      </nav>
      {more && <MoreSheet onClose={() => setMore(false)} onClaude={() => setClaude(true)} />}
      {claude && <ClaudeDialog onClose={() => setClaude(false)} />}
      <ContextMenuHost />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
