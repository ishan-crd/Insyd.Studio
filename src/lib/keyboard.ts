import { useEffect } from "react";
import { useStore } from "../state/store";
import { playerRef, seek } from "./player";
import { saveToCode } from "./persist";
import { usePlayback } from "../state/playback";
import { registry } from "@project/sdk";
import { copySounds, cutSounds, pasteSounds, duplicateSounds, splitSounds, deleteSounds, setSoundsLocked, soundClip, isSoundLocked, copyElements, cutElements, pasteClipboard, duplicateElements, splitElements, deleteElements, setElementsLocked, isElementLocked } from "./clips";

const typing = () => {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
};

export const useKeyboard = () => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      if (!s.def) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "s") { e.preventDefault(); saveToCode(); return; }
      if (meta && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? s.redo() : s.undo(); return; }
      if (typing()) return;
      const p = playerRef.current;
      const soundSel = s.selection?.type === "sound";
      if (meta && soundSel) {
        const k = e.key.toLowerCase();
        if (k === "c") { e.preventDefault(); copySounds(); return; }
        if (k === "x") { e.preventDefault(); cutSounds(); return; }
        if (k === "d") { e.preventDefault(); duplicateSounds(); return; }
        if (k === "k") { e.preventDefault(); splitSounds(); return; }
        if (k === "l") { e.preventDefault(); const ids = s.selectedIds(); const all = ids.every((id) => isSoundLocked(id)); setSoundsLocked(ids, !all); return; }
      }
      const elSel = s.selection?.type === "element";
      if (meta && elSel) {
        const k = e.key.toLowerCase();
        if (k === "c") { e.preventDefault(); copyElements(); return; }
        if (k === "x") { e.preventDefault(); cutElements(); return; }
        if (k === "d") { e.preventDefault(); duplicateElements(); return; }
        if (k === "k") { e.preventDefault(); splitElements(); return; }
        if (k === "l") { e.preventDefault(); const ids = s.selectedIds(); setElementsLocked(ids, !ids.every(isElementLocked)); return; }
      }
      if (elSel && !meta && (e.key === "h" || e.key === "H")) { e.preventDefault(); const ids = s.selectedIds().filter((id) => !isElementLocked(id)); const hide = !s.transform(ids[0] ?? s.selectedIds()[0]).hidden; s.updateElements(Object.fromEntries(ids.map((id) => [id, { hidden: hide }]))); return; }
      if (meta && e.key.toLowerCase() === "v") { e.preventDefault(); pasteClipboard(); return; }
      if (soundSel && !meta && (e.key === "m" || e.key === "M")) { e.preventDefault(); const sid = (s.selection as { id: string }).id; const cur = s.layout.sounds[sid]?.muted ?? soundClip(sid)?.muted ?? false; s.setSounds(Object.fromEntries(s.selectedIds().map((id) => [id, { muted: !cur }]))); return; }
      const sel = s.selection?.type === "element" ? s.selection.id : null;
      const snd = s.selection?.type === "sound" ? s.selection.id : null;
      const sndIds = () => (s.multi.length ? s.multi : snd ? [snd] : []);
      const big = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case " ": e.preventDefault(); p?.toggle(); break;
        case "Escape": s.select(null); break;
        case "Home": seek(0); break;
        case "End": seek(s.duration() - 1); break;
        case "b": case "B": if (!meta) s.select({ type: "brand" }); break;
        case "Backspace": case "Delete":
          if (sel) { e.preventDefault(); deleteElements(s.selectedIds()); }
          else if (snd) { e.preventDefault(); deleteSounds(sndIds()); }
          break;
        case "ArrowLeft": case "ArrowRight": case "ArrowUp": case "ArrowDown": {
          e.preventDefault();
          const dir = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
          const vdir = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
          if (sel && !e.altKey) {
            s.updateElements(Object.fromEntries(s.selectedIds().filter((id) => !isElementLocked(id)).map((id) => { const t = s.transform(id); return [id, { x: t.x + dir * big, y: t.y + vdir * big }]; })));
          } else if (snd && !e.altKey && dir !== 0) {
            s.setSounds(Object.fromEntries(sndIds().map((id) => { const o = s.layout.sounds[id] ?? {}; const live = registry.getSounds("main").find((x) => x.id === id); return [id, o.added ? { at: Math.max(0, (o.at ?? 0) + dir * big) } : { shift: (o.shift ?? live?.shift ?? 0) + dir * big }]; })));
          } else if (dir !== 0) {
            seek(usePlayback.getState().frame + dir * big);
          }
          break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
};
