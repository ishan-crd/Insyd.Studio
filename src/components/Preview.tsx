import React, { useEffect, useMemo, useRef, useState } from "react";
import { Player } from "@remotion/player";
import { EditorHost, type Layout } from "@project/sdk";
import { useStore, sceneAt } from "../state/store";
import { usePlayback } from "../state/playback";
import { playerRef, scanPlayerRef, seek } from "../lib/player";
import { scanProject } from "../lib/scan";
import { timecode } from "../lib/format";
import { Overlay } from "./Overlay";
import { Pause, Play, SkipBack, SkipFwd, StepBack, StepFwd } from "../lib/icons";

const Transport: React.FC = () => {
  const def = useStore((s) => s.def)!;
  const duration = useStore((s) => s.duration());
  const scenes = useStore((s) => s.scenes());
  const frame = usePlayback((s) => s.frame);
  const playing = usePlayback((s) => s.playing);
  const scene = sceneAt(scenes, frame);
  return (
    <div className="transport">
      <button className="btn ghost icon" onClick={() => seek(0)} title="Start (Home)"><SkipBack /></button>
      <button className="btn ghost icon" onClick={() => seek(frame - 1)} title="Previous frame (←)"><StepBack /></button>
      <button className="btn icon" style={{ width: 36 }} onClick={() => playerRef.current?.toggle()} title="Play / pause (Space)">{playing ? <Pause /> : <Play />}</button>
      <button className="btn ghost icon" onClick={() => seek(frame + 1)} title="Next frame (→)"><StepFwd /></button>
      <button className="btn ghost icon" onClick={() => seek(duration - 1)} title="End (End)"><SkipFwd /></button>
      <div className="tc" style={{ marginLeft: 10 }}>{timecode(frame, def.fps)} <span>/ {timecode(duration, def.fps)}</span></div>
      <div className="tc" style={{ minWidth: 0, color: "var(--text-3)" }}>f{frame}</div>
      <div className="spacer" />
      {scene && <div style={{ color: "var(--text-2)", fontSize: 12 }}>Scene <b style={{ color: "var(--text)" }}>{scene.label}</b> · {frame - scene.from + 1}/{scene.duration}</div>}
    </div>
  );
};

export const Preview: React.FC = () => {
  const def = useStore((s) => s.def)!;
  const layout = useStore((s) => s.layout);
  const duration = useStore((s) => s.duration());
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 960, h: 540 });
  const noEditor = new URLSearchParams(location.search).get("noeditor");

  useEffect(() => {
    const el = stageRef.current!;
    const ro = new ResizeObserver(() => {
      const pad = 44, aw = el.clientWidth - pad, ah = el.clientHeight - pad, r = def.width / def.height;
      let w = aw, h = w / r; if (h > ah) { h = ah; w = h * r; }
      setSize({ w: Math.floor(w), h: Math.floor(h) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [def]);

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
    <div className="preview">
      <div className="stage" ref={stageRef}>
        <div className="canvas" style={{ width: size.w, height: size.h }}>
          <div className="player">
            <Player ref={playerRef} component={Host} inputProps={{ layout }} durationInFrames={Math.max(1, duration)}
              compositionWidth={def.width} compositionHeight={def.height} fps={def.fps} style={{ width: "100%", height: "100%" }}
              controls={false} clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false} acknowledgeRemotionLicense numberOfSharedAudioTags={0} />
          </div>
          {!noEditor && <Overlay scale={size.w / def.width} />}
        </div>
      </div>
      {/* Hidden analysis player: the element scan runs here so the visible player is never interrupted. */}
      {!noEditor && (
        <div aria-hidden style={{ position: "fixed", left: -4000, top: 0, width: 192, height: (192 * def.height) / def.width, opacity: 0, pointerEvents: "none" }}>
          <Player ref={scanPlayerRef} component={ScanHost} inputProps={{ layout: scanLayout }} durationInFrames={Math.max(1, duration)}
            compositionWidth={def.width} compositionHeight={def.height} fps={def.fps} style={{ width: "100%", height: "100%" }}
            controls={false} clickToPlay={false} spaceKeyToPlayOrPause={false} acknowledgeRemotionLicense numberOfSharedAudioTags={0} initiallyMuted />
        </div>
      )}
      <Transport />
    </div>
  );
};
