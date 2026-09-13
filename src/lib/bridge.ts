// Browser side of the editor bridge: executes MCP tool calls against the live store (one undo step
// each) and reports back. Reconnects automatically.
import { registry } from "@project/sdk";
import { useStore, selectedOf } from "../state/store";
import { usePlayback } from "../state/playback";
import { playerRef, seek } from "./player";
import { saveToCode } from "./persist";
import { api } from "./api";
import { contextPayload } from "./claude";
import { soundClip, soundClipIds } from "./clips";
import { propsOf } from "./owners";

let ws: WebSocket | null = null;
let timer: number | undefined;

const state = () => {
  const s = useStore.getState(); const def = s.def!; const p = usePlayback.getState();
  const pending = s.pending();
  return {
    id: def.id, name: def.name, width: def.width, height: def.height, fps: def.fps, durationInFrames: s.duration(),
    scenes: s.scenes(), frame: playerRef.current?.getCurrentFrame() ?? p.frame, playing: p.playing,
    selection: s.selection, multi: s.multi, dirty: s.dirty(),
    pending: Object.fromEntries(Object.entries(pending).filter(([, v]) => typeof v === "object").map(([k, v]) => [k, Object.keys(v as object).length])),
    counts: { elements: s.allElements().length, sounds: s.scan.sounds.length, values: registry.getProps().length },
  };
};
const elements = () => {
  const s = useStore.getState(); const props = registry.getProps(); const ids = s.allElements().map((e) => e.id);
  return s.allElements().map((e) => {
    const t = s.transform(e.id);
    const own = propsOf(props, e.id, ids);
    return { id: e.id, label: e.label, kind: e.kind, sceneId: e.sceneId, first: e.first + t.delay, last: e.last + t.delay, transform: t, values: own.filter((p) => p.kind !== "anim").map((p) => p.id), animations: own.filter((p) => p.kind === "anim").map((p) => p.id), cloneOf: s.layout.elements[e.id]?.cloneOf };
  });
};
const sounds = () => soundClipIds().map((id) => { const c = soundClip(id)!; return { id: c.id, label: c.label, kind: c.kind, src: c.src, start: c.start, frames: c.frames, volume: c.volume, muted: c.muted, locked: c.locked, shift: c.shift, trimStart: c.trimStart, added: c.added }; });
const values = () => {
  const s = useStore.getState();
  return registry.getProps().map((p) => ({ id: p.id, kind: p.kind, owner: p.owner, meta: p.meta, default: p.value, value: p.kind === "text" ? (s.layout.copy[p.id] ?? p.value) : (s.layout.props[p.id] !== undefined ? (p.kind === "anim" && typeof s.layout.props[p.id] === "object" ? { ...(p.value as object), ...(s.layout.props[p.id] as object) } : s.layout.props[p.id]) : p.value) }));
};

