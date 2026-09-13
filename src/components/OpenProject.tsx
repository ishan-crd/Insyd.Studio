import React, { useEffect, useState } from "react";
import { api, type ProjectInfo } from "../lib/api";
import { Folder, Check, Close } from "../lib/icons";

const THUMBS = ["linear-gradient(135deg,#F8F6F1,#E5E1D6)", "linear-gradient(135deg,#2A2A28,#141313)", "linear-gradient(135deg,#3ECF8E,#1B6E4C)", "linear-gradient(135deg,#FFD5C6,#FF9F7A)", "linear-gradient(135deg,#D6E2FD,#3B7DD8)"];

const CheckRow: React.FC<{ ok: boolean; label: React.ReactNode; detail?: string }> = ({ ok, label, detail }) => (
  <div className={`check ${ok ? "ok" : "bad"}`}><span className="mark">{ok ? <Check /> : <Close />}</span><span>{label}</span>{detail && <span className="detail">{detail}</span>}</div>
);

export const OpenProject: React.FC<{ onCancel?: () => void }> = ({ onCancel }) => {
  const [path, setPath] = useState("");
  const [info, setInfo] = useState<ProjectInfo | null>(null);
  const [recent, setRecent] = useState<ProjectInfo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { api.project().then((p) => { setRecent(p.recent); if (p.current?.path) setPath(p.current.path); }); }, []);
  useEffect(() => {
    if (!path) return setInfo(null);
    const t = setTimeout(() => api.inspect(path).then(setInfo).catch(() => setInfo(null)), 200);
    return () => clearTimeout(t);
  }, [path]);

  const pick = async () => { const r = await api.pick(); if (r.path) setPath(r.path); };
  const open = async (p = path) => {
    setBusy("Opening…"); setErr(null);
    try {
      await api.open(p);
      setBusy("Loading project…");
      setTimeout(() => location.reload(), 1200);
    } catch (e: any) { setErr(e.message); setBusy(null); }
  };
  const init = async () => {
    setBusy("Installing SDK…"); setErr(null);
    try { setInfo(await api.init(path)); } catch (e: any) { setErr(e.message); }
    setBusy(null);
  };
  const short = (p: string) => p.replace(/^\/Users\/[^/]+/, "~");

  return (
    <div className="welcome">
      <div className="card">
        <h1><span className="brand"><span>Open a project</span></span>{onCancel && <button className="btn ghost icon" style={{ marginLeft: "auto" }} onClick={onCancel} title="Back to the editor"><Close /></button>}</h1>
        <p>Point Studio by Insyd at any Remotion project folder. It needs the Studio SDK (<code>src/insyd</code>) and an editor entry (<code>src/editor.ts</code>) — both can be installed from here.</p>
        <div className="pathbox">
          <input placeholder="/path/to/remotion-project" value={path} onChange={(e) => setPath(e.target.value)} onKeyDown={(e) => e.key === "Enter" && info?.ready && open()} />
          <button className="btn" onClick={pick}><Folder /> Browse…</button>
        </div>
        {recent.length > 0 && (
          <div className="recent" style={{ margin: "0 0 12px" }}>
            {recent.map((r, i) => (
              <div key={r.path} className={`row ${r.path === path ? "on" : ""}`} onClick={() => { setPath(r.path); if (r.ready) open(r.path); }} title={r.path}>
                <span className="thumb" style={{ background: THUMBS[i % THUMBS.length] }} />
                <span className="name"><b>{r.name ?? r.path}</b><span>{short(r.path)}</span></span>
                <span className="meta">{r.ready ? "ready" : r.exists ? "needs setup" : "missing"}</span>
              </div>
            ))}
          </div>
        )}
        {info && info.exists && (
          <div className="checks">
            <h4>Setup checks</h4>
            <CheckRow ok={!!info.hasRemotion} label="Remotion installed" detail="node_modules/remotion" />
            <CheckRow ok={!!info.hasSdk} label="Studio SDK" detail="src/insyd/index.tsx" />
            <CheckRow ok={!!info.entry} label="Editor entry" detail="src/editor.ts" />
          </div>
        )}
        {info && !info.exists && path && <div className="check bad" style={{ marginBottom: 12 }}><span className="mark"><Close /></span>Folder not found</div>}
        {err && <div className="callout warn">{err}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          {info?.exists && !info.ready && <button className="btn" style={{ flex: 1, justifyContent: "center", height: 32 }} onClick={init} disabled={!!busy}>Install SDK into project</button>}
          <button className="btn primary" style={{ flex: 1, justifyContent: "center", height: 32 }} disabled={!info?.ready || !!busy} onClick={() => open()}>{busy ?? "Open project"}</button>
        </div>
      </div>
    </div>
  );
};
