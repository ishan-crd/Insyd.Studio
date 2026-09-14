import React, { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { seconds } from "../lib/format";
import { seek } from "../lib/player";
import { useAudioInfo, drawWave } from "../lib/audio";
import { NumberField, BoolField, SpeedField } from "./Fields";
import { useSoundClips, SoundPicker } from "./AudioTracks";
import { Play, Pause } from "../lib/icons";
import { playPreview, stopPreview, usePreview } from "../lib/preview";
import { setSoundsSpeed } from "../lib/clips";

export const SoundInspector: React.FC<{ id: string }> = ({ id }) => {
  const def = useStore((s) => s.def)!;
  const layout = useStore((s) => s.layout);
  const inCode = useStore((s) => !s.index || !!s.index.locators[`sound:${id}`]);
  const clips = useSoundClips();
  const c = clips.find((x) => x.id === id);
  const info = useAudioInfo(c?.url);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [picking, setPicking] = useState(false);
  const store = useStore.getState;
  const preview = usePreview();
  const previewing = preview.id === id && preview.playing;
  useEffect(() => { if (canvas.current && info) drawWave(canvas.current, info, c?.kind === "music" ? "#5B7A9A" : "#7A8B99", c?.trimStart ? c.trimStart / def.fps : 0, c ? (c.frames * c.speed) / def.fps : undefined); }, [info, c?.kind, c?.trimStart, c?.frames, c?.speed, def.fps]);
  useEffect(() => () => stopPreview(), [id]);
  if (!c) return <div className="empty"><b>Sound not found</b>{id}</div>;
  const listen = () => playPreview(id, c.url, c.trimStart / def.fps, c.repeat > 1 ? undefined : (c.frames * c.speed) / def.fps, c.volume, c.speed);
  const o = layout.sounds[id] ?? {};
  const edited = Object.keys(o).length > 0 && !c.added;
  const setStart = (f: number, commit = true) => c.added ? store().setSound(id, { at: Math.max(0, Math.round(f)) }, commit) : store().setSound(id, { shift: Math.round(f) - c.natural }, commit);
  const file = c.src.split("/").pop() ?? c.src;
  return (
    <>
      <div className="insp-head">
        <div className="top">
          <span className="badge">{c.kind === "music" ? "MUS" : "SFX"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="title">{c.label}</div>
            <div className="subtitle" title={id}>{seconds(c.start, def.fps)} → {seconds(c.start + c.frames, def.fps)}{c.added ? " · added in the editor" : inCode ? "" : " · saved to layout.json"}</div>
          </div>
        </div>
      </div>
      <div className="sect">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, position: "relative" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.src}>{file}</span>
          <button className="btn ghost sm" style={{ height: 22, padding: "0 6px", fontSize: 11 }} onClick={() => setPicking((p) => !p)}>Replace</button>
          {picking && <SoundPicker title="Replace with" onClose={() => setPicking(false)} onPick={(src) => { setPicking(false); store().setSound(id, { src }); }} />}
        </div>
        <div className={`wave-box ${previewing ? "playing" : ""}`} onClick={listen} title={previewing ? "Stop" : "Click to listen"} data-testid="wave-preview">
          <canvas ref={canvas} className="wave-full" />
          {previewing && <div className="wave-cursor" style={{ left: `${preview.progress * 100}%` }} />}
          <div className="wave-play">{previewing ? <Pause /> : <Play />}</div>
        </div>
        <div className="hint">{c.src}{info ? ` · ${info.duration.toFixed(2)}s` : " · decoding…"}{c.repeat > 1 ? ` · ×${c.repeat} every ${c.every}f` : ""} · click the waveform to listen</div>
        {o.src && <div className="hint">Replaced (was <code>{c.defaults.src}</code>) · <a style={{ cursor: "pointer" }} onClick={() => { const s = store(); s.begin(); const cur = { ...(s.layout.sounds[id] ?? {}) }; delete cur.src; useStore.setState({ layout: { ...s.layout, sounds: { ...s.layout.sounds, [id]: cur } } }); s.end(); }}>restore original</a></div>}
        <div className="field" style={{ marginTop: 12 }}><label>Volume<span className="val">{Math.round(c.volume * 100)}%</span></label><NumberField value={Math.round(c.volume * 100)} min={0} max={200} step={1} slider unit="%" onChange={(v, commit) => store().setSound(id, { volume: Math.max(0, v) / 100 }, commit)} /></div>
        <div className="grid2" style={{ marginTop: 12 }}>
          <div className="field"><label>Starts at</label><NumberField unit="f" value={c.start} step={1} onChange={(v, commit) => setStart(v, commit)} /></div>
          {!c.added
            ? <div className="field"><label>Shift</label><NumberField unit="f" value={c.shift} step={1} onChange={(v, commit) => store().setSound(id, { shift: Math.round(v) }, commit)} /></div>
            : <div className="field"><label>Length</label><div className="unit"><input readOnly value={seconds(c.frames, def.fps)} /><i>{c.frames}f</i></div></div>}
        </div>
        <SpeedField value={c.speed} onChange={(v, commit) => setSoundsSpeed([id], v, commit)} hint={`${seconds(c.frames, def.fps)} at ${+c.speed.toFixed(2)}× · pitch follows speed`} />
        <div className="field" style={{ marginTop: 8 }}><label>Muted</label><BoolField value={c.muted} label={["Playing", "Muted"]} onChange={(v) => store().setSound(id, { muted: v })} /></div>
        <button className={`mute-btn ${c.muted ? "on" : ""}`} onClick={() => store().setSound(id, { muted: !c.muted })}>{c.muted ? "Unmute clip" : "Mute clip"}</button>
        <div className="hint">Length {seconds(c.frames, def.fps)} → ends at f{c.start + c.frames}. Sound effects are usually placed 2 frames <i>before</i> the visual they accompany.</div>
        <div className="btnrow">
          <button className="btn sm" onClick={() => seek(Math.max(0, c.start))}>Go to start</button>
          {c.added
            ? <button className="btn sm" onClick={() => store().removeSound(id)}>Remove sound</button>
            : <button className="btn sm" disabled={!edited} onClick={() => store().resetSound(id)}>Reset to code</button>}
        </div>
      </div>
    </>
  );
};