const apply = async (action: string, args: any) => {
  const s = useStore.getState();
  const resolveSoundIds = (): string[] => {
    let ids: string[] = args.ids ?? soundClipIds();
    if (args.query) { const q = String(args.query).toLowerCase(); ids = ids.filter((id) => { const c = soundClip(id); return c && (c.id.toLowerCase().includes(q) || c.label.toLowerCase().includes(q) || c.src.toLowerCase().includes(q)); }); }
    if (args.kind) ids = ids.filter((id) => soundClip(id)?.kind === args.kind);
    return ids;
  };
  switch (action) {
    case "setCopy": s.setCopy(args.id, args.text); return { ok: true };
    case "setProp": s.setProp(args.id, args.value); return { ok: true };
    case "setProps": { s.begin(); useStore.setState({ layout: { ...s.layout, props: { ...s.layout.props, ...Object.fromEntries(args.changes.map((c: any) => [c.id, c.value])) } } }); s.end(); return { ok: true }; }
    case "updateElements": {
      let ids: string[] = args.ids ?? (args.scene ? s.allElements().filter((e) => e.sceneId === args.scene).map((e) => e.id) : []);
      ids = ids.filter((id) => !s.transform(id).locked);
      const { dx, dy, ...rest } = args.patch ?? {};
      const patches = Object.fromEntries(ids.map((id) => { const t = s.transform(id); const p: any = { ...rest }; if (dx) p.x = t.x + dx; if (dy) p.y = t.y + dy; return [id, p]; }));
      s.updateElements(patches); return { changed: ids };
    }
    case "setSounds": {
      const ids = resolveSoundIds().filter((id) => !(soundClip(id)?.locked));
      const { dshift, ...rest } = args.patch ?? {};
      const patches = Object.fromEntries(ids.map((id) => { const c = soundClip(id)!; const p: any = { ...rest }; if (dshift) { if (c.added) p.at = Math.max(0, c.natural + dshift); else p.shift = c.shift + dshift; } return [id, p]; }));
      s.setSounds(patches); return { changed: ids };
    }
    case "addSound": { const id = s.addSound({ src: args.src, at: args.at, volume: args.volume, kind: args.kind, label: args.label }); return { id }; }
    case "removeSound": { const c = soundClip(args.id); if (!c) throw new Error("Unknown sound " + args.id); if (c.added) s.removeSound(args.id); else s.setSound(args.id, { muted: true }); return { removed: c.added, muted: !c.added }; }
    case "setSceneDuration": s.setSceneDuration(args.id, args.frames); return { ok: true };
    case "select": { const ids: string[] = args.ids; if (args.type === "scene") s.select({ type: "scene", id: ids[0] }); else useStore.setState({ selection: ids.length ? { type: args.type, id: ids[0] } : null, multi: ids }); return { ok: true }; }
    case "seek": seek(args.frame); return { ok: true };
    case "play": playerRef.current?.play(); return { ok: true };
    case "pause": playerRef.current?.pause(); return { ok: true };
    case "undo": s.undo(); return { ok: true };
    case "redo": s.redo(); return { ok: true };
    default: throw new Error("Unknown action " + action);
  }
};

const handle = async (method: string, params: any) => {
  const s = useStore.getState();
  switch (method) {
    case "state": return state();
    case "elements": return elements();
    case "element": { const e = elements().find((x) => x.id === params.id); if (!e) throw new Error("Unknown element " + params.id); const v = values().filter((x) => e.values.includes(x.id) || e.animations.includes(x.id)); return { ...e, valueDetails: v }; }
    case "sounds": return sounds();
    case "values": return values();
    case "layout": return s.layout;
    case "context": return contextPayload();
    case "apply": return apply(params.action, params.args ?? {});
    case "save": {
      const before = s.pending();
      const n = Object.values(before).filter((v) => typeof v === "object").reduce((a, v: any) => a + Object.keys(v as object).length, 0);
      if (!n) return { saved: false, note: "nothing pending" };
      const r = await saveToCode(); // writes into the source, then the editor reloads
      return { saved: true, ...(r ?? {}) };
    }
    case "export": { const q: Record<string, number> = { best: 14, high: 17, balanced: 21, small: 26 }; const r = await api.render({ compositionId: s.def!.id, entryPoint: s.def!.entryPoint, inputProps: { layout: s.layout }, fileName: params.fileName ?? `${s.def!.name.replace(/[^\w.-]+/g, "-")}.mp4`, crf: q[params.quality ?? "high"] ?? 17 }); return r; }
    default: throw new Error("Unknown method " + method);
  }
};

export const connectBridge = () => {
  const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/bridge`;
  try { ws = new WebSocket(url); } catch { return; }
  ws.onmessage = async (ev) => {
    let msg: any; try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.event === "mcp") { useStore.getState().setToast(`Claude: ${msg.data?.summary ?? "change applied"}`); return; }
    if (msg.id === undefined) return;
    try { const result = await handle(msg.method, msg.params ?? {}); ws?.send(JSON.stringify({ id: msg.id, result })); }
    catch (e: any) { ws?.send(JSON.stringify({ id: msg.id, error: e.message ?? String(e) })); }
  };
  ws.onclose = () => { window.clearTimeout(timer); timer = window.setTimeout(connectBridge, 1500); };
  ws.onerror = () => ws?.close();
};
void selectedOf; // (re-exported helpers kept for future actions)
