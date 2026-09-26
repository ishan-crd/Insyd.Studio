import React, { useEffect, useState } from "react";
import type { Template } from "./api";

type Job = { slug: string; title: string; stage: string; error: string | null; path: string | null };

// "Edit in Studio": the server copies the template into ~/Documents/Studio Projects/<slug>, opens it
// (restarting the dev server's project alias), and we go to /studio once the copy is the open project.
// Opening a project restarts the dev server, which reloads this tab — the pending hand-off is kept in
// sessionStorage and picked up again after the reload.
const KEY = "insyd:opening-template";
const pending = (): Job | null => { try { const v = sessionStorage.getItem(KEY); return v ? { ...JSON.parse(v), stage: "Opening Studio…", error: null, path: null } : null; } catch { return null; } };

export const useEditTemplate = () => {
  const [job, setJob] = useState<Job | null>(pending);
  const start = async (t: Pick<Template, "slug" | "title">) => {
    try { sessionStorage.setItem(KEY, JSON.stringify({ slug: t.slug, title: t.title })); } catch {}
    setJob({ slug: t.slug, title: t.title, stage: "Starting…", error: null, path: null });
    const r = await fetch(`/api/templates/${t.slug}/use`, { method: "POST" }).then((x) => x.json()).catch((e) => ({ error: e.message }));
    if (r.error) { try { sessionStorage.removeItem(KEY); } catch {} setJob((j) => j && { ...j, stage: "error", error: r.error }); }
  };
  useEffect(() => {
    if (!job || job.stage === "error") return;
    let alive = true;
    const tick = async () => {
      const s = await fetch(`/api/templates/${job.slug}/use`).then((x) => x.json()).catch(() => null);
      if (!alive || !s) return;
      if (s.stage === "error") { try { sessionStorage.removeItem(KEY); } catch {} return setJob((j) => j && { ...j, stage: "error", error: s.error }); }
      if (s.stage === "done" && s.path) {
        setJob((j) => j && { ...j, stage: "Opening Studio…", path: s.path });
        // wait until the copy is the open project and the dev server is back, then load the editor
        for (let i = 0; i < 60 && alive; i++) {
          const p = await fetch("/api/project").then((x) => x.json()).catch(() => null);
          const ok = p?.current?.path === s.path && (await fetch("/studio", { cache: "no-store" }).then((x) => x.ok).catch(() => false));
          if (ok) { try { sessionStorage.removeItem(KEY); } catch {} await new Promise((r) => setTimeout(r, 400)); window.location.href = "/studio"; return; }
          await new Promise((r) => setTimeout(r, 300));
        }
        return;
      }
      setJob((j) => j && { ...j, stage: s.stage });
      setTimeout(tick, 400);
    };
    const t = setTimeout(tick, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [job?.slug, job?.stage === "error"]);
  const overlay = job && (
    <div className="mk-modal-bg" onClick={() => job.stage === "error" && setJob(null)}>
      <div className="mk-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{job.stage === "error" ? "Couldn't open the template" : `Making “${job.title}” yours`}</h3>
        {job.stage === "error" ? (
          <><p className="err">{job.error}</p><button className="mk-btn" onClick={() => setJob(null)}>Close</button></>
        ) : (
          <><p>{job.stage}</p><div className="mk-bar"><i /></div>{job.path && <p className="path">{job.path.replace(/^\/Users\/[^/]+/, "~")}</p>}</>
        )}
      </div>
    </div>
  );
  return { start, overlay, busy: !!job && job.stage !== "error" };
};
