import React, { useEffect, useState } from "react";
import { registry, useElements, useProps, type PropEntry } from "@project/sdk";
import { useStore } from "../state/store";
import { seconds } from "../lib/format";
import { NumberField, TextField, BoolField, PropControl, SpeedField } from "./Fields";
import { Eye, EyeOff, Film } from "../lib/icons";
import { propsOf } from "../lib/owners";
import { SoundInspector } from "./SoundInspector";
import { ElementGroupInspector, SoundGroupInspector } from "./GroupInspector";
import { kindBadge } from "./Library";

const PropRow: React.FC<{ p: PropEntry; bare?: boolean }> = ({ p, bare }) => {
  const layout = useStore((s) => s.layout);
  const inCode = useStore((s) => !s.index || !!s.index.locators[`call:${p.id}`]?.literal);
  const store = useStore.getState;
  const over = layout.props[p.id];
  const value = over === undefined ? p.value : p.kind === "anim" && over && typeof over === "object" ? { ...(p.value as object), ...(over as object) } : over;
  const label = p.meta.label ?? p.id.split(".").slice(-1)[0].replace(/([a-z])([A-Z])/g, "$1 $2");
  const slider = p.kind === "number" && p.meta.min !== undefined && p.meta.max !== undefined;
  return (
    <div className="field">
      <label title={p.id} style={bare ? { minHeight: 0 } : undefined}>
        {!bare && <span style={{ textTransform: "capitalize" }}>{label}</span>}
        {over !== undefined && <span title="Edited — click to reset" className="dot" style={{ cursor: "pointer" }} onClick={() => store().resetProp(p.id)} />}
        {!inCode && <span title="No literal in code; saved to layout.json" style={{ color: "var(--warn)", fontSize: 10 }}>json</span>}
        {slider && <span className="val">{Number(value)}{p.meta.unit ?? ""}</span>}
      </label>
      <PropControl kind={p.kind} meta={p.meta} value={value} onChange={(v, commit) => store().setProp(p.id, v, commit)} />
    </div>
  );
};

/** Editable values grouped by their `group` meta; each group is a section. */
const PropGroups: React.FC<{ props: PropEntry[]; title?: string }> = ({ props, title }) => {
  if (!props.length) return null;
  const groups = new Map<string, PropEntry[]>();
  for (const p of props) { const g = p.meta.group ?? (p.kind === "anim" ? "Animation" : title ?? "Properties"); if (!groups.has(g)) groups.set(g, []); groups.get(g)!.push(p); }
  return <>{[...groups.entries()].map(([g, list]) => {
    const wide = list.filter((p) => p.kind === "anim" || p.kind === "text" || p.kind === "color");
    const narrow = list.filter((p) => !wide.includes(p));
    return (
      <div key={g} className="sect">
        <div className="section">{g}</div>
        {narrow.length > 0 && <div className="grid2" style={{ marginBottom: wide.length ? 8 : 0 }}>{narrow.map((p) => <PropRow key={p.id} p={p} />)}</div>}
        {wide.length > 0 && <div style={{ display: "grid", gap: 8 }}>{wide.map((p) => <PropRow key={p.id} p={p} />)}</div>}
      </div>
    );
  })}</>;
};

const Head: React.FC<{ badge: React.ReactNode; title: string; sub: string; right?: React.ReactNode; note?: React.ReactNode }> = ({ badge, title, sub, right, note }) => (
  <div className="insp-head">
    <div className="top">
      <span className="badge">{badge}</span>
      <div style={{ flex: 1, minWidth: 0 }}><div className="title">{title}</div><div className="subtitle" title={sub}>{sub}</div></div>
      {right}
    </div>
    {note && <div className="note">{note}</div>}
  </div>
);

