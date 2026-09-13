import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSounds, type SoundEntry, type SoundKind } from "@project/sdk";
import { useStore, selectedOf, type ScanSound } from "../state/store";
import { usePlayback } from "../state/playback";
import { seek } from "../lib/player";
import { useAudioInfo, drawWave, peekAudioInfo, getAudioInfo } from "../lib/audio";
import { api } from "../lib/api";
import { Chevron, Music, Plus, Upload, Waveform as WaveIcon } from "../lib/icons";

export const ROW_AUDIO = 30;
export const ROW_MUSIC = 40;
const COLORS: Record<SoundKind, string> = { sfx: "#2FC5A8", music: "#B96BFF", voice: "#FF9F43" };

/** One resolved sound: scan info (natural start) merged with the live registry entry and layout overrides. */
export type SoundClip = {
  id: string; label: string; kind: SoundKind; start: number; frames: number; url: string; src: string;
  volume: number; muted: boolean; repeat: number; every: number; added: boolean; shift: number; natural: number;
  defaults: { shift: number; volume: number; muted: boolean; src: string };
};

export const useSoundClips = (): SoundClip[] => {
  const def = useStore((s) => s.def)!;
  const scanSounds = useStore((s) => s.scan.sounds);
  const layout = useStore((s) => s.layout);
  const live = useSounds();
  const [, tick] = useState(0);
  const liveById = useMemo(() => new Map(live.map((l) => [l.id, l])), [live]);
  const clips = useMemo(() => {
    const byId = new Map<string, ScanSound & { url?: string; liveSrc?: string }>();
    for (const s of scanSounds) byId.set(s.id, s);
    for (const l of live) if (!byId.has(l.id)) byId.set(l.id, { id: l.id, label: l.label, kind: l.kind, natural: l.absStart - l.shift, repeat: l.repeat, every: l.every, defaults: l.defaults, added: l.added });
    const out: SoundClip[] = [];
    for (const s of byId.values()) {
      const o = layout.sounds[s.id] ?? {};
      const l = liveById.get(s.id);
      const src = o.src ?? l?.src ?? s.defaults.src;
      const url = l?.url ?? (/^(https?:|data:|blob:|\/)/.test(src) ? src : "/" + src);
      const natural = s.added ? (o.at ?? 0) : s.natural;
      const shift = s.added ? 0 : (o.shift ?? l?.shift ?? s.defaults.shift);
      const info = peekAudioInfo(url);
      const one = info ? Math.max(1, Math.round(info.duration * def.fps)) : 12;
      const frames = (s.repeat - 1) * s.every + one;
      out.push({ id: s.id, label: o.label ?? s.label, kind: (o.kind ?? s.kind) as SoundKind, start: natural + shift, frames, url, src, volume: o.volume ?? l?.volume ?? s.defaults.volume, muted: o.muted ?? l?.muted ?? s.defaults.muted, repeat: s.repeat, every: s.every, added: s.added, shift, natural, defaults: s.defaults });
    }
    return out.sort((a, b) => a.start - b.start);
  }, [scanSounds, live, layout.sounds, liveById, def.fps]);
  // decode any file we have not seen yet and re-render when it lands
  useEffect(() => {
    let alive = true;
    const missing = Array.from(new Set(clips.filter((c) => !peekAudioInfo(c.url)).map((c) => c.url)));
    missing.forEach((u) => getAudioInfo(u).then(() => alive && tick((n) => n + 1)));
    return () => { alive = false; };
  }, [clips]);
  return clips;
};

/** Greedy lane packing so overlapping effects don't stack on one row. */
export const packLanes = (clips: SoundClip[], maxLanes = 6) => {
  const lanes: SoundClip[][] = [];
  const ends: number[] = [];
  for (const c of clips) {
    let i = ends.findIndex((e) => e <= c.start - 1);
    if (i === -1) { if (lanes.length < maxLanes) { lanes.push([]); ends.push(-Infinity); i = lanes.length - 1; } else { i = ends.indexOf(Math.min(...ends)); } }
    lanes[i].push(c); ends[i] = Math.max(ends[i], c.start + c.frames);
  }
  return lanes;
};

