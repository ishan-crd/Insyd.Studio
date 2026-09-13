import { useEffect } from "react";
/** Close a dialog on Escape (capture phase, so global shortcuts don't also fire). */
export const useEscape = (onClose: () => void, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, enabled]);
};
