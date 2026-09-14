import React, { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { Close, Copy, Check, ClaudeMark, Terminal as TerminalIcon } from "../lib/icons";
import { useEscape } from "../lib/useEscape";
import { api } from "../lib/api";
import { contextPayload, copyClaudePrompt } from "../lib/claude";

type Status = { url: string; editorConnected: boolean; claudeCli: string | null; claudeVersion: string | null; host: string };
type Launch = { state: "idle" | "launching" | "launched" | "no-cli" | "error"; message?: string; cmd?: string };

// Everything Claude in one place. Nothing happens until a button is pressed:
//   1. Connect the MCP (one command, once)      2. Open Terminal with Claude Code
//   — or — Copy prompt for a Claude that has no MCP (claude.ai, Desktop, another agent).
export const ClaudeDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [status, setStatus] = useState<Status | null>(null);
  const [launch, setLaunch] = useState<Launch>({ state: "idle" });
  const [copied, setCopied] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  useEscape(onClose);
  useEffect(() => { const t = () => fetch("/api/mcp/status").then((r) => r.json()).then(setStatus).catch(() => {}); t(); const i = setInterval(t, 2000); return () => clearInterval(i); }, []);

  const doLaunch = async () => {
    setLaunch({ state: "launching" });
    try {
      const r = await api.claudeOpen(contextPayload());
      if (r.ok) setLaunch({ state: "launched", cmd: r.cmd });
      else if (r.reason === "claude-not-found") setLaunch({ state: "no-cli" });
      else setLaunch({ state: "error", message: "Could not open Terminal" });
    } catch (e: any) { setLaunch({ state: "error", message: e.message }); }
  };
  const url = status?.url ?? `${location.origin}/mcp`;
  const addCmd = `claude mcp add --transport http insyd-studio ${url}`;
  const desktopCfg = JSON.stringify({ mcpServers: { "insyd-studio": { command: "npx", args: ["-y", "mcp-remote", url] } } }, null, 2);
  const installCmd = "npm install -g @anthropic-ai/claude-code";
  const copy = async (k: string, v: string) => { await navigator.clipboard.writeText(v).catch(() => {}); setCopied(k); setTimeout(() => setCopied(null), 1500); };
  const Snippet: React.FC<{ k: string; v: string }> = ({ k, v }) => (
    <div style={{ position: "relative" }}>
      <pre className="snippet">{v}</pre>
      <button className="btn icon sm" style={{ position: "absolute", top: 6, right: 6 }} onClick={() => copy(k, v)} title="Copy">{copied === k ? <Check /> : <Copy />}</button>
    </div>
  );
  const Dot: React.FC<{ ok: boolean | null }> = ({ ok }) => <span className="dot" style={{ display: "inline-block", marginRight: 8, background: ok === null ? "var(--ink-disabled)" : ok ? "var(--ok)" : "var(--danger)" }} />;
  const cli = status ? !!status.claudeCli : null;
  const Step: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
    <div className="step"><span className="step-n">{n}</span><div className="step-body"><div className="step-title">{title}</div>{children}</div></div>
  );

  return (
    <div className="modal-bg" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 600, maxHeight: "88vh", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: "var(--claude)", display: "inline-grid" }}><ClaudeMark /></span>Open in Claude Code</h2>
          <button className="btn ghost icon" onClick={onClose}><Close /></button>
        </div>
        <p>Claude edits this video live in the editor through Studio's MCP server — every change is one undo step here, and it can look at frames, save into the code and export. Two steps, nothing runs until you press a button.</p>

        <div className="checks" style={{ marginBottom: 16 }}>
          <div className="status-row"><span className="label">MCP server</span><span className="value"><Dot ok={!!status} />{url}</span></div>
          <div className="status-row"><span className="label">This editor</span><span className="value"><Dot ok={status ? status.editorConnected : null} />{status ? (status.editorConnected ? "connected — tool calls apply here" : "not connected (reload this page)") : "…"}</span></div>
          <div className="status-row"><span className="label">Claude Code CLI</span><span className="value" title={status?.claudeCli ?? undefined}><Dot ok={cli} />{status ? (status.claudeCli ? `${status.claudeVersion ?? "installed"} · ${status.claudeCli}` : "not found on PATH") : "…"}</span></div>
        </div>

        <Step n={1} title="Connect the MCP to Claude Code">
          <div className="hint">Run once in a terminal — Claude Code remembers it for this machine. Studio must be running when you use the tools.</div>
          <Snippet k="add" v={addCmd} />
          {cli === false && <>
            <div className="hint" style={{ paddingTop: 8 }}>Claude Code isn't installed yet:</div>
            <Snippet k="install" v={installCmd} />
          </>}
        </Step>

        <Step n={2} title="Open Terminal with Claude Code">
          <div className="hint">Opens Terminal in the project folder and starts <code>claude</code> with the Studio MCP attached for the session and a kickoff prompt. <code>CLAUDE.md</code> is refreshed with the full inventory first.</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
            <button className="btn primary" onClick={doLaunch} disabled={launch.state === "launching" || cli === false}><TerminalIcon /> {launch.state === "launching" ? "Opening…" : launch.state === "launched" ? "Open another Terminal" : "Open Terminal"}</button>
            {launch.state === "launched" && <span className="hint" style={{ padding: 0, color: "var(--ok)" }}>Terminal opened — ask Claude for changes; they show up here as it works.</span>}
            {launch.state === "error" && <span className="hint" style={{ padding: 0, color: "var(--danger)" }}>{launch.message}</span>}
            {launch.state === "no-cli" && <span className="hint" style={{ padding: 0, color: "var(--warn)" }}>Claude Code CLI not found — install it (step 1) and try again.</span>}
          </div>
          {launch.state === "launched" && launch.cmd && <div style={{ marginTop: 8 }}><div className="hint">What ran:</div><Snippet k="cmd" v={launch.cmd} /></div>}
        </Step>

        <div className="or"><span>or, without the MCP</span></div>

        <div className="step" style={{ paddingBottom: 0 }}>
          <span className="step-n" style={{ background: "transparent", border: "1px dashed var(--field-border)", color: "var(--ink-3)" }}>–</span>
          <div className="step-body">
            <div className="step-title">Copy prompt</div>
            <div className="hint">A self-contained prompt for any Claude — claude.ai, Claude Desktop, Cursor, another agent. It carries the full inventory and tells Claude to edit the source files; Studio reloads the preview live as files change (no undo here, so keep the project in git).</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <button className="btn" onClick={async () => { const r = await copyClaudePrompt(); if (r) { setCopied("prompt"); setTimeout(() => setCopied(null), 1500); } }}>{copied === "prompt" ? <Check /> : <Copy />} {copied === "prompt" ? "Copied" : "Copy prompt"}</button>
              <span className="hint" style={{ padding: 0 }}>Also refreshes <code>CLAUDE.md</code> in the project.</span>
            </div>
          </div>
        </div>

        <button className="btn ghost sm" style={{ marginTop: 16 }} onClick={() => setMore((m) => !m)}>{more ? "Hide" : "Show"} Claude Desktop setup &amp; tool list</button>
        {more && (
          <div style={{ marginTop: 8 }}>
            <div className="section" style={{ paddingLeft: 0 }}>Claude Desktop</div>
            <div className="hint">Settings → Developer → Edit Config, add this (uses <code>mcp-remote</code>, needs Node), restart Claude Desktop.</div>
            <Snippet k="desktop" v={desktopCfg} />
            <div className="section" style={{ paddingLeft: 0 }}>What Claude can do here</div>
            <div className="hint" style={{ lineHeight: 1.7 }}>
              <b>Read</b> get_project · list_scenes · list_elements · get_element · list_sounds · list_values · get_context · list_audio_files<br />
              <b>Change</b> set_text · set_value(s) · update_element(s) · set_sound(s) (bulk, e.g. every whoosh) · add_sound · remove_sound · set_scene_duration<br />
              <b>Steer</b> select · seek · play · pause · undo · redo &nbsp; <b>See</b> preview_frame (returns an image) &nbsp; <b>Finish</b> save (writes into the code) · export_video · export_status<br />
              Try: “set every whoosh to 10%”, “make the CTA headline bigger and the brand colour purple, then show me frame 1360”, “save”.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
