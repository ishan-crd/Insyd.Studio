import React, { useEffect } from "react";
import { create } from "zustand";
import { Close } from "../lib/icons";

export const useShortcuts = create<{ open: boolean; set: (o: boolean) => void }>((set) => ({ open: false, set: (open) => set({ open }) }));

const K: React.FC<{ k: string }> = ({ k }) => <span className="kbd">{k}</span>;
const Row: React.FC<{ label: string; keys: string[] }> = ({ label, keys }) => (
  <div className="sc-row"><span>{label}</span><span className="sc-keys">{keys.map((k, i) => <K key={i} k={k} />)}</span></div>
);

const GROUPS: Array<{ title: string; rows: Array<[string, string[]]> }> = [
  { title: "Playback", rows: [["Play / pause", ["Space"]], ["Step one frame", ["←", "→"]], ["Step 10 frames", ["⇧ ←", "⇧ →"]], ["Step frames while an element is selected", ["⌥ ←", "⌥ →"]], ["Start / end", ["Home", "End"]]] },
  { title: "Selection", rows: [["Select (canvas, timeline, library)", ["click"]], ["Add to / toggle selection", ["⇧ click", "⌘ click"]], ["Box-select clips", ["drag empty timeline space"]], ["Select all (elements, or sounds if a sound is selected)", ["⌘ A"]], ["Deselect", ["Esc", "click empty space"]], ["Brand tokens", ["B"]]] },
  { title: "Editing", rows: [["Nudge selection (10px with ⇧)", ["←↑↓→"]], ["Cut / copy / paste at playhead", ["⌘ X", "⌘ C", "⌘ V"]], ["Duplicate (elements: linked copy)", ["⌘ D"]], ["Split at playhead", ["⌘ K"]], ["Lock / unlock", ["⌘ L"]], ["Hide / show element", ["H"]], ["Mute / unmute sound", ["M"]], ["Delete (code items: hide / mute)", ["⌫"]], ["Undo / redo", ["⌘ Z", "⇧ ⌘ Z"]], ["Constrain drag to an axis", ["⇧ drag"]], ["Trim a clip", ["drag its edge"]], ["Re-time an entrance", ["drag the bright bar in a clip"]]] },
  { title: "Timeline & view", rows: [["Zoom timeline in / out", ["⌘ +", "⌘ −"]], ["Fit timeline", ["⌘ 0"]], ["Scrub", ["drag the ruler"]], ["Trim a scene", ["drag its right edge"]], ["Context menu", ["right-click a clip or element"]], ["Resize the timeline", ["drag its top edge"]]] },
  { title: "Project", rows: [["Save into the source files", ["⌘ S"]], ["This list", ["?"]]] },
];

export const ShortcutsModal: React.FC = () => {
  const open = useShortcuts((s) => s.open);
  const set = useShortcuts((s) => s.set);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); set(false); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, set]);
  if (!open) return null;
  return (
    <div className="modal-bg" onPointerDown={(e) => { if (e.target === e.currentTarget) set(false); }}>
      <div className="modal" style={{ width: 720, maxHeight: "84vh", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><h2>Keyboard shortcuts</h2><button className="btn ghost icon" onClick={() => set(false)}><Close /></button></div>
        <p>Studio follows the conventions of desktop video editors. Shortcuts act on the current selection.</p>
        <div className="sc-grid">
          {GROUPS.map((g) => <div key={g.title} className="sc-group"><h4>{g.title}</h4>{g.rows.map(([l, k]) => <Row key={l} label={l} keys={k} />)}</div>)}
        </div>
      </div>
    </div>
  );
};
