import React, { useState } from "react";
import { useStore } from "../state/store";
import { saveToCode } from "../lib/persist";
import { scanProject } from "../lib/scan";
import { Export, Folder, Help, Logo, Redo, Refresh, Save, Undo, Wordmark, ClaudeMark, Copy } from "../lib/icons";
import { copyClaudeContext } from "../lib/claude";
import { ClaudeDialog } from "./ClaudeDialog";
import { Plug } from "../lib/icons";
import { ExportDialog } from "./ExportDialog";
import { useShortcuts } from "./ShortcutsModal";

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
  const [claude, setClaude] = useState<null | { autoLaunch: boolean }>(null);
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
      <div className="split">
        <button className="btn" title="Open Terminal here and start Claude Code connected to Studio (MCP + full context). Its edits appear live." onClick={() => setClaude({ autoLaunch: true })}><ClaudeMark /> Open in Claude Code</button>
        <button className="btn icon" title="Copy the same context to the clipboard (and write it to CLAUDE.md)" onClick={copyClaudeContext}><Copy /></button>
        <button className="btn icon" title="Connect Claude Desktop / Claude Code over MCP" onClick={() => setClaude({ autoLaunch: false })}><Plug /></button>
      </div>
      {claude && <ClaudeDialog autoLaunch={claude.autoLaunch} onClose={() => setClaude(null)} />}
      <button className="btn ghost icon" title="Keyboard shortcuts (?)" onClick={() => useShortcuts.getState().set(true)}><Help /></button>
      <button className="btn" onClick={saveLayout} disabled={!dirty || saving} title="Write changes into the project's source files"><Save /> {saving ? "Saving…" : `Save${pendingCount ? ` ${pendingCount}` : ""}`} <span className="kbd">⌘S</span></button>
      <button className="btn primary" onClick={() => setExp(true)}><Export /> Export</button>
      {exp && <ExportDialog onClose={() => setExp(false)} />}
    </div>
  );
};
