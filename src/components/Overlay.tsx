import React, { useEffect, useRef, useState } from "react";
import { registry, useElements, type Rect } from "@project/sdk";
import { useStore } from "../state/store";
import { usePlayback } from "../state/playback";
import { round } from "../lib/format";

const SNAP = 8; // composition px
type Drag =
  | { kind: "move"; id: string; sx: number; sy: number; ox: number; oy: number; cx: number; cy: number }
  | { kind: "scale"; id: string; cx: number; cy: number; d0: number; s0: number };

// Selection/hover boxes over the Player. Hit-testing uses the DOM (elementsFromPoint), and only the
// hovered + selected elements are measured — on every frame while playing, cheaply.
export const Overlay: React.FC<{ scale: number }> = ({ scale }) => {
  const elements = useElements();
  const def = useStore((s) => s.def)!;
  const selection = useStore((s) => s.selection);
  const hover = useStore((s) => s.hover);
  const layout = useStore((s) => s.layout);
  const frame = usePlayback((s) => s.frame);
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const [drag, setDrag] = useState<Drag | null>(null);
  const [guides, setGuides] = useState<{ v?: boolean; h?: boolean }>({});
  const dragRef = useRef<Drag | null>(null);
  const overlayEl = useRef<HTMLDivElement>(null);
  const store = useStore.getState;
  const selId = selection?.type === "element" ? selection.id : null;

  // measure hovered/selected after every paint-relevant change
  useEffect(() => {
    const ids = [selId, hover].filter(Boolean) as string[];
    const next: Record<string, Rect> = {};
    for (const id of ids) { const r = registry.measureId(id); if (r) next[id] = r; }
    setRects(next);
  }, [selId, hover, frame, layout, elements, scale]);

  const origin = () => overlayEl.current!.getBoundingClientRect();
  const startMove = (e: React.PointerEvent, id: string) => {
    const r = registry.measureId(id); if (!r) return;
    store().select({ type: "element", id }); store().begin();
    const t = store().transform(id);
    const d: Drag = { kind: "move", id, sx: e.clientX, sy: e.clientY, ox: t.x, oy: t.y, cx: r.x + r.w / 2, cy: r.y + r.h / 2 };
    dragRef.current = d; setDrag(d);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const startScale = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const r = registry.measureId(id); if (!r) return;
    store().begin();
    const t = store().transform(id);
    const o = origin();
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const px = (e.clientX - o.left) / scale, py = (e.clientY - o.top) / scale;
    const d: Drag = { kind: "scale", id, cx, cy, d0: Math.max(4, Math.hypot(px - cx, py - cy)), s0: t.scale };
    dragRef.current = d; setDrag(d);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).classList.contains("handle")) return;
    const id = registry.hitTest(e.clientX, e.clientY);
    if (id) startMove(e, id); else store().select(null);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) { store().setHover(registry.hitTest(e.clientX, e.clientY)); return; }
    if (d.kind === "move") {
      let dx = (e.clientX - d.sx) / scale, dy = (e.clientY - d.sy) / scale;
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      let nx = d.ox + dx, ny = d.oy + dy;
      const ccx = d.cx + (nx - d.ox), ccy = d.cy + (ny - d.oy);
      const g: { v?: boolean; h?: boolean } = {};
      if (Math.abs(ccx - def.width / 2) < SNAP) { nx += def.width / 2 - ccx; g.v = true; }
      if (Math.abs(ccy - def.height / 2) < SNAP) { ny += def.height / 2 - ccy; g.h = true; }
      setGuides(g);
      store().updateElement(d.id, { x: round(nx, 1), y: round(ny, 1) }, false);
    } else {
      const o = origin();
      const px = (e.clientX - o.left) / scale, py = (e.clientY - o.top) / scale;
      store().updateElement(d.id, { scale: round(Math.max(0.05, d.s0 * (Math.hypot(px - d.cx, py - d.cy) / d.d0)), 3) }, false);
    }
  };
  const onUp = () => { if (!dragRef.current) return; dragRef.current = null; setDrag(null); setGuides({}); store().end(); };

  const boxes = [selId, hover !== selId ? hover : null].filter(Boolean) as string[];
  return (
    <div ref={overlayEl} className="overlay" style={{ cursor: drag ? "grabbing" : hover ? "grab" : "default" }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={() => !dragRef.current && store().setHover(null)}
      onDoubleClick={(e) => { const id = registry.hitTest(e.clientX, e.clientY); const en = id && registry.getElement(id); if (en && en.kind === "text") document.getElementById("insp-text")?.focus(); }}>
      {guides.v && <div className="guide v" style={{ left: (def.width / 2) * scale }} />}
      {guides.h && <div className="guide h" style={{ top: (def.height / 2) * scale }} />}
      {boxes.map((id) => {
        const r = rects[id]; const en = registry.getElement(id);
        if (!r || !en) return null;
        const sel = id === selId;
        const t = store().transform(id);
        return (
          <div key={id} className={`box ${sel ? "selected" : "hover"} ${t.hidden ? "hidden-el" : ""}`} style={{ left: r.x * scale, top: r.y * scale, width: r.w * scale, height: r.h * scale, pointerEvents: "none" }}>
            <div className="tag">{en.label}<span className="k">{t.scale !== 1 ? `×${t.scale.toFixed(2)}` : `${Math.round(r.w)}×${Math.round(r.h)}`}</span></div>
            {sel && ["nw", "ne", "sw", "se"].map((c) => <div key={c} className={`handle ${c}`} style={{ pointerEvents: "auto" }} onPointerDown={(e) => startScale(e, id)} />)}
          </div>
        );
      })}
    </div>
  );
};
