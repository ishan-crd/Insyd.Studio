import React, { useEffect, useState } from "react";
import { api, type ProjectInfo } from "../lib/api";
import { Folder, Logo, Check, Close, Wordmark } from "../lib/icons";

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

  return (
    <div className="welcome">
      <div className="card">
        <h1><span className="mark"><Logo /></span><Wordmark size={24} /> {onCancel && <button className="btn ghost icon" style={{ marginLeft: "auto" }} onClick={onCancel}><Close /></button>}</h1>
        <p>An iMovie-style editor for Remotion projects. Open a project folder that exports a Studio entry (<code>src/editor.ts</code>) and edit every scene and element by hand — then export an MP4.</p>
        <div className="pathbox">
          <input placeholder="/path/to/remotion-project" value={path} onChange={(e) => setPath(e.target.value)} onKeyDown={(e) => e.key === "Enter" && info?.ready && open()} />
          <button className="btn" onClick={pick}><Folder /> Browse…</button>
        </div>
        {info && info.exists && (
          <div style={{ marginBottom: 12 }}>
            <div className={`check ${info.hasRemotion ? "ok" : "bad"}`}>{info.hasRemotion ? <Check /> : <Close />} Remotion installed (<code>node_modules/remotion</code>)</div>
            <div className={`check ${info.hasSdk ? "ok" : "bad"}`}>{info.hasSdk ? <Check /> : <Close />} Insyd Studio SDK (<code>src/insyd/index.tsx</code>)</div>
            <div className={`check ${info.entry ? "ok" : "bad"}`}>{info.entry ? <Check /> : <Close />} Editor entry (<code>src/editor.ts</code>)</div>
          </div>
        )}
        {info && !info.exists && path && <div className="check bad"><Close /> Folder not found</div>}
        {err && <div className="check bad"><Close /> {err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {info?.exists && !info.ready && <button className="btn" onClick={init} disabled={!!busy}>Install SDK into project</button>}
          <button className="btn primary" disabled={!info?.ready || !!busy} onClick={() => open()}>{busy ?? "Open project"}</button>
        </div>
        {recent.length > 0 && (
          <div className="recent">
            <div className="group">Recent</div>
            {recent.map((r) => (
              <div key={r.path} className="row" onClick={() => { setPath(r.path); if (r.ready) open(r.path); }}>
                <Folder /><span className="name">{r.name ?? r.path}</span><span className="meta">{r.path.replace(/^\/Users\/[^/]+/, "~")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
