import { registry } from "@project/sdk";
import { useStore, sceneAt, type ScanElement, type ScanSound } from "../state/store";
import { nextFrames, scanPlayerRef } from "./player";

const cacheKey = () => { const d = useStore.getState().def!; return `insyd:scan9:${d.id}:${JSON.stringify(d.scenes)}:${__INSYD_PROJECT__}`; };
let running = false;
let inventoryChanged = false;
/** Called with the code index; if the set of editable ids changed since the last scan, the cache is stale. */
export const noteInventory = (locatorKeys: string[]) => {
  const key = `insyd:inventory:${__INSYD_PROJECT__}`;
  const h = String(locatorKeys.length) + ":" + locatorKeys.slice().sort().join("|").split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  let prev: string | null = null;
  try { prev = localStorage.getItem(key); localStorage.setItem(key, h); } catch {}
  if (prev !== null && prev !== h) { inventoryChanged = true; const st = useStore.getState(); if (st.scan.status === "done") void scanProject(3, true); }
};

// Steps a *hidden* second Player through the composition and records when each Editable is on
// screen — the visible player is never paused or seeked, so playback stays fully usable.
// Elements are stored at their natural time (effective shift removed) so clips move as the user re-times them.
export const scanProject = async (step = 3, force = false) => {
  const s = useStore.getState();
  const player = scanPlayerRef.current;
  if (!player || !s.def || running) return;
  if (!force && !inventoryChanged) {
    try { const cached = localStorage.getItem(cacheKey()); if (cached) { const c = JSON.parse(cached); if (c.elements && c.sounds) { s.setScan({ status: "done", progress: 1, elements: c.elements, sounds: c.sounds }); return; } } } catch {}
  }
  // A scan processed for exactly this source (shipped with a template, or saved by an earlier session)
  if (!force) {
    const r = await fetch("/api/project/scan").then((x) => x.json()).catch(() => null);
    if (r?.scan?.elements && r.scan.sounds) {
      s.setScan({ status: "done", progress: 1, elements: r.scan.elements, sounds: r.scan.sounds });
      try { localStorage.setItem(cacheKey(), JSON.stringify(r.scan)); } catch {}
      return;
    }
  }
  inventoryChanged = false;
  running = true;
  s.setScan({ status: "running", progress: 0 });
  try {
    const duration = s.duration();
    const scenes = s.scenes();
    const found = new Map<string, ScanElement>();
    const trims = new Map<string, number>();
    const delays = new Map<string, number>();
    const sounds = new Map<string, ScanSound>();
    for (let f = 0; f < duration; f += step) {
      player.seekTo(f);
      await nextFrames(2);
      for (let i = 0; i < 20 && player.getCurrentFrame() !== f; i++) await nextFrames(1);
      for (const e of registry.getElements("scan")) {
        const nat = f - (e.transform.delay || 0);
        trims.set(e.id, e.transform.trimIn || 0);
        delays.set(e.id, e.transform.delay || 0);
        const cur = found.get(e.id);
        if (cur) { cur.first = Math.min(cur.first, nat); cur.last = Math.max(cur.last, nat + step - 1); }
        else found.set(e.id, { id: e.id, label: e.label, kind: e.kind, first: nat, last: nat + step - 1, sceneId: sceneAt(scenes, Math.max(0, nat))?.id ?? "" });
      }
      for (const so of registry.getSounds("scan")) {
        if (!sounds.has(so.id)) sounds.set(so.id, { id: so.id, label: so.label, kind: so.kind, natural: so.absStart - so.shift, repeat: so.repeat, every: so.every, defaults: so.defaults, added: so.added });
      }
      if (f % (step * 10) === 0) useStore.getState().setScan({ progress: f / duration });
    }
    // Refine first/last to the exact frame (the coarse pass quantizes to `step`).
    // wait until the hidden player has actually rendered frame f before reading the registry
    const settle = async (f: number) => { player.seekTo(f); for (let i = 0; i < 20 && player.getCurrentFrame() !== f; i++) await nextFrames(1); await nextFrames(2); };
    const present = async (f: number, id: string) => { await settle(f); return registry.getElements("scan").some((e) => e.id === id); };
    // first/last are natural frames (delay removed); presence is checked at the real frame (+ delay).
    for (const e of found.values()) {
      const dl = delays.get(e.id) ?? 0;
      for (let d = 1; d < step; d++) { const f = e.first - 1; if (f + dl < 0 || !(await present(f + dl, e.id))) break; e.first = f; }
      let last = Math.min(e.last, duration - 1 - dl);
      while (last > e.first && !(await present(last + dl, e.id))) last--;
      e.last = last;
      // An element trimmed in the code (trimIn) is first seen trimIn frames after its natural start;
      // store the natural start so the timeline's first + delay + trimIn lands on the right frame.
      const tr = trims.get(e.id) ?? 0;
      e.first -= tr;
    }
    const elements = Array.from(found.values()).sort((a, b) => a.first - b.first || a.id.localeCompare(b.id));
    const soundList = Array.from(sounds.values()).sort((a, b) => a.natural - b.natural || a.id.localeCompare(b.id));
    useStore.getState().setScan({ status: "done", progress: 1, elements, sounds: soundList });
    try { localStorage.setItem(cacheKey(), JSON.stringify({ elements, sounds: soundList })); } catch {}
    // keep it with the project (.studio/scan.json) so the next session — or a copy — skips the analysis
    fetch("/api/project/scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ elements, sounds: soundList }) }).catch(() => {});
  } finally {
    running = false;
  }
};
