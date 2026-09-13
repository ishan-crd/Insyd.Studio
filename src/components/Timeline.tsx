import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { animLength, useProps, type AnimSpec } from "@project/sdk";
import { useStore } from "../state/store";
import { usePlayback } from "../state/playback";
import { seek } from "../lib/player";
import { sceneColor } from "../lib/colors";
import { timecode } from "../lib/format";
import { Chevron, Eye, EyeOff } from "../lib/icons";
import { propsOf } from "../lib/owners";
import { useAudioRows } from "./AudioTracks";
import { openMenu, type MenuItem } from "./ContextMenu";
import { snapDelta, clearSnap, useSnapUi } from "../lib/snap";
import { useThumbs } from "../lib/thumbs";
import { copyElements, cutElements, pasteClipboard, duplicateElements, splitElements, deleteElements, setElementsLocked, trimElement, isElementLocked, getClipboard, duplicateSounds, splitSounds, setSoundsLocked, isSoundLocked } from "../lib/clips";
import { Copy, Clipboard as ClipIcon, Duplicate, Scissors, Trash, Lock, Unlock, EyeOff as EyeOffIcon } from "../lib/icons";

const ROW = { ruler: 24, scene: 52, grp: 24, el: 28 };

// Thumbnails that fall inside a scene block, laid out at their frame position.
const Filmstrip: React.FC<{ from: number; duration: number; ppf: number }> = ({ from, duration, ppf }) => {
  const thumbs = useThumbs((s) => s.thumbs);
  if (!thumbs) return null;
  const { base, every, files } = thumbs;
  const w = every * ppf;
  const first = Math.floor(from / every), last = Math.ceil((from + duration) / every);
  const imgs: React.ReactNode[] = [];
  for (let i = Math.max(0, first); i <= Math.min(files.length - 1, last); i++) {
    const frame = i * every;
    const x = (frame - from) * ppf;
    imgs.push(<img key={i} src={`${base}/${files[i]}`} alt="" draggable={false} style={{ position: "absolute", left: x, top: 0, height: "100%", width: Math.max(w, 1), objectFit: "cover", objectPosition: "center" }} />);
  }
  return <div className="filmstrip" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>{imgs}<div className="film-shade" /></div>;
};