const Wave: React.FC<{ url: string; color: string; frames: number; fps: number; repeat: number; every: number }> = ({ url, color, frames, fps, repeat, every }) => {
  const info = useAudioInfo(url);
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current || !info) return;
    const c = ref.current;
    const draw = () => { if (repeat > 1) { drawWave(c, info, color, 0, frames / fps); } else drawWave(c, info, color); };
    draw();
    const ro = new ResizeObserver(draw); ro.observe(c); return () => ro.disconnect();
  }, [info, color, frames, fps, repeat, every]);
  return <canvas ref={ref} style={{ position: "absolute", inset: "3px 0", width: "100%", height: "calc(100% - 6px)", opacity: 0.85, pointerEvents: "none" }} />;
};

export const SoundClipView: React.FC<{ c: SoundClip; ppf: number; on: boolean; onPointerDown: (e: React.PointerEvent) => void; row: number }> = ({ c, ppf, on, onPointerDown, row }) => {
  const def = useStore((s) => s.def)!;
  const color = COLORS[c.kind] ?? COLORS.sfx;
  const store = useStore.getState;
  return (
    <div className={`aclip ${on ? "on" : ""} ${c.muted ? "muted" : ""}`} style={{ left: c.start * ppf, width: Math.max(6, c.frames * ppf - 1), top: 3, height: row - 6, ["--clip" as any]: color }}
      onPointerDown={onPointerDown} onMouseEnter={() => store().setHover(null)}
      title={`${c.label} · ${c.src} · starts f${c.start} · ${(c.frames / def.fps).toFixed(2)}s · vol ${Math.round(c.volume * 100)}%${c.muted ? " · muted" : ""}${c.shift ? ` · shift ${c.shift}` : ""} — drag to move`}>
      <Wave url={c.url} color={color} frames={c.frames} fps={def.fps} repeat={c.repeat} every={c.every} />
      {c.frames * ppf > 46 && <span className="alabel">{c.label}<span className="avol">{Math.round(c.volume * 100)}%</span>{c.shift !== 0 && <span className="delay">{c.shift > 0 ? "+" : ""}{c.shift}f</span>}</span>}
    </div>
  );
};

/** Popover used by "+ Sound": pick a file from public/ or upload one. */
export const SoundPicker: React.FC<{ onPick: (src: string) => void; onClose: () => void; title?: string }> = ({ onPick, onClose, title = "Add sound at playhead" }) => {
  const [files, setFiles] = useState<{ src: string; bytes: number }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { api.audioList().then((r) => setFiles(r.files)).catch(() => setFiles([])); }, []);
  const upload = async (f: File) => {
    setBusy(true);
    const data = btoa(String.fromCharCode(...new Uint8Array(await f.arrayBuffer())));
    const r = await api.audioUpload(f.name, data, f.type.startsWith("audio/") || /\.(wav|mp3|m4a|aac|ogg|flac)$/i.test(f.name) ? "sfx" : "sfx");
    setBusy(false); onPick(r.src);
  };
  return (
    <div className="popover" onPointerDown={(e) => e.stopPropagation()}>
      <div className="popover-head">{title}<button className="btn ghost icon sm" onClick={onClose}>×</button></div>
      <div className="popover-body">
        {files === null ? <div className="hint">Loading…</div> : files.length === 0 ? <div className="hint">No audio files in <code>public/</code> yet.</div> : files.map((f) => (
          <div key={f.src} className="row" onClick={() => onPick(f.src)}><WaveIcon /><span className="name">{f.src}</span><span className="meta">{(f.bytes / 1024).toFixed(0)} KB</span></div>
        ))}
      </div>
      <div className="popover-foot">
        <input ref={fileRef} type="file" accept="audio/*,.wav,.mp3,.m4a,.aac,.ogg,.flac" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <button className="btn sm" disabled={busy} onClick={() => fileRef.current?.click()}><Upload /> {busy ? "Uploading…" : "Upload a file…"}</button>
        <span className="hint" style={{ padding: 0 }}>Saved into <code>public/sfx/</code></span>
      </div>
    </div>
  );
};

