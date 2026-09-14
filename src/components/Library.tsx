import React, { useEffect, useState } from "react";
import { useProps } from "@project/sdk";
import { useStore } from "../state/store";
import { usePlayback } from "../state/playback";
import { seek } from "../lib/player";
import { scanProject } from "../lib/scan";
import { sceneColor } from "../lib/colors";
import { seconds } from "../lib/format";
import { Chevron, Eye, EyeOff, Film, Music, Refresh, Waveform } from "../lib/icons";
import { propsOf } from "../lib/owners";
import { useSoundClips } from "./AudioTracks";

// Short kind badges, as in the design: T for text, IMG for images, UI for everything else.
export const kindBadge = (kind: string) => (kind === "text" ? "T" : kind === "image" ? "IMG" : "UI");

type Tab = "scenes" | "elements" | "sounds" | "brand";

/** `only` restricts the tabs shown — the phone layout splits Brand into its own dock item. */
export const Library: React.FC<{ only?: Tab[] }> = ({ only }) => {
  const def = useStore((s) => s.def)!;
  const scenes = useStore((s) => s.scenes());
  const scan = useStore((s) => s.scan);
  const selection = useStore((s) => s.selection);
  const multi = useStore((s) => s.multi);
  const layout = useStore((s) => s.layout);
  const codeDefaults = useStore((s) => s.codeDefaults);
  const props = useProps();
  const allowed: Tab[] = only ?? ["scenes", "elements", "sounds", "brand"];
  const [tab, setTabRaw] = useState<Tab>(allowed.includes("elements") ? "elements" : allowed[0]);
  const setTab = (t: Tab) => { if (allowed.includes(t)) setTabRaw(t); };
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const clips = useSoundClips();

  useEffect(() => {
    if (selection?.type === "element") { setTab("elements"); requestAnimationFrame(() => document.querySelector(`[data-lib="${CSS.escape(selection.id)}"]`)?.scrollIntoView({ block: "nearest" })); }
    if (selection?.type === "brand") setTab("brand");
    if (selection?.type === "sound") { setTab("sounds"); requestAnimationFrame(() => document.querySelector(`[data-lib="${CSS.escape(selection.id)}"]`)?.scrollIntoView({ block: "nearest" })); }
  }, [selection]);
  // an element selected elsewhere opens its scene group
  useEffect(() => {
    if (selection?.type !== "element") return;
    const sc = useStore.getState().allElements().find((e) => e.id === selection.id)?.sceneId;
    if (sc && closed[sc]) setClosed((c) => ({ ...c, [sc]: false }));
  }, [selection]);

  const goElement = (id: string, first: number, last: number, ev?: React.MouseEvent) => {
    const s = useStore.getState();
    const t = s.transform(id);
    const a = first + t.delay, b = last + t.delay;
    const frame = usePlayback.getState().frame;
    if (ev && (ev.shiftKey || ev.metaKey || ev.ctrlKey)) { s.addToSelection(id, ev.metaKey || ev.ctrlKey); return; }
    s.select({ type: "element", id });
    if (frame < a || frame > b) seek(Math.min(b, a + Math.min(20, Math.floor((b - a) / 2))));
  };
  const brandProps = props.filter((p) => p.owner === "brand");
  const elementIds = React.useMemo(() => scan.elements.map((e) => e.id), [scan.elements]);
  const eyeBtn = (hidden: boolean, onClick: () => void, title = "Toggle visibility") => (
    <span className="eye" title={title} onClick={(ev) => { ev.stopPropagation(); onClick(); }}>{hidden ? <EyeOff /> : <Eye />}</span>
  );

  return (
    <div className="lib">
      {allowed.length > 1 && <div className="panel-tabs">
        <div className="tabs">
          {allowed.includes("scenes") && <button className={tab === "scenes" ? "on" : ""} onClick={() => setTab("scenes")}>Scenes</button>}
          {allowed.includes("elements") && <button className={tab === "elements" ? "on" : ""} onClick={() => setTab("elements")}>Elements</button>}
          {allowed.includes("sounds") && <button className={tab === "sounds" ? "on" : ""} onClick={() => setTab("sounds")}>Sounds</button>}
          {allowed.includes("brand") && <button className={tab === "brand" ? "on" : ""} onClick={() => { setTab("brand"); useStore.getState().select({ type: "brand" }); }}>Brand</button>}
        </div>
      </div>}
      <div className="panel-body">
        {tab === "scenes" && scenes.map((sc) => (
          <div key={sc.id} className={`row ${selection?.type === "scene" && selection.id === sc.id ? "on" : ""}`} style={{ height: 30 }} onClick={() => { useStore.getState().select({ type: "scene", id: sc.id }); seek(sc.from); }}>
            <span className="chip" style={{ background: sceneColor(sc.index) }} /><span className="name" style={{ fontWeight: 500, color: "var(--ink)" }}>{sc.label}</span><span className="meta">{seconds(sc.duration, def.fps)}</span>
          </div>
        ))}

        {tab === "sounds" && (() => {
          const groups: Array<[string, React.ReactNode, typeof clips]> = [["Music", <Music />, clips.filter((c) => c.kind === "music")], ["Sound effects", <Waveform />, clips.filter((c) => c.kind !== "music")]];
          return groups.map(([title, icon, list]) => list.length ? (
            <div key={title}>
              <button className="group" onClick={() => setClosed((c) => ({ ...c, [title]: !c[title] }))}>
                <span className={`chev ${closed[title] ? "" : "open"}`}><Chevron open={false} /></span>{icon}<span className="name">{title}</span><span className="meta">{list.length}</span>
              </button>
              {!closed[title] && <div className="sub">
                {list.map((c) => {
                  const on = selection?.type === "sound" && (selection.id === c.id || multi.includes(c.id));
                  return (
                    <div key={c.id} data-lib={c.id} className={`row ${on ? "on" : ""} ${c.muted ? "dim" : ""}`} onClick={(ev) => { const s = useStore.getState(); if (ev.shiftKey || ev.metaKey || ev.ctrlKey) { if (s.selection?.type !== "sound") s.select({ type: "sound", id: c.id }); else s.addToSelection(c.id, ev.metaKey || ev.ctrlKey); return; } s.select({ type: "sound", id: c.id }); const f = usePlayback.getState().frame; if (f < c.start || f > c.start + c.frames) seek(c.start); }}>
                      <span className="kind">{c.kind === "music" ? "MUS" : "SFX"}</span>
                      <span className="name">{c.label}</span>
                      <span className="meta">{seconds(c.start, def.fps)}</span>
                      {eyeBtn(c.muted, () => useStore.getState().setSound(c.id, { muted: !c.muted }), c.muted ? "Unmute" : "Mute")}
                    </div>
                  );
                })}
              </div>}
            </div>
          ) : null);
        })()}

        {tab === "brand" && (
          brandProps.length ? (
            <div>
              {brandProps.some((p) => p.kind === "color") && <>
                <div className="lib-title">Palette</div>
                <div className="swatches">
                  {brandProps.filter((p) => p.kind === "color").map((p) => {
                    const v = String(layout.props[p.id] ?? p.value);
                    return (
                      <div key={p.id} className="swatch" onClick={() => useStore.getState().select({ type: "brand" })} title={p.id}>
                        <i style={{ background: v }} /><div><b>{p.meta.label ?? p.id.replace(/^brand\./, "")}</b><span>{v}</span></div>
                      </div>
                    );
                  })}
                </div>
              </>}
              {brandProps.some((p) => p.kind !== "color") && <>
                <div className="lib-title" style={{ marginTop: 18 }}>Tokens</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {brandProps.filter((p) => p.kind !== "color").map((p) => (
                    <div key={p.id} className="token" onClick={() => useStore.getState().select({ type: "brand" })} title={p.id}>
                      <b style={{ fontWeight: 500 }}>{p.meta.label ?? p.id.replace(/^brand\./, "")}</b><span>{String(layout.props[p.id] ?? p.value)}</span>
                    </div>
                  ))}
                </div>
              </>}
              <div className="hint" style={{ padding: "12px 2px 0" }}>Edit values in the Inspector. Brand tokens apply everywhere they are used.</div>
            </div>
          ) : <div className="empty"><b>No brand tokens</b>Declare them with <code>brand("brand.hero", "#E9573F")</code>.</div>
        )}

        {tab === "elements" && (
          scan.status !== "done" ? (
            <div className="empty"><b>Analyzing…</b>Stepping through the video to find every element. {Math.round(scan.progress * 100)}%</div>
          ) : scenes.map((sc) => {
            const els = useStore.getState().allElements().filter((e) => e.sceneId === sc.id);
            const sceneProps = propsOf(props, `scene:${sc.id}`, elementIds);
            if (!els.length && !sceneProps.length) return null;
            const open = !closed[sc.id];
            return (
              <div key={sc.id} style={{ marginBottom: 2 }}>
                <button className="group" onClick={() => setClosed((c) => ({ ...c, [sc.id]: !c[sc.id] }))} onDoubleClick={() => { useStore.getState().select({ type: "scene", id: sc.id }); seek(sc.from); }} title="Click to expand · double-click to select the scene">
                  <span className={`chev ${open ? "open" : ""}`}><Chevron open={false} /></span>
                  <span className="chip" style={{ background: sceneColor(sc.index) }} />
                  <span className="name">{sc.label}</span>
                  <span className="meta">{seconds(sc.duration, def.fps)}</span>
                </button>
                {open && <div className="sub">
                  {sceneProps.length > 0 && (
                    <div className={`row ${selection?.type === "scene" && selection.id === sc.id ? "on" : ""}`} onClick={() => { useStore.getState().select({ type: "scene", id: sc.id }); seek(sc.from + 10); }}>
                      <span className="kind"><Film /></span><span className="name">Scene settings</span><span className="meta">{sceneProps.length}</span>
                    </div>
                  )}
                  {els.map((e) => {
                    const hidden = layout.elements[e.id]?.hidden ?? codeDefaults[e.id]?.hidden;
                    const on = multi.includes(e.id) || (selection?.type === "element" && selection.id === e.id);
                    const n = propsOf(props, e.id, elementIds).length;
                    return (
                      <div key={e.id} data-lib={e.id} className={`row ${on ? "on" : ""} ${hidden ? "dim" : ""}`} onClick={(ev) => goElement(e.id, e.first, e.last, ev)}
                        onMouseEnter={() => useStore.getState().setHover(e.id)} onMouseLeave={() => useStore.getState().setHover(null)}>
                        <span className="kind">{kindBadge(e.kind)}</span><span className="name">{e.label}</span>
                        {n > 0 && <span className="meta" title={`${n} editable value${n === 1 ? "" : "s"}`}>{n}</span>}
                        {eyeBtn(!!hidden, () => useStore.getState().updateElement(e.id, { hidden: !hidden }))}
                      </div>
                    );
                  })}
                </div>}
              </div>
            );
          })
        )}
      </div>
      <div className="panel-foot">
        <button className="btn ghost" title="Re-analyze which elements appear when" onClick={() => scanProject(3, true)} disabled={scan.status === "running"}>
          <Refresh /> {scan.status === "running" ? `Analyzing ${Math.round(scan.progress * 100)}%` : "Rescan project"}
        </button>
      </div>
    </div>
  );
};
