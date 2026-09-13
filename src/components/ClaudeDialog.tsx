import React, { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { Close, Copy, Check, ClaudeMark, Terminal as TerminalIcon } from "../lib/icons";
import { useEscape } from "../lib/useEscape";
import { api } from "../lib/api";
import { contextPayload } from "../lib/claude";

type Status = { url: string; editorConnected: boolean; claudeCli: string | null; claudeVersion: string | null; host: string };
type Launch = { state: "idle" | "launching" | "launched" | "no-cli" | "error"; message?: string };

// One place for everything Claude: launch Claude Code from here, or connect Claude Desktop / Claude Code
// permanently over MCP. Opened by the top-bar button (which also launches) and by the plug icon.
export const ClaudeDialog: React.FC<{ onClose: () => void; autoLaunch?: boolean }> = ({ onClose, autoLaunch }) => {
  const [status, setStatus] = useState<Status | null>(null);
  const [launch, setLaunch] = useState<Launch>({ state: "idle" });
  const [copied, setCopied] = useState<string | null>(null);
  useEscape(onClose);
  useEffect(() => { const t = () => fetch("/api/mcp/status").then((r) => r.json()).then(setStatus).catch(() => {}); t(); const i = setInterval(t, 2000); return () => clearInterval(i); }, []);
  const doLaunch = async () => {
    setLaunch({ state: "launching" });
    try {
      const r = await api.claudeOpen(contextPayload());
      if (r.ok) setLaunch({ state: "launched" });
      else if (r.reason === "claude-not-found") { await navigator.clipboard.writeText(r.brief).catch(() => {}); setLaunch({ state: "no-cli" }); }
      else setLaunch({ state: "error", message: "Could not open Terminal" });
    } catch (e: any) { setLaunch({ state: "error", message: e.message }); }
  };
  useEffect(() => { if (autoLaunch) void doLaunch(); }, []);
  const url = status?.url ?? `${location.origin}/mcp`;
  const codeCmd = `claude mcp add --transport http insyd-studio ${url}`;
  const desktopCfg = JSON.stringify({ mcpServers: { "insyd-studio": { command: "npx", args: ["-y", "mcp-remote", url] } } }, null, 2);
  const installCmd = "npm install -g @anthropic-ai/claude-code";
  const copy = async (k: string, v: string) => { await navigator.clipboard.writeText(v).catch(() => {}); setCopied(k); setTimeout(() => setCopied(null), 1500); useStore.getState().setToast("Copied"); };
  const Snippet: React.FC<{ k: string; v: string }> = ({ k, v }) => (
    <div style={{ position: "relative" }}>
      <pre className="snippet">{v}</pre>
      <button className="btn icon sm" style={{ position: "absolute", top: 6, right: 6 }} onClick={() => copy(k, v)} title="Copy">{copied === k ? <Check /> : <Copy />}</button>
    </div>
  );
  const Dot: React.FC<{ ok: boolean | null }> = ({ ok }) => <span className={`dot ${ok ? "saved" : ""}`} style={{ display: "inline-block", marginRight: 8, background: ok === null ? "var(--ink-disabled)" : ok ? undefined : "var(--danger)" }} />;
  const cli = status ? (status.claudeCli ? true : false) : null;

  return (
    <div className="modal-bg" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 620, maxHeight: "88vh", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: "var(--claude)", display: "inline-grid" }}><ClaudeMark /></span>Claude &amp; Studio</h2>
          <button className="btn ghost icon" onClick={onClose}><Close /></button>
        </div>
        <p>Claude edits this video <b>live in this editor</b> through Studio's MCP server: it reads every scene, element, sound and editable value, changes them (one undo step each), looks at frames, saves into the code and exports.</p>

        <div className="checks">
          <h4>Status</h4>
          <div className="status-row"><span className="label">MCP server</span><span className="value"><Dot ok={!!status} />{url}</span></div>
          <div className="status-row"><span className="label">This editor</span><span className="value"><Dot ok={status ? status.editorConnected : null} />{status ? (status.editorConnected ? "connected — tool calls apply here" : "not connected (reload this page)") : "…"}</span></div>
          <div className="status-row"><span className="label">Claude Code CLI</span><span className="value" title={status?.claudeCli ?? undefined}><Dot ok={cli} />{status ? (status.claudeCli ? `${status.claudeVersion ?? "installed"} · ${status.claudeCli}` : "not found on PATH") : "…"}</span></div>
        </div>

        <div className="section" style={{ paddingTop: 4 }}>Open in Claude Code</div>
        <div>
          {launch.state === "launched" && <div className="callout ok"><b>Terminal opened.</b> Claude Code is starting in the project folder with the <code>insyd-studio</code> MCP attached and the Studio brief in <code>CLAUDE.md</code>. Ask it for changes; they appear here as it works.</div>}
          {launch.state === "launching" && <div className="callout">Opening Terminal…</div>}
          {launch.state === "no-cli" && <div className="callout warn"><b>Claude Code isn't installed.</b> The Studio brief was written to <code>CLAUDE.md</code> and copied to your clipboard. Install the CLI, then open again:</div>}
          {launch.state === "error" && <div className="callout warn">{launch.message}</div>}
          {(launch.state === "no-cli" || cli === false) && <Snippet k="install" v={installCmd} />}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <button className="btn primary" onClick={doLaunch} disabled={launch.state === "launching"}><TerminalIcon /> {launch.state === "launched" ? "Open another" : "Open in Claude Code"}</button>
            <span className="hint" style={{ padding: 0 }}>Opens Terminal in the project, runs <code>claude --mcp-config …</code> with a kickoff prompt.</span>
          </div>
        </div>

        <div className="section">Keep it connected (Claude Code)</div>
        <div className="hint">Run once in the project folder so every future <code>claude</code> session there has the Studio tools (Studio must be running when you use them):</div>
        <Snippet k="code" v={codeCmd} />

        <div className="section">Claude Desktop</div>
        <div className="hint">Settings → Developer → Edit Config, add this (uses <code>mcp-remote</code>, needs Node), restart Claude Desktop.</div>
        <Snippet k="desktop" v={desktopCfg} />

        <div className="section">What Claude can do here</div>
        <div className="hint" style={{ lineHeight: 1.7 }}>
          <b>Read</b> get_project · list_scenes · list_elements · get_element · list_sounds · list_values · get_context · list_audio_files<br />
          <b>Change</b> set_text · set_value(s) · update_element(s) · set_sound(s) (bulk, e.g. every whoosh) · add_sound · remove_sound · set_scene_duration<br />
          <b>Steer</b> select · seek · play · pause · undo · redo &nbsp; <b>See</b> preview_frame (returns an image) &nbsp; <b>Finish</b> save (writes into the code) · export_video · export_status<br />
          Try: “set every whoosh to 10%”, “make the CTA headline bigger and the brand colour purple, then show me frame 1360”, “save”.
        </div>
      </div>
    </div>
  );
};