const SnapLine: React.FC<{ ppf: number }> = ({ ppf }) => {
  const line = useSnapUi((s) => s.line);
  return line === null ? null : <div className="snapline" style={{ left: line * ppf }} />;
};

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
  const allElements = useStore((s) => s.allElements());
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
    const from = scenes.find((sc) => sc.id === id)?.from ?? 0;
    drag(e, (dx, ev) => {
      let d = dx / ppf;
      d += snapDelta(from + start + d, from + start + d, new Set(), ppf, { disabled: ev.altKey, edges: ["start"] });
      store().setSceneDuration(id, start + d, false);
    }, () => { clearSnap(); store().end(); });
  };
  // Click selects; ⇧-click adds to the selection, ⌘-click toggles. Dragging a selected clip slides
  // every selected clip together; dragging an unselected clip selects just that one first.
  const dragClip = (e: React.PointerEvent, id: string, first: number, last: number) => {
    if (e.button !== 0) return;
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    if (additive) store().addToSelection(id, e.metaKey || e.ctrlKey);
    else if (!store().selectedIds().includes(id)) store().select({ type: "element", id });
    const ids = store().selectedIds().filter((x) => !isElementLocked(x));
    if (!ids.length) return;
    const base = Object.fromEntries(ids.map((x) => [x, store().transform(x).delay]));
    const t0 = store().transform(id);
    const len0 = (t0.trimOut ?? (last - first)) - t0.trimIn + 1;
    const start0 = first + t0.delay + t0.trimIn;
    const exclude = new Set(ids);
    store().begin();
    drag(e, (dx, ev) => {
      let d = Math.round(dx / ppf);
      d += snapDelta(start0 + d, start0 + d + len0, exclude, ppf, { disabled: ev.altKey });
      store().updateElements(Object.fromEntries(ids.map((x) => [x, { delay: base[x] + d }])), false);
    }, (moved) => {
      clearSnap();
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
  const thumbState = useThumbs();
  const hasThumbs = !!thumbState.thumbs;
  const elementMenu = (ids: string[]): MenuItem[] => {
    const n = ids.length, frame = usePlayback.getState().frame;
    const locked = ids.some(isElementLocked), allLocked = n > 0 && ids.every(isElementLocked);
    const hidden = n > 0 && ids.every((id) => store().transform(id).hidden);
    return [
      { label: "Cut", icon: <Scissors />, kbd: "⌘X", onClick: () => cutElements(ids), disabled: !n || locked },
      { label: "Copy", icon: <Copy />, kbd: "⌘C", onClick: () => copyElements(ids), disabled: !n },
      { label: "Paste at playhead", icon: <ClipIcon />, kbd: "⌘V", onClick: () => pasteClipboard(), disabled: !getClipboard() },
      { label: "Duplicate (linked copy)", icon: <Duplicate />, kbd: "⌘D", onClick: () => duplicateElements(ids), disabled: !n },
      { label: "Split at playhead", icon: <Scissors />, kbd: "⌘K", onClick: () => splitElements(frame, ids), disabled: !n || locked },
      { sep: true, label: "" },
      { label: hidden ? "Show" : "Hide", icon: <EyeOffIcon />, kbd: "H", onClick: () => store().updateElements(Object.fromEntries(ids.map((id) => [id, { hidden: !hidden }]))), disabled: !n || locked },
      { label: allLocked ? "Unlock" : "Lock", icon: allLocked ? <Unlock /> : <Lock />, kbd: "⌘L", onClick: () => setElementsLocked(ids, !allLocked), disabled: !n },
      { sep: true, label: "" },
      { label: n > 1 ? `Delete ${n} elements` : "Delete", icon: <Trash />, kbd: "⌫", onClick: () => deleteElements(ids), disabled: !n || locked, danger: true },
    ];
  };
  const ctxElement = (e: React.MouseEvent, id: string) => {
    if (!store().selectedIds().includes(id) || store().selection?.type !== "element") store().select({ type: "element", id });
    openMenu(e, elementMenu(store().selectedIds()));
  };
  const trimClip = (e: React.PointerEvent, id: string, edge: "l" | "r") => {
    if (e.button !== 0 || isElementLocked(id)) return;
    e.stopPropagation();
    if (!store().selectedIds().includes(id)) store().select({ type: "element", id });
    const base = store().transform(id); store().begin();
    const info = allElements.find((x) => x.id === id)!;
    const s0 = info.first + base.delay + base.trimIn, e0 = info.first + base.delay + (base.trimOut ?? info.last - info.first);
    drag(e, (dx, ev) => {
      let d = Math.round(dx / ppf);
      d += edge === "l" ? snapDelta(s0 + d, s0 + d, new Set([id]), ppf, { disabled: ev.altKey, edges: ["start"] }) : snapDelta(e0 + d, e0 + d, new Set([id]), ppf, { disabled: ev.altKey, edges: ["start"] });
      trimElement(id, base, edge, d, false);
    }, () => { clearSnap(); store().end(); });
  };

  const rows: React.ReactNode[] = [];
  const names: React.ReactNode[] = [];
  scenes.forEach((sc) => {
    const els = allElements.filter((e) => e.sceneId === sc.id);
    if (!els.length) return;
    const open = !collapsed[sc.id];
    names.push(
      <div key={"g" + sc.id} className="trow grp"><div className="tname grp" style={{ height: ROW.grp }} onClick={() => store().toggleCollapsed(sc.id)}>
        <Chevron open={open} /><span className="chip" style={{ background: sceneColor(sc.index) }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{sc.label}</span>
        {(() => { const all = els.length > 0 && els.every((x) => isElementLocked(x.id)); return <span className={`tlock ${all ? "on" : ""}`} title={all ? "Unlock all elements in this scene" : "Lock all elements in this scene"} onClick={(ev) => { ev.stopPropagation(); setElementsLocked(els.map((x) => x.id), !all); }}>{all ? <Lock /> : <Unlock />}</span>; })()}
        <span className="cnt">{els.length}</span>
      </div></div>,
    );
    rows.push(<div key={"g" + sc.id} className="trow grp" onPointerDown={trackDown} onContextMenu={(e) => openMenu(e, elementMenu([]))} />);
    if (!open) return;
    els.forEach((e) => {
      const t = { delay: 0, hidden: false, trimIn: 0, trimOut: null as number | null, locked: false, ...(codeDefaults[e.id] ?? {}), ...(layout.elements[e.id] ?? {}) };
      const on = multi.includes(e.id) || (selection?.type === "element" && selection.id === e.id);
      const anims = propsOf(props, e.id, elementIds).filter((p) => p.kind === "anim");
      const len = e.last - e.first + 1;
      const winEnd = t.trimOut ?? len - 1;
      const clipStart = e.first + t.delay + t.trimIn;
      const clipLen = Math.max(1, winEnd - t.trimIn + 1);
      const isClone = !!(layout.elements[e.id]?.cloneOf);
      names.push(
        <div key={e.id} className="trow" data-row={e.id}><div className={`tname ${on ? "on" : ""}`} style={{ height: ROW.el }} onMouseEnter={() => store().setHover(e.id)} onMouseLeave={() => store().setHover(null)} onClick={(ev) => (ev.shiftKey || ev.metaKey || ev.ctrlKey) ? store().addToSelection(e.id, ev.metaKey || ev.ctrlKey) : store().select({ type: "element", id: e.id })} onContextMenu={(ev) => ctxElement(ev, e.id)}>
          <span className="chip" style={{ background: sceneColor(sc.index) }} />{t.locked && <Lock />}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", fontStyle: isClone ? "italic" : undefined }}>{e.label}</span>
          <span className="eye" onClick={(ev) => { ev.stopPropagation(); store().updateElement(e.id, { hidden: !t.hidden }); }}>{t.hidden ? <EyeOff /> : <Eye />}</span>
        </div></div>,
      );
      rows.push(
        <div key={e.id} className="trow" onPointerDown={trackDown} onContextMenu={(ev) => openMenu(ev, elementMenu([]))}>
          <div className={`clip ${on ? "on" : ""} ${t.hidden ? "hidden-el" : ""} ${t.locked ? "locked" : ""} ${isClone ? "clone" : ""}`} data-clip-id={e.id} data-clip-kind="el"
            style={{ left: clipStart * ppf, width: Math.max(6, clipLen * ppf - 1), ["--clip" as any]: sceneColor(sc.index) }}
            onPointerDown={(ev) => dragClip(ev, e.id, e.first, e.last)} onContextMenu={(ev) => ctxElement(ev, e.id)}
            onMouseEnter={() => store().setHover(e.id)} onMouseLeave={() => store().setHover(null)}
            title={`${e.label} · frames ${clipStart}–${clipStart + clipLen - 1}${t.delay ? ` · shift ${t.delay}` : ""}${t.trimIn || t.trimOut !== null ? ` · window ${t.trimIn}–${winEnd}` : ""}${t.locked ? " · locked" : ""} — drag to move · edges trim · right-click for more`}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{t.locked && <Lock />}{e.label}</span>
            {t.delay !== 0 && <span className="delay">{t.delay > 0 ? "+" : ""}{t.delay}f</span>}
            {!t.locked && clipLen * ppf >= 28 && <><div className="trim l" onPointerDown={(ev) => trimClip(ev, e.id, "l")} title="Trim start" /><div className="trim r" onPointerDown={(ev) => trimClip(ev, e.id, "r")} title="Trim end" /></>}
            {anims.map((p) => {
              const spec = { ...(p.value as AnimSpec), ...((layout.props[p.id] as AnimSpec | undefined) ?? {}) };
              const a = ((spec.delay ?? 0) - t.trimIn) * ppf, w = Math.max(4, animLength(spec, def.fps) * ppf);
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
        {scan.status === "running" ? (
          <div className="scanbar">Analyzing elements <div className="bar"><i style={{ width: `${scan.progress * 100}%` }} /></div></div>
        ) : thumbState.status === "running" ? (
          <div className="scanbar">Rendering thumbnails <div className="bar"><i style={{ width: `${thumbState.progress * 100}%` }} /></div></div>
        ) : (
          <span className="stats" title="⇧-click clips to multi-select · drag scene edges to trim · drag the bar inside a clip to re-time its entrance">{multi.length > 1 ? <b>{multi.length} selected · drag any of them to slide the group · </b> : null}{scenes.length} scenes · {scan.elements.length} elements · {scan.sounds.length} sounds</span>
        )}
        <div className="spacer" />
        {(() => {
          // clip tools act on the current selection (elements or sounds)
          const kind = selection?.type === "element" || selection?.type === "sound" ? selection.type : null;
          const ids = kind ? store().selectedIds() : [];
          const n = ids.length;
          const allLocked = n > 0 && ids.every((id) => (kind === "sound" ? isSoundLocked(id) : isElementLocked(id)));
          const frame = usePlayback.getState().frame;
          return (
            <div className="tl-tools">
              <button title="Split at playhead (⌘K)" disabled={!n || allLocked} onClick={() => (kind === "sound" ? splitSounds(frame, ids) : splitElements(frame, ids))}>Split</button>
              <button title={kind === "element" ? "Duplicate as a linked copy (⌘D)" : "Duplicate (⌘D)"} disabled={!n} onClick={() => (kind === "sound" ? duplicateSounds(ids) : duplicateElements(ids))}>Duplicate</button>
              <button className={allLocked ? "on" : ""} title={allLocked ? "Unlock (⌘L)" : "Lock (⌘L)"} disabled={!n} onClick={() => (kind === "sound" ? setSoundsLocked(ids, !allLocked) : setElementsLocked(ids, !allLocked))}>{allLocked ? "Unlock" : "Lock"}</button>
            </div>
          );
        })()}
        <div className="zoom">
          <span>Zoom</span>
          <input type="range" min={1} max={8} step={0.1} value={zoomMul} style={{ ["--p" as any]: `${((zoomMul - 1) / 7) * 100}%` }} onChange={(e) => store().setZoom(parseFloat(e.target.value))} />
          <button className="btn" onClick={() => store().setZoom(null)}>Fit</button>
        </div>
      </div>
      <div className="tl-body">
        <div className="tl-names" ref={namesRef}>
          <div className="trow ruler" style={{ height: ROW.ruler }} />
          <div className="trow scene"><div className="tname" style={{ height: ROW.scene, fontWeight: 600, color: "var(--ink)" }}>Scenes</div></div>
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
                  <div key={sc.id} className={`sblock ${on ? "on" : ""} ${hasThumbs ? "film" : ""}`} style={{ left: sc.from * ppf + 1, width: Math.max(8, sc.duration * ppf - 3), background: sceneColor(sc.index), ["--scene" as any]: sceneColor(sc.index) }}
                    onPointerDown={(e) => { e.stopPropagation(); store().select({ type: "scene", id: sc.id }); seek(frameAt(e.clientX)); }}>
                    <Filmstrip from={sc.from} duration={sc.duration} ppf={ppf} />
                    <span className="slabel" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{sc.label}</span>
                    <span className="dur">{(sc.duration / def.fps).toFixed(1)}s</span>
                    <div className="edge" onPointerDown={(e) => dragScene(e, sc.id, sc.duration)} title="Drag to trim" />
                  </div>
                );
              })}
            </div>
            {rows}
            {audio.rows}
            {marquee && <div className="marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />}
            <SnapLine ppf={ppf} />
            <Playhead ppf={ppf} tracksRef={tracksRef} />
          </div>
        </div>
      </div>
    </div>
  );
};
