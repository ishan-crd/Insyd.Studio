import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { animLength, useProps, type AnimSpec } from "@project/sdk";
import { useStore } from "../state/store";
import { usePlayback } from "../state/playback";
import { seek } from "../lib/player";
import { sceneColor } from "../lib/colors";
import { timecode } from "../lib/format";
import { Block, Chevron, Eye, EyeOff, Image, Text } from "../lib/icons";
import { propsOf } from "../lib/owners";
import { useAudioRows } from "./AudioTracks";

const ROW = { ruler: 28, scene: 40, grp: 24, el: 28 };
const KindIcon: React.FC<{ kind: string }> = ({ kind }) => (kind === "text" ? <Text /> : kind === "image" ? <Image /> : <Block />);

// Playhead is its own component so 30fps frame ticks don't re-render the tracks.
const Playhead: React.FC<{ ppf: number; tracksRef: React.RefObject<HTMLDivElement> }> = ({ ppf, tracksRef }) => {
  const frame = usePlayback((s) => s.frame);
  const playing = usePlayback((s) => s.playing);
  useEffect(() => {
    const el = tracksRef.current;
    if (!el || !playing) return;
    const x = frame * ppf;
    if (x < el.scrollLeft + 40 || x > el.scrollLeft + el.clientWidth - 40) el.scrollLeft = Math.max(0, x - 80);
  }, [frame, playing, ppf, tracksRef]);
  return <div className="playhead" style={{ left: frame * ppf }} />;
};

