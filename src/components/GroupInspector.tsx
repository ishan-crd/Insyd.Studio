import React, { useMemo, useState } from "react";
import { useProps, type PropEntry, type SoundOverride } from "@project/sdk";
import { useStore } from "../state/store";
import { NumberField, BoolField, PropControl } from "./Fields";
import { useSoundClips, SoundPicker } from "./AudioTracks";
import { propsOf } from "../lib/owners";
import { Block, Music, Waveform } from "../lib/icons";

// Inspector for a multi-selection: only the fields every selected item shares, with "Mixed"
// where values differ. Each change is applied to all selected items as one undo step.

const same = <T,>(vals: T[]) => vals.every((v) => JSON.stringify(v) === JSON.stringify(vals[0]));
const Mixed: React.FC = () => <span className="mixed" title="Values differ across the selection">Mixed</span>;

const Header: React.FC<{ title: string; ids: string[]; labelOf: (id: string) => string; primary: string; onPrimary: (id: string) => void; onRemove: (id: string) => void; hint: string; icon: React.ReactNode }> = ({ title, ids, labelOf, primary, onPrimary, onRemove, hint, icon }) => (
  <div className="insp-head">
    <div className="top">
      <span className="badge">{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}><div className="title">{title}</div><div className="subtitle">Shared fields only</div></div>
    </div>
    <div className="note">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2, maxHeight: 96, overflow: "auto", marginBottom: 6 }}>
        {ids.map((id) => (
          <span key={id} className="kbd" style={{ display: "inline-flex", alignItems: "center", gap: 4, outline: id === primary ? "1px solid var(--accent)" : undefined }} title="Click to make primary · × to remove" onClick={() => onPrimary(id)}>
            {labelOf(id)}<span onClick={(e) => { e.stopPropagation(); onRemove(id); }} style={{ opacity: 0.6 }}>×</span>
          </span>
        ))}
      </div>
      {hint}
    </div>
  </div>
);

const NudgeRow: React.FC<{ label: string; unit: string; onNudge: (d: number) => void; steps?: number[] }> = ({ label, unit, onNudge, steps = [10, 1] }) => (
  <div className="field"><label>{label}</label>
    <div style={{ display: "flex", gap: 4 }}>
      {[...steps.map((s) => -s), ...steps.slice().reverse()].map((d) => <button key={d} className="btn sm" style={{ flex: 1, padding: 0, height: 28 }} onClick={() => onNudge(d)}>{d > 0 ? "+" : ""}{d}{unit}</button>)}
    </div>
  </div>
);

