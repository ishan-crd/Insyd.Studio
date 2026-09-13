import { registry } from "@project/sdk";
import { useStore, sceneAt, type ScanElement, type ScanSound } from "../state/store";
import { nextFrames, scanPlayerRef } from "./player";

const cacheKey = () => { const d = useStore.getState().def!; return `insyd:scan4:${d.id}:${JSON.stringify(d.scenes)}:${__INSYD_PROJECT__}`; };
let running = false;

// Steps a *hidden* second Player through the composition and records when each Editable is on
// screen — the visible player is never paused or seeked, so playback stays fully usable.
// Elements are stored at their natural time (effective shift removed) so clips move as the user re-times them.
export const scanProject = async (step = 3, force = false) => {
  const s = useStore.getState();
  const player = scanPlayerRef.current;
  if (!player || !s.def || running) return;
  if (!force) {
    try { const cached = localStorage.getItem(cacheKey()); if (cached) { const c = JSON.parse(cached); if (c.elements && c.sounds) { s.setScan({ status: "done", progress: 1, elements: c.elements, sounds: c.sounds }); return; } } } catch {}
  }
  running = true;
  s.setScan({ status: "running", progress: 0 });
  try {
    const duration = s.duration();
    const scenes = s.scenes();
    const found = new Map<string, ScanElement>();
    const sounds = new Map<string, ScanSound>();
    for (let f = 0; f < duration; f += step) {
      player.seekTo(f);
      await nextFrames(2);
      for (const e of registry.getElements("scan")) {
        const nat = f - (e.transform.delay || 0);
        const cur = found.get(e.id);
        if (cur) { cur.first = Math.min(cur.first, nat); cur.last = Math.max(cur.last, nat + step - 1); }
        else found.set(e.id, { id: e.id, label: e.label, kind: e.kind, first: nat, last: nat + step - 1, sceneId: sceneAt(scenes, Math.max(0, nat))?.id ?? "" });
      }
      for (const so of registry.getSounds("scan")) {
        if (!sounds.has(so.id)) sounds.set(so.id, { id: so.id, label: so.label, kind: so.kind, natural: so.absStart - so.shift, repeat: so.repeat, every: so.every, defaults: so.defaults, added: so.added });
      }
      if (f % (step * 10) === 0) useStore.getState().setScan({ progress: f / duration });
    }
    const elements = Array.from(found.values()).map((e) => ({ ...e, last: Math.min(e.last, duration - 1) })).sort((a, b) => a.first - b.first || a.id.localeCompare(b.id));
    const soundList = Array.from(sounds.values()).sort((a, b) => a.natural - b.natural || a.id.localeCompare(b.id));
    useStore.getState().setScan({ status: "done", progress: 1, elements, sounds: soundList });
    try { localStorage.setItem(cacheKey(), JSON.stringify({ elements, sounds: soundList })); } catch {}
  } finally {
    running = false;
  }
};