const Tabs: React.FC<{ tabs: string[]; on: string; set: (t: string) => void }> = ({ tabs, on, set }) => (
  <div className="panel-tabs"><div className="tabs">{tabs.map((t) => <button key={t} className={t === on ? "on" : ""} onClick={() => set(t)} disabled={tabs.length === 1}>{t}</button>)}</div></div>
);

export const Inspector: React.FC = () => {
  const def = useStore((s) => s.def)!;
  const selection = useStore((s) => s.selection);
  const multi = useStore((s) => s.multi);
  const layout = useStore((s) => s.layout);
  const scenes = useStore((s) => s.scenes());
  const scan = useStore((s) => s.scan);
  const elements = useElements();
  const props = useProps();
  const store = useStore.getState;
  const elementIds = React.useMemo(() => new Set([...scan.elements.map((e) => e.id), ...elements.map((e) => e.id)]), [scan.elements, elements]);
  const [tab, setTab] = useState("Element");
  const selKey = selection ? `${selection.type}:${"id" in selection ? selection.id : ""}` : "";
  useEffect(() => { setTab("Element"); }, [selKey]);

  let tabs: string[] = [];
  let body: React.ReactNode;
  if (selection?.type === "element" && multi.length > 1) {
    tabs = ["Group"];
    body = <ElementGroupInspector ids={multi} primary={selection.id} />;
  } else if (selection?.type === "sound" && multi.length > 1) {
    tabs = ["Group"];
    body = <SoundGroupInspector ids={multi} primary={selection.id} />;
  } else if (selection?.type === "element") {
    const id = selection.id;
    const t = store().transform(id);
    const live = elements.find((e) => e.id === id);
    const meta = store().allElements().find((e) => e.id === id);
    const kind = live?.kind ?? meta?.kind ?? "block";
    const copyId = kind === "text" ? live?.copyId ?? id : null;
    const copyProp = copyId ? props.find((p) => p.id === copyId && p.kind === "text") : null;
    const owned = propsOf(props, id, elementIds).filter((p) => p.id !== copyId);
    const anims = owned.filter((p) => p.kind === "anim");
    const plain = owned.filter((p) => p.kind !== "anim");
    const upd = (patch: Partial<typeof t>, commit = true) => store().updateElement(id, patch, commit);
    const centerH = () => { const r = registry.measureId(id); if (r) upd({ x: Math.round((t.x + (def.width / 2 - (r.x + r.w / 2))) * 10) / 10 }); };
    const centerV = () => { const r = registry.measureId(id); if (r) upd({ y: Math.round((t.y + (def.height / 2 - (r.y + r.h / 2))) * 10) / 10 }); };
    const scene = scenes.find((s) => s.id === meta?.sceneId);
    const winLen = (t.trimOut ?? (meta ? meta.last - meta.first : 0)) - t.trimIn + 1;
    const from = meta ? meta.first + t.delay + t.trimIn : 0;
    tabs = ["Element", "Animation"];
    const cur = tabs.includes(tab) ? tab : "Element";
    body = (
      <>
        <Head badge={kindBadge(kind)} title={live?.label ?? meta?.label ?? id}
          sub={`${scene ? scene.label + " · " : ""}${seconds(from, def.fps)} → ${seconds(from + winLen, def.fps)}${live ? "" : " · not on screen at this frame"}`}
          right={<button className="btn ghost icon" style={{ width: 26, height: 26 }} title={t.hidden ? "Show" : "Hide"} onClick={() => upd({ hidden: !t.hidden })}>{t.hidden ? <EyeOff /> : <Eye />}</button>}
          note={layout.elements[id]?.cloneOf ? <>Linked copy of <b>{layout.elements[id]!.cloneOf}</b> — shares its content, saved in layout.json.</> : undefined} />
        {cur === "Element" && (
          <>
            {copyId && (
              <div className="sect">
                <div className="section">Content</div>
                <TextField id="insp-text" multiline value={layout.copy[copyId] ?? (copyProp?.value as string) ?? ""} onChange={(v, c) => store().setCopy(copyId, v, c)} />
                <div className="hint">Use <span className="kbd">|</span> for a line break where the template supports it.</div>
              </div>
            )}
            <div className="sect">
              <div className="section">Transform</div>
              <div className="grid2">
                <div className="field"><label>X</label><NumberField unit="px" value={t.x} onChange={(x, c) => upd({ x }, c)} /></div>
                <div className="field"><label>Y</label><NumberField unit="px" value={t.y} onChange={(y, c) => upd({ y }, c)} /></div>
                <div className="field"><label>Scale</label><NumberField unit="×" value={t.scale} step={0.01} min={0.05} onChange={(scale, c) => upd({ scale }, c)} /></div>
                <div className="field"><label>Rotation</label><NumberField unit="°" value={t.rotate} step={1} onChange={(rotate, c) => upd({ rotate }, c)} /></div>
              </div>
              <div className="field" style={{ marginTop: 12 }}><label>Opacity<span className="val">{Math.round(t.opacity * 100)}%</span></label><NumberField unit="α" value={t.opacity} step={0.05} min={0} max={1} slider onChange={(o, c) => upd({ opacity: Math.min(1, Math.max(0, o)) }, c)} /></div>
              <div className="grid2" style={{ marginTop: 8 }}>
                <div className="field"><label>Visible</label><BoolField value={!t.hidden} label={["Hidden", "Shown"]} onChange={(v) => upd({ hidden: !v })} /></div>
                <div className="field"><label>Locked</label><BoolField value={t.locked} label={["Unlocked", "Locked"]} onChange={(v) => upd({ locked: v })} /></div>
              </div>
              <div className="btnrow">
                <button className="btn sm" onClick={centerH} disabled={!live}>Center H</button>
                <button className="btn sm" onClick={centerV} disabled={!live}>Center V</button>
                <button className="btn sm" onClick={() => { centerH(); setTimeout(centerV, 0); }} disabled={!live}>Center</button>
              </div>
            </div>
            <div className="sect">
              <div className="section">Timing</div>
              <div className="grid2">
                <div className="field"><label>Shift</label><NumberField unit="f" value={t.delay} step={1} onChange={(d, c) => upd({ delay: Math.round(d) }, c)} /></div>
                <div className="field"><label>Length</label><div className="unit"><input readOnly value={seconds(winLen, def.fps)} /><i>{winLen}f</i></div></div>
                <div className="field"><label>Visible from</label><NumberField unit="f" value={t.trimIn} step={1} min={0} onChange={(v, c) => upd({ trimIn: Math.max(0, Math.round(v)) }, c)} /></div>
                <div className="field"><label>To</label><NumberField unit="f" value={t.trimOut ?? (meta ? meta.last - meta.first : 0)} step={1} onChange={(v, c) => upd({ trimOut: Math.round(v) }, c)} /></div>
              </div>
              {meta && <div className="hint">On screen from frame {from} to {from + winLen - 1}. Positive shift = later; the visible window is in the element's own frames.</div>}
              <SpeedField value={t.speed ?? 1} onChange={(v, c) => upd({ speed: v }, c)} hint={t.speed && t.speed !== 1 ? `Its animations and any Sequences inside run ${+t.speed.toFixed(2)}× ${t.speed > 1 ? "faster" : "slower"}; the visible window stays the same.` : "Runs the element's own clock faster or slower — its entrance and everything animated inside."} />
            </div>
            <PropGroups props={plain} />
            <div className="sect">
              <div className="btnrow" style={{ padding: 0 }}>
                <button className="btn sm" onClick={() => { store().resetElement(id); owned.forEach((p) => store().resetProp(p.id)); if (copyId) { const s = store(); s.begin(); const copy = { ...s.layout.copy }; delete copy[copyId]; useStore.setState({ layout: { ...s.layout, copy } }); s.end(); } }}>Reset element</button>
              </div>
            </div>
          </>
        )}
        {cur === "Animation" && (
          anims.length ? (
            <div className="sect" style={{ display: "grid", gap: 14 }}>
              {anims.map((p) => <div key={p.id}><div className="section">{p.meta.label ?? "Entrance"}</div><PropRow p={p} bare /></div>)}
            </div>
          ) : <div className="empty"><b>No animation declared</b>Give this element an entrance with <code>useAnim("{id}.in", {"{ … }"})</code> and it becomes editable here.</div>
        )}
      </>
    );
  } else if (selection?.type === "sound") {
    tabs = ["Sound"];
    body = <SoundInspector id={selection.id} />;
  } else if (selection?.type === "scene") {
    const sc = scenes.find((s) => s.id === selection.id)!;
    const d = layout.scenes[sc.id] ?? sc.duration;
    const sceneProps = propsOf(props, `scene:${sc.id}`, elementIds);
    tabs = ["Scene"];
    body = (
      <>
        <Head badge={<Film />} title={sc.label} sub={`Scene ${sc.index + 1} of ${scenes.length} · ${sc.id}`} />
        <div className="sect">
          <div className="section">Timing</div>
          <div className="grid2">
            <div className="field"><label>Starts at</label><div className="unit"><input readOnly value={seconds(sc.from, def.fps)} /><i>f{sc.from}</i></div></div>
            <div className="field"><label>Duration<span className="val">{seconds(d, def.fps)}</span></label><NumberField unit="f" value={d} step={1} min={6} onChange={(v, c) => store().setSceneDuration(sc.id, v, c)} /></div>
          </div>
          <div className="hint">Drag the right edge of the scene block in the timeline to trim it. Scenes after it shift automatically.</div>
          <div className="btnrow"><button className="btn sm" onClick={() => { const s = store(); s.begin(); const scenesL = { ...s.layout.scenes }; delete scenesL[sc.id]; useStore.setState({ layout: { ...s.layout, scenes: scenesL } }); s.end(); }}>Reset duration</button></div>
        </div>
        <PropGroups props={sceneProps} title="Scene" />
      </>
    );
  } else if (selection?.type === "brand") {
    const brandProps = props.filter((p) => p.owner === "brand");
    tabs = ["Brand"];
    body = (
      <>
        <Head badge="B" title="Brand" sub="Global tokens used across every scene" />
        {brandProps.length ? <PropGroups props={brandProps} title="Brand" /> : <div className="empty">This template does not declare brand tokens (<code>brand("brand.hero", "#…")</code>).</div>}
      </>
    );
  } else {
    const total = scenes.reduce((a, s) => a + s.duration, 0);
    tabs = ["Project"];
    const Row: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => <div className="status-row"><span className="label">{k}</span><span className="value">{v}</span></div>;
    body = (
      <>
        <Head badge={<Film />} title={def.name} sub={def.id} />
        <div className="sect">
          <div className="section">Project</div>
          <Row k="Size" v={`${def.width} × ${def.height}`} />
          <Row k="Frame rate" v={`${def.fps} fps`} />
          <Row k="Duration" v={`${seconds(total, def.fps)} · ${total} frames`} />
          <Row k="Scenes" v={scenes.length} />
          <Row k="Elements" v={scan.elements.length} />
          <Row k="Editable values" v={props.length} />
          <Row k="Sounds" v={scan.sounds.length} />
        </div>
        <div className="empty"><b>Nothing selected</b>Click an element in the preview or the timeline to edit it. Drag to move, corner handles scale, <span className="kbd">⇧</span> constrains. Save writes your changes into the source files.</div>
      </>
    );
  }
  return (
    <div className="insp">
      <Tabs tabs={tabs} on={tabs.includes(tab) ? tab : tabs[0]} set={setTab} />
      <div className="panel-body" style={{ padding: 0 }}>{body}</div>
    </div>
  );
};
