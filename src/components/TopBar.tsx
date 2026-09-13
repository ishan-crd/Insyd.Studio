import React, { useState } from "react";
import { useStore } from "../state/store";
import { saveToCode } from "../lib/persist";
import { scanProject } from "../lib/scan";
import { Export, Folder, Help, Logo, Redo, Refresh, Save, Undo, Wordmark } from "../lib/icons";
import { ExportDialog } from "./ExportDialog";

export const saveLayout = saveToCode;

export const TopBar: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const def = useStore((s) => s.def)!;
  const dirty = useStore((s) => s.dirty());
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const scan = useStore((s) => s.scan);
  const saving = useStore((s) => s.saving);
  const pendingCount = useStore((s) => Object.values(s.pending()).filter((v) => typeof v === "object").reduce((a, v: any) => a + Object.keys(v).length, 0));
  const [exp, setExp] = useState(false);
  const [help, setHelp] = useState(false);
  return (
    <div className="topbar">
      <div className="brand" title="Studio by Insyd"><span className="mark"><Logo /></span><Wordmark /></div>
      <div className="project"><span className={`dot ${dirty ? "" : "saved"}`} /><b>{def.name}</b><span>·</span><span>{def.width}×{def.height} · {def.fps} fps</span></div>
      <button className="btn ghost sm" onClick={onOpen}><Folder /> Open…</button>
      <div className="sep" />
      <button className="btn ghost icon" title="Undo (⌘Z)" disabled={!canUndo} onClick={() => useStore.getState().undo()}><Undo /></button>
      <button className="btn ghost icon" title="Redo (⇧⌘Z)" disabled={!canRedo} onClick={() => useStore.getState().redo()}><Redo /></button>
      <div className="sep" />
      <button className="btn ghost sm" title="Re-analyze which elements appear when" onClick={() => scanProject(3, true)} disabled={scan.status === "running"}>
        <Refresh /> {scan.status === "running" ? `Analyzing ${Math.round(scan.progress * 100)}%` : "Rescan"}
      </button>
      <div className="spacer" />
      <button className="btn ghost icon" title="Shortcuts" onClick={() => setHelp((h) => !h)}><Help /></button>
      <button className="btn" onClick={saveLayout} disabled={!dirty || saving} title="Write changes into the project's source files"><Save /> {saving ? "Saving…" : `Save${pendingCount ? ` ${pendingCount}` : ""}`} <span className="kbd">⌘S</span></button>
      <button className="btn primary" onClick={() => setExp(true)}><Export /> Export</button>
      {exp && <ExportDialog onClose={() => setExp(false)} />}
      {help && (
        <div className="help" onMouseLeave={() => setHelp(false)}>
          <h4>Shortcuts</h4>
          <div><span>Play / pause</span><span className="kbd">Space</span></div>
          <div><span>Step frame</span><span><span className="kbd">←</span><span className="kbd">→</span></span></div>
          <div><span>Step 10 frames</span><span><span className="kbd">⇧</span>+<span className="kbd">←→</span></span></div>
          <div><span>Nudge selected element</span><span><span className="kbd">←↑↓→</span> (<span className="kbd">⇧</span> = 10px)</span></div>
          <div><span>Step frames while selected</span><span><span className="kbd">⌥</span>+<span className="kbd">←→</span></span></div>
          <div><span>Start / end</span><span><span className="kbd">Home</span><span className="kbd">End</span></span></div>
          <div><span>Hide selected</span><span className="kbd">⌫</span></div>
          <div><span>Deselect</span><span className="kbd">Esc</span></div>
          <div><span>Undo / redo</span><span><span className="kbd">⌘Z</span><span className="kbd">⇧⌘Z</span></span></div>
          <div><span>Save (writes to source files)</span><span className="kbd">⌘S</span></div>
          <div><span>Constrain drag to axis</span><span className="kbd">⇧ drag</span></div>
        </div>
      )}
    </div>
  );
};