// ---- the audio section rendered inside the timeline (returns name/track rows) ----
export const useAudioRows = (
  ppf: number, scrub: (e: React.PointerEvent) => void, drag: (e: React.PointerEvent, onMove: (dx: number, ev: PointerEvent) => void, onUp?: (moved: boolean) => void) => void,
) => {
  const clips = useSoundClips();
  const selection = useStore((s) => s.selection);
  const multi = useStore((s) => s.multi);
  const collapsed = useStore((s) => s.collapsed["__audio"]);
  const store = useStore.getState;
  const sfx = clips.filter((c) => c.kind !== "music");
  const music = clips.filter((c) => c.kind === "music");
  const lanes = useMemo(() => packLanes(sfx), [sfx]);
  const isOn = (id: string) => (selection?.type === "sound" && (selection.id === id || multi.includes(id)));

  const dragSound = (e: React.PointerEvent, c: SoundClip) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    if (additive && store().selection?.type === "sound") store().addToSelection(c.id, e.metaKey || e.ctrlKey);
    else if (!selectedOf("sound").includes(c.id)) store().select({ type: "sound", id: c.id });
    const ids = selectedOf("sound");
    const base = Object.fromEntries(clips.filter((x) => ids.includes(x.id)).map((x) => [x.id, x]));
    store().begin();
    drag(e, (dx) => {
      const d = Math.round(dx / ppf);
      const patches: Record<string, any> = {};
      for (const id of ids) { const b = base[id]; if (!b) continue; patches[id] = b.added ? { at: Math.max(0, b.natural + d) } : { shift: b.shift + d }; }
      store().setSounds(patches, false);
    }, (moved) => {
      store().end();
      if (!additive) useStore.setState({ selection: { type: "sound", id: c.id } });
      if (moved) { const cur = store().layout.sounds[c.id]; seek(c.added ? (cur?.at ?? c.natural) : c.natural + (cur?.shift ?? c.shift)); }
    });
  };

  const rows: React.ReactNode[] = [];
  const names: React.ReactNode[] = [];
  names.push(
    <div key="ah" className="trow grp"><div className="tname grp" style={{ height: 24 }} onClick={() => store().toggleCollapsed("__audio")}>
      <Chevron open={!collapsed} /><span className="chip" style={{ background: COLORS.sfx }} />Audio<span style={{ marginLeft: "auto", fontWeight: 500 }}>{clips.length}</span>
    </div></div>,
  );
  rows.push(<div key="ah" className="trow grp" onPointerDown={scrub}><AddSoundButton /></div>);
  if (!collapsed) {
    lanes.forEach((lane, i) => {
      names.push(<div key={"l" + i} className="trow" style={{ height: ROW_AUDIO }}><div className="tname" style={{ height: ROW_AUDIO }}><WaveIcon />{i === 0 ? "Sound effects" : ""}<span style={{ marginLeft: "auto", color: "var(--text-3)", fontSize: 10 }}>{i + 1}</span></div></div>);
      rows.push(<div key={"l" + i} className="trow" style={{ height: ROW_AUDIO }} onPointerDown={scrub}>{lane.map((c) => <SoundClipView key={c.id} c={c} ppf={ppf} on={isOn(c.id)} row={ROW_AUDIO} onPointerDown={(e) => dragSound(e, c)} />)}</div>);
    });
    if (!lanes.length) { names.push(<div key="l0" className="trow" style={{ height: ROW_AUDIO }}><div className="tname" style={{ height: ROW_AUDIO }}><WaveIcon />Sound effects</div></div>); rows.push(<div key="l0" className="trow" style={{ height: ROW_AUDIO }} onPointerDown={scrub} />); }
    names.push(<div key="m" className="trow" style={{ height: ROW_MUSIC }}><div className="tname" style={{ height: ROW_MUSIC }}><Music />Music</div></div>);
    rows.push(<div key="m" className="trow" style={{ height: ROW_MUSIC }} onPointerDown={scrub}>{music.map((c) => <SoundClipView key={c.id} c={c} ppf={ppf} on={isOn(c.id)} row={ROW_MUSIC} onPointerDown={(e) => dragSound(e, c)} />)}</div>);
  }
  return { names, rows };
};

export const AddSoundButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const store = useStore.getState;
  return (
    <div style={{ position: "sticky", left: 8, display: "inline-block", zIndex: 2 }} onPointerDown={(e) => e.stopPropagation()}>
      <button className="btn ghost sm" style={{ height: 20, fontSize: 11, padding: "0 8px" }} onClick={() => setOpen((o) => !o)}><Plus /> Sound</button>
      {open && <SoundPicker onClose={() => setOpen(false)} onPick={(src) => { setOpen(false); const at = usePlayback.getState().frame; store().addSound({ src, at, label: src.split("/").pop() }); }} />}
    </div>
  );
};