export const Timeline: React.FC = () => {
  const def = useStore((s) => s.def)!;
  const scenes = useStore((s) => s.scenes());
  const duration = useStore((s) => s.duration());
  const selection = useStore((s) => s.selection);
  const multi = useStore((s) => s.multi);
  const layout = useStore((s) => s.layout);
  const codeDefaults = useStore((s) => s.codeDefaults);
  const scan = useStore((s) => s.scan);
  const collapsed = useStore((s) => s.collapsed);
  const zoomMul = useStore((s) => s.zoom) ?? 1;
  const props = useProps();
  const tracksRef = useRef<HTMLDivElement>(null);
  const namesRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1000);
  const store = useStore.getState;

  useLayoutEffect(() => {
    const el = tracksRef.current!;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ppf = ((width - 48) / Math.max(1, duration)) * zoomMul;
  const innerW = duration * ppf + 48;

  useEffect(() => {
    if (selection?.type !== "element") return;
    const row = namesRef.current?.querySelector(`[data-row="${CSS.escape(selection.id)}"]`) as HTMLElement | null;
    const tracks = tracksRef.current;
    if (!row || !tracks) return;
    const top = row.offsetTop, pinned = ROW.ruler + ROW.scene;
    if (top < tracks.scrollTop + pinned || top + ROW.el > tracks.scrollTop + tracks.clientHeight) tracks.scrollTop = Math.max(0, top - tracks.clientHeight / 2);
  }, [selection]);

  const ticks = useMemo(() => {
    const opts = [0.5, 1, 2, 5, 10, 30];
    const every = opts.find((s) => s * def.fps * ppf >= 70) ?? 60;
    const out: Array<{ f: number; label: string; minor: boolean }> = [];
    for (let s = 0; s * def.fps <= duration; s += every / 2) {
      const f = Math.round(s * def.fps);
      const minor = (s / every) % 1 !== 0;
      out.push({ f, label: minor ? "" : timecode(f, def.fps).replace(/\.\d+$/, ""), minor });
    }
    return out;
  }, [def.fps, duration, ppf]);

  // ---- rubber-band selection on empty track space (click without moving = seek) ----
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const contentPoint = (clientX: number, clientY: number) => {
    const el = tracksRef.current!; const r = el.getBoundingClientRect();
    return { x: clientX - r.left + el.scrollLeft, y: clientY - r.top + el.scrollTop };
  };
  const applyMarquee = (box: { x: number; y: number; w: number; h: number }, base: { type: "element" | "sound"; ids: string[] } | null) => {
    const el = tracksRef.current!; const r = el.getBoundingClientRect();
    const hits: Record<"element" | "sound", string[]> = { element: [], sound: [] };
    for (const node of Array.from(el.querySelectorAll<HTMLElement>("[data-clip-id]"))) {
      const b = node.getBoundingClientRect();
      const cx = b.left - r.left + el.scrollLeft, cy = b.top - r.top + el.scrollTop;
      if (cx < box.x + box.w && cx + b.width > box.x && cy < box.y + box.h && cy + b.height > box.y) {
        hits[node.dataset.clipKind === "snd" ? "sound" : "element"].push(node.dataset.clipId!);
      }
    }
    // one domain at a time: keep the domain of an additive base, otherwise the one with more hits
    const type = base ? base.type : hits.sound.length > hits.element.length ? "sound" : "element";
    const ids = Array.from(new Set([...(base?.ids ?? []), ...hits[type]]));
    if (!ids.length) { if (!base) useStore.setState({ selection: null, multi: [] }); return; }
    useStore.setState({ selection: { type, id: ids[ids.length - 1] }, multi: ids });
  };
  const trackDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault(); // no native text/drag selection
    const start = contentPoint(e.clientX, e.clientY);
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    const cur = store().selection;
    const base = additive && (cur?.type === "element" || cur?.type === "sound") ? { type: cur.type, ids: store().selectedIds() } : null;
    let moved = false;
    drag(e, (_dx, ev) => {
      const p = contentPoint(ev.clientX, ev.clientY);
      if (!moved && Math.hypot(p.x - start.x, p.y - start.y) < 4) return;
      moved = true;
      const box = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) };
      setMarquee(box); applyMarquee(box, base);
    }, (m) => {
      setMarquee(null);
      // a plain click on empty space seeks and clears the selection (⇧/⌘-click keeps it)
      if (!m) { seek(frameAt(e.clientX)); if (!additive) store().select(null); }
    });
  };

  const frameAt = (clientX: number) => {
    const el = tracksRef.current!;
    const x = clientX - el.getBoundingClientRect().left + el.scrollLeft;
    return Math.max(0, Math.min(duration - 1, Math.round(x / ppf)));
  };
  const drag = (e: React.PointerEvent, onMove: (dx: number, ev: PointerEvent) => void, onUp?: (moved: boolean) => void) => {
    e.stopPropagation();
    const x0 = e.clientX; let moved = false;
    const move = (ev: PointerEvent) => { const dx = ev.clientX - x0; if (Math.abs(dx) > 1) moved = true; onMove(dx, ev); };
    const up = () => { onUp?.(moved); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const scrub = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    seek(frameAt(e.clientX));
    drag(e, (_dx, ev) => seek(frameAt(ev.clientX)));
  };
  const dragScene = (e: React.PointerEvent, id: string, start: number) => {
    e.preventDefault(); store().begin();
    drag(e, (dx) => store().setSceneDuration(id, start + dx / ppf, false), () => store().end());
  };
  // Click selects; ⇧-click adds to the selection, ⌘-click toggles. Dragging a selected clip slides
  // every selected clip together; dragging an unselected clip selects just that one first.
  const dragClip = (e: React.PointerEvent, id: string, first: number, last: number) => {
    if (e.button !== 0) return;
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    if (additive) store().addToSelection(id, e.metaKey || e.ctrlKey);
    else if (!store().selectedIds().includes(id)) store().select({ type: "element", id });
    const ids = store().selectedIds();
    const base = Object.fromEntries(ids.map((x) => [x, store().transform(x).delay]));
    store().begin();
    drag(e, (dx) => {
      const d = Math.round(dx / ppf);
      store().updateElements(Object.fromEntries(ids.map((x) => [x, { delay: base[x] + d }])), false);
    }, (moved) => {
      store().end();
      if (!additive) useStore.setState({ selection: { type: "element", id } });
      const t = store().transform(id); const a = first + t.delay, b = last + t.delay; const f = usePlayback.getState().frame;
      if (moved || f < a || f > b) seek(a + Math.min(20, Math.floor((b - a) / 2)));
    });
  };
  const dragAnim = (e: React.PointerEvent, propId: string, spec: AnimSpec, elId: string, clipStart: number) => {
    if (e.button !== 0) return;
    const d0 = spec.delay ?? 0; store().begin();
    drag(e, (dx) => store().setProp(propId, { ...spec, delay: Math.max(0, d0 + Math.round(dx / ppf)) }, false), () => {
      store().end(); store().select({ type: "element", id: elId });
      const cur = (store().layout.props[propId] as AnimSpec | undefined) ?? spec;
      seek(clipStart + (cur.delay ?? 0));
    });
  };

  const elementIds = useMemo(() => scan.elements.map((e) => e.id), [scan.elements]);
  const audio = useAudioRows(ppf, trackDown, drag);
  const rows: React.ReactNode[] = [];
  const names: React.ReactNode[] = [];
  scenes.forEach((sc) => {
    const els = scan.elements.filter((e) => e.sceneId === sc.id);
    if (!els.length) return;
    const open = !collapsed[sc.id];
    names.push(
      <div key={"g" + sc.id} className="trow grp"><div className="tname grp" style={{ height: ROW.grp }} onClick={() => store().toggleCollapsed(sc.id)}>
        <Chevron open={open} /><span className="chip" style={{ background: sceneColor(sc.index) }} />{sc.label}<span style={{ marginLeft: "auto", fontWeight: 500 }}>{els.length}</span>
      </div></div>,
    );
    rows.push(<div key={"g" + sc.id} className="trow grp" onPointerDown={trackDown} />);
    if (!open) return;
    els.forEach((e) => {
      const t = { delay: 0, hidden: false, ...(codeDefaults[e.id] ?? {}), ...(layout.elements[e.id] ?? {}) };
      const on = multi.includes(e.id) || (selection?.type === "element" && selection.id === e.id);
      const anims = propsOf(props, e.id, elementIds).filter((p) => p.kind === "anim");
      const clipStart = e.first + t.delay;
      names.push(
        <div key={e.id} className="trow" data-row={e.id}><div className={`tname ${on ? "on" : ""}`} style={{ height: ROW.el }} onMouseEnter={() => store().setHover(e.id)} onMouseLeave={() => store().setHover(null)} onClick={(ev) => (ev.shiftKey || ev.metaKey || ev.ctrlKey) ? store().addToSelection(e.id, ev.metaKey || ev.ctrlKey) : store().select({ type: "element", id: e.id })}>
          <span style={{ display: "grid", placeItems: "center", opacity: 0.7 }}><KindIcon kind={e.kind} /></span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{e.label}</span>
          <span className="eye" onClick={(ev) => { ev.stopPropagation(); store().updateElement(e.id, { hidden: !t.hidden }); }}>{t.hidden ? <EyeOff /> : <Eye />}</span>
        </div></div>,
      );
      rows.push(
        <div key={e.id} className="trow" onPointerDown={trackDown}>
          <div className={`clip ${on ? "on" : ""} ${t.hidden ? "hidden-el" : ""}`} data-clip-id={e.id} data-clip-kind="el"
            style={{ left: clipStart * ppf, width: Math.max(6, (e.last - e.first + 1) * ppf - 1), ["--clip" as any]: sceneColor(sc.index) }}
            onPointerDown={(ev) => dragClip(ev, e.id, e.first, e.last)}
            onMouseEnter={() => store().setHover(e.id)} onMouseLeave={() => store().setHover(null)}
            title={`${e.label} · frames ${clipStart}–${e.last + t.delay}${t.delay ? ` · shift ${t.delay}` : ""}`}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{e.label}</span>
            {t.delay !== 0 && <span className="delay">{t.delay > 0 ? "+" : ""}{t.delay}f</span>}
            {anims.map((p) => {
              const spec = { ...(p.value as AnimSpec), ...((layout.props[p.id] as AnimSpec | undefined) ?? {}) };
              const a = (spec.delay ?? 0) * ppf, w = Math.max(4, animLength(spec, def.fps) * ppf);
              return (
                <div key={p.id} className="anim" style={{ left: a, width: w }} title={`${p.meta.label ?? "Animation"} · starts +${spec.delay ?? 0}f · ${spec.preset ?? "smooth"} — drag to re-time`}
                  onPointerDown={(ev) => dragAnim(ev, p.id, spec, e.id, clipStart)} />
              );
            })}
          </div>
        </div>,
      );
    });
  });

  return (
    <div className="tl">
      <div className="tl-head">
        <div className="tl-resize" title="Drag to resize" onPointerDown={(e) => {
          const app = document.querySelector(".app") as HTMLElement;
          const h0 = parseFloat(getComputedStyle(app).getPropertyValue("--tl-h")) || 300, y0 = e.clientY;
          const move = (ev: PointerEvent) => app.style.setProperty("--tl-h", `${Math.max(160, Math.min(window.innerHeight - 300, h0 + (y0 - ev.clientY)))}px`);
          const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
          window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
        }} />
        <span className="title">Timeline</span>
        <span className="sep" />
        {scan.status === "running" ? (
          <div className="scanbar">Analyzing elements <div className="bar"><i style={{ width: `${scan.progress * 100}%` }} /></div></div>
        ) : (
          <span style={{ color: "var(--text-3)", fontSize: 12 }}>{multi.length > 1 ? <b style={{ color: "var(--accent)" }}>{multi.length} selected · drag any of them to slide the group · </b> : null}{scenes.length} scenes · {scan.elements.length} elements · {scan.sounds.length} sounds · ⇧-click clips to multi-select · drag scene edges to trim · drag the bright bar inside a clip to re-time its entrance</span>
        )}
        <div className="spacer" />
        <span style={{ color: "var(--text-3)", fontSize: 12 }}>Zoom</span>
        <input type="range" min={1} max={8} step={0.1} value={zoomMul} onChange={(e) => store().setZoom(parseFloat(e.target.value))} style={{ width: 120, padding: 0, background: "transparent", border: 0 }} />
        <button className="btn ghost sm" onClick={() => store().setZoom(null)}>Fit</button>
      </div>
      <div className="tl-body">
        <div className="tl-names" ref={namesRef}>
          <div className="trow ruler" style={{ height: ROW.ruler }} />
          <div className="trow scene"><div className="tname" style={{ height: ROW.scene, fontWeight: 600 }}>Scenes</div></div>
          {names}
          {audio.names}
        </div>
        <div className="tl-tracks" ref={tracksRef} onScroll={(e) => { if (namesRef.current) namesRef.current.scrollTop = (e.target as HTMLDivElement).scrollTop; }}>
          <div className="tl-inner" style={{ width: innerW }}>
            <div className="trow ruler" onPointerDown={scrub}>
              {ticks.map((t) => <div key={t.f} className={`tick ${t.minor ? "minor" : ""}`} style={{ left: t.f * ppf }}>{t.label && <span>{t.label}</span>}</div>)}
            </div>
            <div className="trow scene" onPointerDown={scrub}>
              {scenes.map((sc) => {
                const on = selection?.type === "scene" && selection.id === sc.id;
                return (
                  <div key={sc.id} className={`sblock ${on ? "on" : ""}`} style={{ left: sc.from * ppf + 1, width: Math.max(8, sc.duration * ppf - 3), background: sceneColor(sc.index) }}
                    onPointerDown={(e) => { e.stopPropagation(); store().select({ type: "scene", id: sc.id }); seek(frameAt(e.clientX)); }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{sc.label}</span>
                    <span className="dur">{(sc.duration / def.fps).toFixed(1)}s</span>
                    <div className="edge" onPointerDown={(e) => dragScene(e, sc.id, sc.duration)} title="Drag to trim" />
                  </div>
                );
              })}
            </div>
            {rows}
            {audio.rows}
            {marquee && <div className="marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />}
            <Playhead ppf={ppf} tracksRef={tracksRef} />
          </div>
        </div>
      </div>
    </div>
  );
};
