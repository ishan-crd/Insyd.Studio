import React, { useState } from "react";
import { useStore } from "../state/store";
import { saveToCode } from "../lib/persist";
import { Export, Redo, Undo, ClaudeMark, Copy, Keyboard, Sun, Moon, ChevronDown } from "../lib/icons";
import { copyClaudePrompt } from "../lib/claude";
import { ClaudeDialog } from "./ClaudeDialog";
import { ExportDialog } from "./ExportDialog";
import { useShortcuts } from "./ShortcutsModal";
import { useTheme } from "../lib/theme";

export const saveLayout = saveToCode;

export const Brand: React.FC = () => (
  <div className="brand" title="Studio by Insyd"><span className="name">Studio</span><span className="by">by Insyd</span></div>
);

export const TopBar: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const def = useStore((s) => s.def)!;
  const dirty = useStore((s) => s.dirty());
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const saving = useStore((s) => s.saving);
  const pendingCount = useStore((s) => Object.values(s.pending()).filter((v) => typeof v === "object").reduce((a, v: any) => a + Object.keys(v).length, 0));
  const theme = useTheme((s) => s.theme);
  const [exp, setExp] = useState(false);
  const [claude, setClaude] = useState(false);
  return (
    <div className="topbar">
      <Brand />
      <button className="project" onClick={onOpen} title="Open another project">
        <span className={`dot ${dirty ? "" : "saved"}`} title={dirty ? "Unsaved changes" : "All changes saved"} />
        <b>{def.name}</b>
        <span className="meta">{def.width}×{def.height} · {def.fps} fps</span>
        <ChevronDown />
      </button>
      <div className="hist">
        <button className="btn ghost icon" title="Undo (⌘Z)" disabled={!canUndo} onClick={() => useStore.getState().undo()}><Undo /></button>
        <button className="btn ghost icon" title="Redo (⇧⌘Z)" disabled={!canRedo} onClick={() => useStore.getState().redo()}><Redo /></button>
      </div>
      <div className="spacer" />
      <div className="split">
        <button className="btn" title="Connect Claude Code over MCP and open it in a Terminal — nothing runs until you press a button in the dialog" onClick={() => setClaude(true)}><ClaudeMark /> Open in Claude Code</button>
        <button className="btn icon" title="Copy prompt for any Claude (no MCP) — includes the full context and refreshes CLAUDE.md" onClick={copyClaudePrompt}><Copy /></button>
      </div>
      {claude && <ClaudeDialog onClose={() => setClaude(false)} />}
      <button className="btn icon" title="Keyboard shortcuts (?)" onClick={() => useShortcuts.getState().set(true)}><Keyboard /></button>
      <button className="btn icon" title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={() => useTheme.getState().toggle()}>{theme === "dark" ? <Sun /> : <Moon />}</button>
      <button className="btn" onClick={saveLayout} disabled={!dirty || saving} title="Write changes into the project's source files (⌘S)">{saving ? "Saving…" : "Save"}{pendingCount > 0 && !saving && <span className="count">{pendingCount}</span>}</button>
      <button className="btn primary" onClick={() => setExp(true)}><Export /> Export</button>
      {exp && <ExportDialog onClose={() => setExp(false)} />}
    </div>
  );
};
