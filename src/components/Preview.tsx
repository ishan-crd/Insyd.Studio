import React, { useEffect, useMemo, useRef, useState } from "react";
import { Player } from "@remotion/player";
import { EditorHost, type Layout } from "@project/sdk";
import { useStore, sceneAt } from "../state/store";
import { usePlayback } from "../state/playback";
import { playerRef, scanPlayerRef, seek } from "../lib/player";
import { scanProject } from "../lib/scan";
import { timecode } from "../lib/format";
import { Overlay } from "./Overlay";
import { sceneColor } from "../lib/colors";
import { Pause, Play, SkipBack, SkipFwd, StepBack, StepFwd } from "../lib/icons";

const Transport: React.FC = () => {
  const def = useStore((s) => s.def)!;
  const duration = useStore((s) => s.duration());
  const scenes = useStore((s) => s.scenes());
  const frame = usePlayback((s) => s.frame);
  const playing = usePlayback((s) => s.playing);
  const scene = sceneAt(scenes, frame);
  const barRef = useRef<HTMLDivElement>(null);
  const frameAt = (clientX: number) => { const r = barRef.current!.getBoundingClientRect(); return Math.max(0, Math.min(duration - 1, Math.round(((clientX - r.left) / r.width) * duration))); };
  const scrub = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    seek(frameAt(e.clientX));
    const move = (ev: PointerEvent) => seek(frameAt(ev.clientX));
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const sceneIdx = scene ? scenes.indexOf(scene) : -1;
  return (
    <div className="transport">
      <div className="keys">
        <button className="btn ghost icon" onClick={() => seek(0)} title="Start (Home)"><SkipBack /></button>
        <button className="btn ghost icon" onClick={() => seek(frame - 1)} title="Previous frame (←)"><StepBack /></button>
        <button className="btn primary icon play" onClick={() => playerRef.current?.toggle()} title="Play / pause (Space)">{playing ? <Pause /> : <Play />}</button>
        <button className="btn ghost icon" onClick={() => seek(frame + 1)} title="Next frame (→)"><StepFwd /></button>
        <button className="btn ghost icon" onClick={() => seek(duration - 1)} title="End (End)"><SkipFwd /></button>
      </div>
      <div className="tc">{timecode(frame, def.fps)}<span> / {timecode(duration, def.fps)}</span></div>
      <div className="progress-bar" ref={barRef} onPointerDown={scrub} title="Drag to scrub"><i><b style={{ width: `${(frame / Math.max(1, duration - 1)) * 100}%` }} /></i></div>
      {scene && (
        <div className="scene" title={`Scene ${sceneIdx + 1} of ${scenes.length} · frame ${frame - scene.from + 1} of ${scene.duration}`}>
          <span className="chip" style={{ background: sceneColor(scene.index) }} /><b>{scene.label}</b><span className="frame">f{frame}</span>
        </div>
      )}
    </div>
  );
};

/** The player with its selection overlay, fitted into whatever box it is given. Shared by the desktop
 *  preview and the phone layout (which gives it a fixed-aspect card and no padding). */
export const Stage: React.FC<{ pad?: number; className?: string; style?: React.CSSProperties }> = ({ pad = 44, className = "", style }) => {
  const def = useStore((s) => s.def)!;
  const layout = useStore((s) => s.layout);
  const duration = useStore((s) => s.duration());
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 960, h: 540 });
  const noEditor = new URLSearchParams(location.search).get("noeditor");

  useEffect(() => {
    const el = stageRef.current!;
    const ro = new ResizeObserver(() => {
      const aw = el.clientWidth - pad, ah = el.clientHeight - pad, r = def.width / def.height;
      let w = aw, h = w / r; if (h > ah) { h = ah; w = h * r; }
      setSize({ w: Math.floor(w), h: Math.floor(h) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [def, pad]);

  const Host = useMemo(() => {
    const Comp = def.component;
    const H: React.FC<{ layout: Layout }> = ({ layout }) => (noEditor ? <Comp layout={layout} /> : <EditorHost def={def} layout={layout} />);
    return H;
  }, [def]);
  const ScanHost = useMemo(() => {
    const H: React.FC<{ layout: Layout }> = ({ layout }) => <EditorHost def={def} layout={layout} channel="scan" />;
    return H;
  }, [def]);
  // The hidden player only needs the code defaults; keep its props stable so edits never re-render it.
  const scanLayout = useMemo(() => useStore.getState().saved, []);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const set = usePlayback.getState().set;
    const onFrame = (e: { detail: { frame: number } }) => set({ frame: e.detail.frame });
    const onPlay = () => set({ playing: true });
    const onPause = () => set({ playing: false });
    p.addEventListener("frameupdate", onFrame); p.addEventListener("play", onPlay); p.addEventListener("pause", onPause); p.addEventListener("ended", onPause);
    const t = setTimeout(() => { if (useStore.getState().scan.status === "idle") scanProject(); }, 900);
    return () => { p.removeEventListener("frameupdate", onFrame); p.removeEventListener("play", onPlay); p.removeEventListener("pause", onPause); p.removeEventListener("ended", onPause); clearTimeout(t); };
  }, []);

  return (
    <>
      <div className={`stage ${className}`} style={style} ref={stageRef}>
        <div className="canvas" style={{ width: size.w, height: size.h }}>
          <div className="player">
            <Player ref={playerRef} component={Host} inputProps={{ layout }} durationInFrames={Math.max(1, duration)}
              compositionWidth={def.width} compositionHeight={def.height} fps={def.fps} style={{ width: "100%", height: "100%" }}
              controls={false} clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false} acknowledgeRemotionLicense numberOfSharedAudioTags={0} />
          </div>
          {!noEditor && <Overlay scale={size.w / def.width} />}
        </div>
        {!noEditor && <div className="canvas-tools"><span>{def.width}×{def.height}</span><span className="sep" /><span>{Math.round((size.w / def.width) * 100)}%</span></div>}
      </div>
      {/* Hidden analysis player: the element scan runs here so the visible player is never interrupted. */}
      {!noEditor && (
        <div aria-hidden style={{ position: "fixed", left: -4000, top: 0, width: 192, height: (192 * def.height) / def.width, opacity: 0, pointerEvents: "none" }}>
          <Player ref={scanPlayerRef} component={ScanHost} inputProps={{ layout: scanLayout }} durationInFrames={Math.max(1, duration)}
            compositionWidth={def.width} compositionHeight={def.height} fps={def.fps} style={{ width: "100%", height: "100%" }}
            controls={false} clickToPlay={false} spaceKeyToPlayOrPause={false} acknowledgeRemotionLicense numberOfSharedAudioTags={0} initiallyMuted />
        </div>
      )}
    </>
  );
};

export const Preview: React.FC = () => (
  <div className="preview">
    <Stage />
    <Transport />
  </div>
);
