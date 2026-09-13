import React, { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { Close, Copy, Check } from "../lib/icons";

// How to attach Claude (Desktop or Code) to the running Studio over MCP.
export const ConnectClaude: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [status, setStatus] = useState<{ url: string; editorConnected: boolean } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => { const t = () => fetch("/api/mcp/status").then((r) => r.json()).then(setStatus).catch(() => {}); t(); const i = setInterval(t, 2000); return () => clearInterval(i); }, []);
  const url = status?.url ?? `${location.origin}/mcp`;
  const codeCmd = `claude mcp add --transport http insyd-studio ${url}`;
  const desktopCfg = JSON.stringify({ mcpServers: { "insyd-studio": { command: "npx", args: ["-y", "mcp-remote", url] } } }, null, 2);
  const copy = async (k: string, v: string) => { await navigator.clipboard.writeText(v).catch(() => {}); setCopied(k); setTimeout(() => setCopied(null), 1500); useStore.getState().setToast("Copied"); };
  const Snippet: React.FC<{ k: string; v: string; mono?: boolean }> = ({ k, v }) => (
    <div style={{ position: "relative" }}>
      <pre className="snippet">{v}</pre>
      <button className="btn icon sm" style={{ position: "absolute", top: 6, right: 6 }} onClick={() => copy(k, v)} title="Copy">{copied === k ? <Check /> : <Copy />}</button>
    </div>
  );
  return (
    <div className="modal-bg" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 640 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><h2>Connect Claude</h2><button className="btn ghost icon" onClick={onClose}><Close /></button></div>
        <p>Studio runs an <b>MCP server</b>. Any Claude that connects to it can read every scene, element, sound and editable value and change them — live in this editor, undoable, with <code>save</code>, <code>export_video</code> and <code>preview_frame</code> tools.</p>
        <div className="field" style={{ gridTemplateColumns: "110px 1fr" }}><label>Server</label><div className="id" style={{ color: "var(--text)" }}>{url}</div></div>
        <div className="field" style={{ gridTemplateColumns: "110px 1fr" }}><label>This editor</label><div><span className={`dot ${status?.editorConnected ? "saved" : ""}`} style={{ display: "inline-block", marginRight: 8 }} />{status ? (status.editorConnected ? "connected — tool calls apply here" : "not connected (reload the page)") : "…"}</div></div>
        <div className="section">Claude Code</div>
        <div className="hint" style={{ padding: "0 6px 6px" }}><b>Open in Claude Code</b> already attaches it for that session. To keep it permanently for this project, run once in the project folder:</div>
        <Snippet k="code" v={codeCmd} />
        <div className="section">Claude Desktop</div>
        <div className="hint" style={{ padding: "0 6px 6px" }}>Settings → Developer → Edit Config, add (needs Node; uses <code>mcp-remote</code> to reach the local server), then restart Claude Desktop. Keep Studio running while you use it.</div>
        <Snippet k="desktop" v={desktopCfg} />
        <div className="hint" style={{ padding: "8px 6px 0" }}>Try: “list the sounds”, “set every whoosh to 10%”, “move the Figma phone 40px left and show me the frame”, “save”.</div>
      </div>
    </div>
  );
};
