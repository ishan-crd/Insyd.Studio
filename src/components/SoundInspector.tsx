import React, { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { seconds } from "../lib/format";
import { seek } from "../lib/player";
import { useAudioInfo, drawWave } from "../lib/audio";
import { NumberField, BoolField } from "./Fields";
import { useSoundClips, SoundPicker } from "./AudioTracks";
import { Music, Waveform } from "../lib/icons";

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
  useEffect(() => { if (canvas.current && info) drawWave(canvas.current, info, c?.kind === "music" ? "#B96BFF" : "#2FC5A8"); }, [info, c?.kind]);
  if (!c) return <div className="empty"><b>Sound not found</b>{id}</div>;
  const o = layout.sounds[id] ?? {};
  const edited = Object.keys(o).length > 0 && !c.added;
  const setStart = (f: number, commit = true) => c.added ? store().setSound(id, { at: Math.max(0, Math.round(f)) }, commit) : store().setSound(id, { shift: Math.round(f) - c.natural }, commit);
  return (
    <>
      <div style={{ padding: "10px 12px 2px", display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ color: "var(--text-2)" }}>{c.kind === "music" ? <Music /> : <Waveform />}</span>
        <div><div style={{ fontWeight: 600, fontSize: 14 }}>{c.label}</div><div className="id">{id}{c.added ? " · added in the editor" : inCode ? "" : " · saved to layout.json"}</div></div>
      </div>
      <div style={{ padding: "8px 6px 0" }}>
        <canvas ref={canvas} className="wave-full" />
        <div className="hint" style={{ padding: "4px 2px" }}>{c.src}{info ? ` · ${info.duration.toFixed(2)}s` : " · decoding…"}{c.repeat > 1 ? ` · ×${c.repeat} every ${c.every}f` : ""}</div>
      </div>
      <div className="section">File</div>
      <div style={{ padding: "0 6px", position: "relative" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <input readOnly value={c.src} style={{ flex: 1, fontFamily: "var(--mono)", fontSize: 11 }} />
          <button className="btn sm" onClick={() => setPicking((p) => !p)}>Replace…</button>
        </div>
        {picking && <SoundPicker title="Replace with" onClose={() => setPicking(false)} onPick={(src) => { setPicking(false); store().setSound(id, { src }); }} />}
        {o.src && <div className="hint" style={{ padding: "4px 2px" }}>Replaced (was <code>{c.defaults.src}</code>) · <a style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => { const s = store(); s.begin(); const cur = { ...(s.layout.sounds[id] ?? {}) }; delete cur.src; useStore.setState({ layout: { ...s.layout, sounds: { ...s.layout.sounds, [id]: cur } } }); s.end(); }}>restore original</a></div>}
      </div>
      <div className="section">Level</div>
      <div className="field"><label>Volume</label><NumberField value={Math.round(c.volume * 100)} min={0} max={200} step={1} slider unit="%" onChange={(v, commit) => store().setSound(id, { volume: Math.max(0, v) / 100 }, commit)} /></div>
      <div className="field"><label>Muted</label><BoolField value={c.muted} label={["Playing", "Muted"]} onChange={(v) => store().setSound(id, { muted: v })} /></div>
      <div className="section">Timing</div>
      <div className="field"><label>Starts at</label><div className="pair"><NumberField unit="f" value={c.start} step={1} onChange={(v, commit) => setStart(v, commit)} /><div style={{ alignSelf: "center", fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{seconds(c.start, def.fps)}</div></div></div>
      {!c.added && <div className="field"><label>Shift</label><NumberField unit="f" value={c.shift} step={1} onChange={(v, commit) => store().setSound(id, { shift: Math.round(v) }, commit)} /></div>}
      <div className="hint">Length {seconds(c.frames, def.fps)} → ends at f{c.start + c.frames}. Sound effects are usually placed 2 frames <i>before</i> the visual they accompany.</div>
      <div className="btnrow">
        <button className="btn sm" onClick={() => seek(Math.max(0, c.start))}>Go to start</button>
        {c.added
          ? <button className="btn sm" onClick={() => store().removeSound(id)}>Remove sound</button>
          : <button className="btn sm" disabled={!edited} onClick={() => store().resetSound(id)}>Reset to code</button>}
      </div>
    </>
  );
};