// ---------------- sounds ----------------
export const SoundGroupInspector: React.FC<{ ids: string[]; primary: string }> = ({ ids, primary }) => {
  const clips = useSoundClips();
  const store = useStore.getState;
  const [picking, setPicking] = useState(false);
  const sel = ids.map((id) => clips.find((c) => c.id === id)).filter(Boolean) as ReturnType<typeof useSoundClips>;
  if (!sel.length) return <div className="empty"><b>Nothing to edit</b></div>;
  const vols = sel.map((c) => c.volume), mutes = sel.map((c) => c.muted), srcs = sel.map((c) => c.src);
  const applyAll = (fn: (c: (typeof sel)[number]) => SoundOverride) => store().setSounds(Object.fromEntries(sel.map((c) => [c.id, fn(c)])));
  const primaryClip = sel.find((c) => c.id === primary) ?? sel[0];
  const allAdded = sel.every((c) => c.added), anyEdited = sel.some((c) => Object.keys(store().layout.sounds[c.id] ?? {}).length > 0 && !c.added);
  return (
    <>
      <Header title={`${sel.length} sounds selected`} ids={sel.map((c) => c.id)} labelOf={(id) => sel.find((c) => c.id === id)?.label ?? id} primary={primary}
        onPrimary={(id) => useStore.setState({ selection: { type: "sound", id } })} onRemove={(id) => store().addToSelection(id, true)}
        hint="Changes below apply to every selected sound." icon={<Waveform />} />
      <div className="sect">
        <div className="section">Level</div>
        <div className="field"><label>Volume{!same(vols) && <Mixed />}<span className="val">{Math.round(primaryClip.volume * 100)}%</span></label>
          <NumberField value={Math.round(primaryClip.volume * 100)} min={0} max={200} step={1} slider unit="%" onChange={(v, commit) => store().setSounds(Object.fromEntries(sel.map((c) => [c.id, { volume: Math.max(0, v) / 100 }])), commit)} />
        </div>
        <div className="field" style={{ marginTop: 8 }}><label>Muted{!same(mutes) && <Mixed />}</label><BoolField value={mutes.every(Boolean)} label={["Playing", "Muted"]} onChange={(v) => applyAll(() => ({ muted: v }))} /></div>
      </div>
      <div className="sect">
        <div className="section">Timing</div>
        <NudgeRow label="Move all" unit="f" onNudge={(d) => applyAll((c) => (c.added ? { at: Math.max(0, c.natural + d) } : { shift: c.shift + d }))} />
        <div className="hint">Or drag any selected clip in the timeline. Starts range f{Math.min(...sel.map((c) => c.start))}–f{Math.max(...sel.map((c) => c.start))}.</div>
      </div>
      <div className="sect" style={{ position: "relative" }}>
        <div className="section">File</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input readOnly value={same(srcs) ? srcs[0] : `${new Set(srcs).size} different files`} style={{ flex: 1, fontFamily: "var(--mono)", fontSize: 11, color: same(srcs) ? undefined : "var(--warn)" }} />
          <button className="btn sm" style={{ height: 28 }} onClick={() => setPicking((p) => !p)}>Replace all…</button>
        </div>
        {picking && <SoundPicker title={`Replace ${sel.length} sounds with`} onClose={() => setPicking(false)} onPick={(src) => { setPicking(false); applyAll(() => ({ src })); }} />}
      </div>
      <div className="btnrow" style={{ paddingTop: 12 }}>
        {allAdded
          ? <button className="btn sm" onClick={() => { const s = store(); s.begin(); const sounds = { ...s.layout.sounds }; sel.forEach((c) => delete sounds[c.id]); useStore.setState({ layout: { ...s.layout, sounds }, selection: null, multi: [] }); s.end(); }}>Remove all</button>
          : <button className="btn sm" disabled={!anyEdited} onClick={() => { const s = store(); s.begin(); const sounds = { ...s.layout.sounds }; sel.forEach((c) => { if (!c.added) delete sounds[c.id]; }); useStore.setState({ layout: { ...s.layout, sounds } }); s.end(); }}>Reset all to code</button>}
      </div>
    </>
  );
};

