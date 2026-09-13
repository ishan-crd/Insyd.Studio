import { useEffect } from "react";
import { useStore } from "../state/store";
import { playerRef, seek } from "./player";
import { saveToCode } from "./persist";
import { usePlayback } from "../state/playback";

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
      const big = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case " ": e.preventDefault(); p?.toggle(); break;
        case "Escape": s.select(null); break;
        case "Home": seek(0); break;
        case "End": seek(s.duration() - 1); break;
        case "b": case "B": if (!meta) s.select({ type: "brand" }); break;
        case "Backspace": case "Delete":
          if (sel) { e.preventDefault(); s.updateElement(sel, { hidden: !s.transform(sel).hidden }); }
          break;
        case "ArrowLeft": case "ArrowRight": case "ArrowUp": case "ArrowDown": {
          e.preventDefault();
          const dir = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
          const vdir = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
          if (sel && !e.altKey) {
            const t = s.transform(sel);
            s.updateElement(sel, { x: t.x + dir * big, y: t.y + vdir * big });
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
