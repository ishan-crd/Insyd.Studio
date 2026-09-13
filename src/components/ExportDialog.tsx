import React, { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { api } from "../lib/api";
import { useEscape } from "../lib/useEscape";

type Job = { stage: string; progress: number; error: string | null; outputLocation: string };
const QUALITY = [{ crf: 14, label: "Best (large)" }, { crf: 17, label: "High" }, { crf: 21, label: "Balanced" }, { crf: 26, label: "Small" }];

export const ExportDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const def = useStore((s) => s.def)!;
  const layout = useStore((s) => s.layout);
  const [name, setName] = useState(`${def.name.replace(/[^\w.-]+/g, "-")}.mp4`);
  const [crf, setCrf] = useState(17);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const es = new EventSource(`/api/render/${jobId}/events`);
    es.onmessage = (e) => { const j = JSON.parse(e.data) as Job; setJob(j); if (j.stage === "done" || j.stage === "error") es.close(); };
    return () => es.close();
  }, [jobId]);

  const start = async () => {
    const r = await api.render({ compositionId: def.id, entryPoint: def.entryPoint, inputProps: { layout }, fileName: name, crf });
    setJobId(r.id);
    setJob({ stage: "bundling", progress: 0, error: null, outputLocation: r.outputLocation });
  };
  const busy = job && job.stage !== "done" && job.stage !== "error";
  useEscape(onClose, !busy);
  const label = job?.stage === "bundling" ? "Bundling project" : job?.stage === "preparing" ? "Preparing composition" : job?.stage === "rendering" ? "Rendering frames" : job?.stage === "done" ? "Done" : job?.stage === "error" ? "Failed" : "";

  return (
    <div className="modal-bg" onPointerDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="modal">
        <h2>Export video</h2>
        <p>Renders exactly what you see in the editor — unsaved edits included — as H.264 MP4 to your Desktop.</p>
        {!job && (
          <>
            <div className="field" style={{ gridTemplateColumns: "90px 1fr" }}><label>File name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="field" style={{ gridTemplateColumns: "90px 1fr" }}><label>Quality</label>
              <select value={crf} onChange={(e) => setCrf(Number(e.target.value))}>{QUALITY.map((q) => <option key={q.crf} value={q.crf}>{q.label}</option>)}</select>
            </div>
            <div className="field" style={{ gridTemplateColumns: "90px 1fr" }}><label>Output</label><div className="id">{def.width}×{def.height} · {def.fps} fps · {(useStore.getState().duration() / def.fps).toFixed(1)}s</div></div>
          </>
        )}
        {job && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-2)" }}><span>{label}</span><span style={{ fontFamily: "var(--mono)" }}>{Math.round(job.progress * 100)}%</span></div>
            <div className="progress"><i style={{ width: `${job.progress * 100}%`, background: job.stage === "error" ? "var(--danger)" : undefined }} /></div>
            <div className="id" style={{ wordBreak: "break-all" }}>{job.outputLocation}</div>
            {job.error && <div className="check bad" style={{ marginTop: 8 }}>{job.error}</div>}
          </>
        )}
        <div className="actions">
          {!job && <><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={start}>Export</button></>}
          {busy && <button className="btn" onClick={() => jobId && api.cancelRender(jobId)}>Cancel render</button>}
          {job?.stage === "done" && <><button className="btn" onClick={() => api.reveal(job.outputLocation)}>Reveal in Finder</button><button className="btn primary" onClick={() => api.openFile(job.outputLocation)}>Open</button><button className="btn ghost" onClick={onClose}>Close</button></>}
          {job?.stage === "error" && <button className="btn" onClick={onClose}>Close</button>}
        </div>
      </div>
    </div>
  );
};
