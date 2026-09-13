import React from "react";
import { registry, useElements, useProps, type PropEntry } from "@project/sdk";
import { useStore } from "../state/store";
import { seconds } from "../lib/format";
import { NumberField, TextField, BoolField, PropControl } from "./Fields";
import { Block, Image, Text } from "../lib/icons";
import { propsOf } from "../lib/owners";
import { SoundInspector } from "./SoundInspector";
import { ElementGroupInspector, SoundGroupInspector } from "./GroupInspector";

const KindIcon: React.FC<{ kind: string }> = ({ kind }) => (kind === "text" ? <Text /> : kind === "image" ? <Image /> : <Block />);

const PropRow: React.FC<{ p: PropEntry }> = ({ p }) => {
  const layout = useStore((s) => s.layout);
  const inCode = useStore((s) => !s.index || !!s.index.locators[`call:${p.id}`]?.literal);
  const store = useStore.getState;
  const over = layout.props[p.id];
  const value = over === undefined ? p.value : p.kind === "anim" && over && typeof over === "object" ? { ...(p.value as object), ...(over as object) } : over;
  const label = p.meta.label ?? p.id.split(".").slice(-1)[0].replace(/([a-z])([A-Z])/g, "$1 $2");
  const wide = p.kind === "anim";
  return (
    <div className="field" style={wide ? { gridTemplateColumns: "1fr" } : undefined}>
      <label title={p.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ textTransform: "capitalize" }}>{label}</span>
        {over !== undefined && <span title="Edited — reset" className="dot" style={{ cursor: "pointer" }} onClick={() => store().resetProp(p.id)} />}
        {!inCode && <span title="No literal in code; saved to layout.json" style={{ color: "var(--warn)", fontSize: 10 }}>json</span>}
      </label>
      <PropControl kind={p.kind} meta={p.meta} value={value} onChange={(v, commit) => store().setProp(p.id, v, commit)} />
    </div>
  );
};