// ---------------- elements ----------------
export const ElementGroupInspector: React.FC<{ ids: string[]; primary: string }> = ({ ids, primary }) => {
  const def = useStore((s) => s.def)!;
  const scan = useStore((s) => s.scan);
  const layout = useStore((s) => s.layout);
  const props = useProps();
  const store = useStore.getState;
  const ts = ids.map((id) => ({ id, t: store().transform(id) }));
  const labelOf = (id: string) => scan.elements.find((e) => e.id === id)?.label ?? id;
  type T = ReturnType<ReturnType<typeof useStore.getState>["transform"]>;
  const applyAll = (fn: (id: string, t: T) => Partial<T>, commit = true) =>
    store().updateElements(Object.fromEntries(ts.map(({ id, t }) => [id, fn(id, t)])), commit);
  const pt = ts.find((x) => x.id === primary)?.t ?? ts[0].t;
  const scales = ts.map((x) => x.t.scale), rots = ts.map((x) => x.t.rotate), ops = ts.map((x) => x.t.opacity), hid = ts.map((x) => x.t.hidden);

  // props shared by every selected element: same suffix (after the element id) and same kind
  const elementIds = useMemo(() => new Set([...scan.elements.map((e) => e.id), ...ids]), [scan.elements, ids]);
  const shared = useMemo(() => {
    const per = ids.map((id) => propsOf(props, id, elementIds).filter((p) => p.kind !== "anim" && p.kind !== "text").map((p) => ({ p, suffix: p.id.slice(id.length + 1) })));
    if (!per.length || per.some((l) => !l.length)) return [] as Array<{ suffix: string; kind: PropEntry["kind"]; meta: PropEntry["meta"]; entries: PropEntry[] }>;
    const out: Array<{ suffix: string; kind: PropEntry["kind"]; meta: PropEntry["meta"]; entries: PropEntry[] }> = [];
    for (const { p, suffix } of per[0]) {
      const entries = per.map((l) => l.find((x) => x.suffix === suffix && x.p.kind === p.kind)?.p);
      if (entries.every(Boolean)) out.push({ suffix, kind: p.kind, meta: p.meta, entries: entries as PropEntry[] });
    }
    return out;
  }, [ids, props, elementIds]);

  return (
    <>
      <Header title={`${ids.length} elements selected`} ids={ids} labelOf={labelOf} primary={primary}
        onPrimary={(id) => useStore.setState({ selection: { type: "element", id } })} onRemove={(id) => store().addToSelection(id, true)}
        hint="Changes below apply to every selected element. Drag any of them on the canvas or the timeline to move the group." icon={<Block />} />
      <div className="sect">
        <div className="section">Transform</div>
        <div style={{ display: "grid", gap: 8 }}>
          <NudgeRow label="Move X" unit="" onNudge={(d) => applyAll((_, t) => ({ x: t.x + d }))} />
          <NudgeRow label="Move Y" unit="" onNudge={(d) => applyAll((_, t) => ({ y: t.y + d }))} />
        </div>
        <div className="grid2" style={{ marginTop: 8 }}>
          <div className="field"><label>Scale{!same(scales) && <Mixed />}</label><NumberField unit="×" value={pt.scale} step={0.01} min={0.05} onChange={(scale, c) => applyAll(() => ({ scale }), c)} /></div>
          <div className="field"><label>Rotation{!same(rots) && <Mixed />}</label><NumberField unit="°" value={pt.rotate} step={1} onChange={(rotate, c) => applyAll(() => ({ rotate }), c)} /></div>
        </div>
        <div className="field" style={{ marginTop: 12 }}><label>Opacity{!same(ops) && <Mixed />}<span className="val">{Math.round(pt.opacity * 100)}%</span></label><NumberField unit="α" value={pt.opacity} step={0.05} min={0} max={1} slider onChange={(o, c) => applyAll(() => ({ opacity: Math.min(1, Math.max(0, o)) }), c)} /></div>
        <div className="field" style={{ marginTop: 8 }}><label>Visible{!same(hid) && <Mixed />}</label><BoolField value={!hid.every(Boolean)} label={["Hidden", "Shown"]} onChange={(v) => applyAll(() => ({ hidden: !v }))} /></div>
      </div>
      <div className="sect">
        <div className="section">Timing</div>
        <NudgeRow label="Shift all" unit="f" onNudge={(d) => applyAll((_, t) => ({ delay: t.delay + d }))} />
      </div>
      {shared.length > 0 && (
        <div className="sect" style={{ display: "grid", gap: 8 }}>
          <div className="section">Shared properties</div>
          {shared.map(({ suffix, kind, meta, entries }) => {
            const vals = entries.map((p) => layout.props[p.id] ?? p.value);
            const label = meta.label ?? suffix.replace(/([a-z])([A-Z])/g, "$1 $2");
            return (
              <div className="field" key={suffix}>
                <label title={suffix} style={{ textTransform: "capitalize" }}>{label}{!same(vals) && <Mixed />}</label>
                <PropControl kind={kind} meta={meta} value={vals[Math.max(0, entries.findIndex((p) => p.id.startsWith(primary + ".")))]}
                  onChange={(v, commit) => { const s = store(); if (commit !== false) s.begin(); useStore.setState({ layout: { ...s.layout, props: { ...s.layout.props, ...Object.fromEntries(entries.map((p) => [p.id, v])) } } }); if (commit !== false) s.end(); }} />
              </div>
            );
          })}
        </div>
      )}
      <div className="btnrow" style={{ paddingTop: 12 }}>
        <button className="btn sm" onClick={() => { const s = store(); s.begin(); const elements = { ...s.layout.elements }; const propsL = { ...s.layout.props }; ids.forEach((id) => { delete elements[id]; shared.forEach((g) => g.entries.forEach((p) => { if (p.id.startsWith(id + ".")) delete propsL[p.id]; })); }); useStore.setState({ layout: { ...s.layout, elements, props: propsL } }); s.end(); }}>Reset all</button>
      </div>
      <div className="hint">{def.fps} fps · shifts are in frames.</div>
    </>
  );
};
