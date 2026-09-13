import React, { useEffect, useState } from "react";
import { useProps } from "@project/sdk";
import { useStore } from "../state/store";
import { usePlayback } from "../state/playback";
import { seek } from "../lib/player";
import { sceneColor } from "../lib/colors";
import { seconds } from "../lib/format";
import { Block, Eye, EyeOff, Film, Image, Text } from "../lib/icons";
import { propsOf } from "../lib/owners";

const KindIcon: React.FC<{ kind: string }> = ({ kind }) => (kind === "text" ? <Text /> : kind === "image" ? <Image /> : <Block />);

export const Library: React.FC = () => {
  const def = useStore((s) => s.def)!;
  const scenes = useStore((s) => s.scenes());
  const scan = useStore((s) => s.scan);
  const selection = useStore((s) => s.selection);
  const layout = useStore((s) => s.layout);
  const codeDefaults = useStore((s) => s.codeDefaults);
  const props = useProps();
  const [tab, setTab] = useState<"scenes" | "elements" | "brand">("elements");

  useEffect(() => {
    if (selection?.type === "element") { setTab("elements"); requestAnimationFrame(() => document.querySelector(`[data-lib="${CSS.escape(selection.id)}"]`)?.scrollIntoView({ block: "nearest" })); }
    if (selection?.type === "brand") setTab("brand");
  }, [selection]);

  const goElement = (id: string, first: number, last: number) => {
    const s = useStore.getState();
    const t = s.transform(id);
    const a = first + t.delay, b = last + t.delay;
    const frame = usePlayback.getState().frame;
    s.select({ type: "element", id });
    if (frame < a || frame > b) seek(Math.min(b, a + Math.min(20, Math.floor((b - a) / 2))));
  };
  const brandProps = props.filter((p) => p.owner === "brand");
  const elementIds = React.useMemo(() => scan.elements.map((e) => e.id), [scan.elements]);

  return (
    <div className="lib">
      <div className="panel-head">Library</div>
      <div style={{ padding: "8px 8px 0" }}>
        <div className="tabs">
          <button className={tab === "scenes" ? "on" : ""} onClick={() => setTab("scenes")}>Scenes</button>
          <button className={tab === "elements" ? "on" : ""} onClick={() => setTab("elements")}>Elements</button>
          <button className={tab === "brand" ? "on" : ""} onClick={() => { setTab("brand"); useStore.getState().select({ type: "brand" }); }}>Brand</button>
        </div>
      </div>
      <div className="panel-body">
        {tab === "scenes" && scenes.map((sc) => (
          <div key={sc.id} className={`row ${selection?.type === "scene" && selection.id === sc.id ? "on" : ""}`} onClick={() => { useStore.getState().select({ type: "scene", id: sc.id }); seek(sc.from); }}>
            <span className="chip" style={{ background: sceneColor(sc.index) }} /><Film /><span className="name">{sc.label}</span><span className="meta">{seconds(sc.duration, def.fps)}</span>
          </div>
        ))}
        {tab === "brand" && (
          brandProps.length ? (
            <div>
              <div className="group">Tokens</div>
              {brandProps.map((p) => (
                <div key={p.id} className="row" onClick={() => useStore.getState().select({ type: "brand" })}>
                  {p.kind === "color" ? <span className="chip" style={{ background: String(layout.props[p.id] ?? p.value), width: 14, height: 14, borderRadius: 4, border: "1px solid var(--line-2)" }} /> : <Text />}
                  <span className="name">{p.meta.label ?? p.id.replace(/^brand\./, "")}</span>
                  <span className="meta">{String(layout.props[p.id] ?? p.value)}</span>
                </div>
              ))}
              <div className="hint">Edit values in the Inspector. Brand tokens apply everywhere they are used.</div>
            </div>
          ) : <div className="empty"><b>No brand tokens</b>Declare them with <code>brand("brand.hero", "#E9573F")</code>.</div>
        )}
        {tab === "elements" && (
          scan.status !== "done" ? (
            <div className="empty"><b>Analyzing…</b>Stepping through the video to find every element. {Math.round(scan.progress * 100)}%</div>
          ) : scenes.map((sc) => {
            const els = scan.elements.filter((e) => e.sceneId === sc.id);
            const sceneProps = propsOf(props, `scene:${sc.id}`, elementIds);
            if (!els.length && !sceneProps.length) return null;
            return (
              <div key={sc.id}>
                <div className="group" style={{ cursor: "pointer" }} onClick={() => { useStore.getState().select({ type: "scene", id: sc.id }); seek(sc.from); }}><span className="chip" style={{ background: sceneColor(sc.index) }} />{sc.label}</div>
                {sceneProps.length > 0 && (
                  <div className={`row ${selection?.type === "scene" && selection.id === sc.id ? "on" : ""}`} onClick={() => { useStore.getState().select({ type: "scene", id: sc.id }); seek(sc.from + 10); }}>
                    <Film /><span className="name">Scene settings</span><span className="meta">{sceneProps.length}</span>
                  </div>
                )}
                {els.map((e) => {
                  const hidden = layout.elements[e.id]?.hidden ?? codeDefaults[e.id]?.hidden;
                  const on = selection?.type === "element" && selection.id === e.id;
                  const n = propsOf(props, e.id, elementIds).length;
                  return (
                    <div key={e.id} data-lib={e.id} className={`row ${on ? "on" : ""} ${hidden ? "dim" : ""}`} onClick={() => goElement(e.id, e.first, e.last)}
                      onMouseEnter={() => useStore.getState().setHover(e.id)} onMouseLeave={() => useStore.getState().setHover(null)}>
                      <KindIcon kind={e.kind} /><span className="name">{e.label}</span>
                      {n > 0 && <span className="meta">{n}</span>}
                      <span className="meta" title="Toggle visibility" onClick={(ev) => { ev.stopPropagation(); useStore.getState().updateElement(e.id, { hidden: !hidden }); }} style={{ display: "grid", placeItems: "center", width: 20, height: 20, borderRadius: 4, cursor: "pointer" }}>{hidden ? <EyeOff /> : <Eye />}</span>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