const PropGroups: React.FC<{ props: PropEntry[]; title?: string }> = ({ props, title }) => {
  if (!props.length) return null;
  const groups = new Map<string, PropEntry[]>();
  for (const p of props) { const g = p.meta.group ?? (p.kind === "anim" ? "Animation" : title ?? "Properties"); if (!groups.has(g)) groups.set(g, []); groups.get(g)!.push(p); }
  return <>{[...groups.entries()].map(([g, list]) => <div key={g}><div className="section">{g}</div>{list.map((p) => <PropRow key={p.id} p={p} />)}</div>)}</>;
};

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

  let body: React.ReactNode;
  if (selection?.type === "element" && multi.length > 1) {
    body = <ElementGroupInspector ids={multi} primary={selection.id} />;
  } else if (selection?.type === "sound" && multi.length > 1) {
    body = <SoundGroupInspector ids={multi} primary={selection.id} />;
  } else if (selection?.type === "element") {
    const id = selection.id;
    const t = store().transform(id);
    const live = elements.find((e) => e.id === id);
    const meta = scan.elements.find((e) => e.id === id);
    const kind = live?.kind ?? meta?.kind ?? "block";
    const copyId = kind === "text" ? live?.copyId ?? id : null;
    const copyProp = copyId ? props.find((p) => p.id === copyId && p.kind === "text") : null;
    const owned = propsOf(props, id, elementIds).filter((p) => p.id !== copyId);
    const upd = (patch: Partial<typeof t>, commit = true) => store().updateElement(id, patch, commit);
    const centerH = () => { const r = registry.measureId(id); if (r) upd({ x: Math.round((t.x + (def.width / 2 - (r.x + r.w / 2))) * 10) / 10 }); };
    const centerV = () => { const r = registry.measureId(id); if (r) upd({ y: Math.round((t.y + (def.height / 2 - (r.y + r.h / 2))) * 10) / 10 }); };
    body = (
      <>
        <div style={{ padding: "10px 12px 2px", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ color: "var(--text-2)" }}><KindIcon kind={kind} /></span>
          <div><div style={{ fontWeight: 600, fontSize: 14 }}>{live?.label ?? meta?.label ?? id}</div><div className="id">{id}{live ? "" : " · not on screen at this frame"}</div></div>
        </div>
        {copyId && (
          <>
            <div className="section">Text</div>
            <div style={{ padding: "0 6px" }}>
              <TextField id="insp-text" multiline value={layout.copy[copyId] ?? (copyProp?.value as string) ?? ""} onChange={(v, c) => store().setCopy(copyId, v, c)} />
              <div className="hint" style={{ padding: "6px 4px" }}>Use <span className="kbd">|</span> for a line break where the template supports it.</div>
            </div>
          </>
        )}
        <div className="section">Transform</div>
        <div className="field"><label>Position</label><div className="pair"><NumberField unit="X" value={t.x} onChange={(x, c) => upd({ x }, c)} /><NumberField unit="Y" value={t.y} onChange={(y, c) => upd({ y }, c)} /></div></div>
        <div className="field"><label>Scale</label><NumberField unit="×" value={t.scale} step={0.01} min={0.05} onChange={(scale, c) => upd({ scale }, c)} /></div>
        <div className="field"><label>Rotation</label><NumberField unit="°" value={t.rotate} step={1} onChange={(rotate, c) => upd({ rotate }, c)} /></div>
        <div className="field"><label>Opacity</label><NumberField unit="α" value={t.opacity} step={0.05} min={0} max={1} slider onChange={(o, c) => upd({ opacity: Math.min(1, Math.max(0, o)) }, c)} /></div>
        <div className="field"><label>Visible</label><BoolField value={!t.hidden} label={["Hidden", "Shown"]} onChange={(v) => upd({ hidden: !v })} /></div>
        <div className="btnrow">
          <button className="btn sm" onClick={centerH} disabled={!live}>Center H</button>
          <button className="btn sm" onClick={centerV} disabled={!live}>Center V</button>
          <button className="btn sm" onClick={() => { centerH(); setTimeout(centerV, 0); }} disabled={!live}>Center</button>
        </div>
        <div className="section">Timing</div>
        <div className="field"><label>Shift</label><NumberField unit="f" value={t.delay} step={1} onChange={(d, c) => upd({ delay: Math.round(d) }, c)} /></div>
        {meta && <div className="hint">On screen from frame {meta.first + t.delay} to {meta.last + t.delay} ({seconds(meta.last - meta.first + 1, def.fps)}). Positive shift = later.</div>}
        <PropGroups props={owned} />
        <div className="btnrow" style={{ marginTop: 6 }}>
          <button className="btn sm" onClick={() => { store().resetElement(id); owned.forEach((p) => store().resetProp(p.id)); if (copyId) { const s = store(); s.begin(); const copy = { ...s.layout.copy }; delete copy[copyId]; useStore.setState({ layout: { ...s.layout, copy } }); s.end(); } }}>Reset element</button>
        </div>
      </>
    );
  } else if (selection?.type === "sound") {
    body = <SoundInspector id={selection.id} />;
  } else if (selection?.type === "scene") {
    const sc = scenes.find((s) => s.id === selection.id)!;
    const d = layout.scenes[sc.id] ?? sc.duration;
    const sceneProps = propsOf(props, `scene:${sc.id}`, elementIds);
    body = (
      <>
        <div style={{ padding: "10px 12px 2px" }}><div style={{ fontWeight: 600, fontSize: 14 }}>{sc.label}</div><div className="id">scene · {sc.id}</div></div>
        <div className="section">Timing</div>
        <div className="field"><label>Starts at</label><div style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{seconds(sc.from, def.fps)} · f{sc.from}</div></div>
        <div className="field"><label>Duration</label><div className="pair"><NumberField unit="f" value={d} step={1} min={6} onChange={(v, c) => store().setSceneDuration(sc.id, v, c)} /><div style={{ alignSelf: "center", fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{seconds(d, def.fps)}</div></div></div>
        <div className="hint">Drag the right edge of the scene block in the timeline to trim it. Scenes after it shift automatically.</div>
        <PropGroups props={sceneProps} title="Scene" />
        <div className="btnrow"><button className="btn sm" onClick={() => { const s = store(); s.begin(); const scenesL = { ...s.layout.scenes }; delete scenesL[sc.id]; useStore.setState({ layout: { ...s.layout, scenes: scenesL } }); s.end(); }}>Reset duration</button></div>
      </>
    );
  } else if (selection?.type === "brand") {
    const brandProps = props.filter((p) => p.owner === "brand");
    body = (
      <>
        <div style={{ padding: "10px 12px 2px" }}><div style={{ fontWeight: 600, fontSize: 14 }}>Brand</div><div className="id">global tokens used across every scene</div></div>
        {brandProps.length ? <PropGroups props={brandProps} title="Brand" /> : <div className="empty">This template does not declare brand tokens (<code>brand("brand.hero", "#…")</code>).</div>}
      </>
    );
  } else {
    const total = scenes.reduce((a, s) => a + s.duration, 0);
    body = (
      <>
        <div className="empty"><b>Nothing selected</b>Click an element in the preview or the timeline to edit it.</div>
        <div className="section">Project</div>
        <div className="field"><label>Composition</label><div className="id" style={{ color: "var(--text)" }}>{def.id}</div></div>
        <div className="field"><label>Size</label><div>{def.width} × {def.height}</div></div>
        <div className="field"><label>Frame rate</label><div>{def.fps} fps</div></div>
        <div className="field"><label>Duration</label><div>{seconds(total, def.fps)} · {total} frames</div></div>
        <div className="field"><label>Scenes</label><div>{scenes.length}</div></div>
        <div className="field"><label>Elements</label><div>{scan.elements.length}</div></div>
        <div className="field"><label>Editable values</label><div>{props.length}</div></div>
        <div className="field"><label>Sounds</label><div>{scan.sounds.length}</div></div>
        <div className="hint" style={{ marginTop: 8 }}>Drag elements directly on the preview. Corner handles scale. Hold <span className="kbd">⇧</span> to constrain; elements snap to the centre lines. Save writes your changes into the source files.</div>
      </>
    );
  }
  return (
    <div className="insp">
      <div className="panel-head">Inspector</div>
      <div className="panel-body" style={{ padding: 4 }}>{body}</div>
    </div>
  );
};
