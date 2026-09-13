import { useEffect } from "react";
import { useStore } from "../state/store";
import { playerRef, seek } from "./player";
import { saveToCode } from "./persist";
import { usePlayback } from "../state/playback";
import { registry } from "@project/sdk";

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
          if (sel) { e.preventDefault(); const hide = !s.transform(sel).hidden; s.updateElements(Object.fromEntries(s.selectedIds().map((id) => [id, { hidden: hide }]))); }
          else if (snd) { e.preventDefault(); const cur = s.layout.sounds[snd]?.muted ?? false; s.setSounds(Object.fromEntries(sndIds().map((id) => [id, { muted: !cur }]))); }
          break;
        case "ArrowLeft": case "ArrowRight": case "ArrowUp": case "ArrowDown": {
          e.preventDefault();
          const dir = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
          const vdir = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
          if (sel && !e.altKey) {
            s.updateElements(Object.fromEntries(s.selectedIds().map((id) => { const t = s.transform(id); return [id, { x: t.x + dir * big, y: t.y + vdir * big }]; })));
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
