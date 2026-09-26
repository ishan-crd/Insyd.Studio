import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Shell } from "./Shell";
import { fetchTemplates, type Template, duration, HOSTED } from "./api";
import { TemplateCard, HoverVideo, Swatches } from "./TemplateCard";
import { useEditTemplate } from "./useTemplate";

const STEPS: Array<[string, string]> = [
  ["Pick a template", "Every template is a real Remotion project — scenes, clips, sounds and brand tokens, all in code."],
  ["Claude makes it yours", "Open it in Studio and ask Claude for your logo, copy and colours — or drag, retime and restyle by hand."],
  ["Export", "Render to MP4 at any size. Every edit is written back into the source, so it stays yours."],
];

export const Marketplace: React.FC = () => {
  const [data, setData] = useState<{ templates: Template[] } | null>(null);
  const [cat, setCat] = useState("All");
  const edit = useEditTemplate();
  useEffect(() => { fetchTemplates().then(setData).catch(() => setData({ templates: [] })); }, []);
  const templates = data?.templates ?? [];
  const cats = useMemo(() => ["All", ...Array.from(new Set(templates.map((t) => t.category)))], [templates]);
  const shown = templates.filter((t) => cat === "All" || t.category === cat);
  const featured = templates[0];
  return (
    <Shell>
      <section className="mk-hero">
        <div className="mk-wrap mk-hero-in">
          <div className="mk-hero-copy">
            <span className="mk-eyebrow"><i />Launch-video templates for Studio</span>
            <h1>Launch videos,<br />ready to make yours.</h1>
            <p>Pick a template and open it in Studio. Claude swaps in your logo, copy and colours — every clip, sound and value stays editable, and every edit is written back into the code.</p>
            <div className="mk-cta">
              <a className="mk-btn primary lg" href="#templates">Browse templates</a>
              <a className="mk-btn lg" href="/studio">{HOSTED ? "Get Studio" : "Open Studio"}</a>
            </div>
          </div>
          {featured && (
            <Link to={`/templates/${featured.slug}`} className="mk-featured" aria-label={featured.title}>
              <div className="mk-media"><HoverVideo t={featured} active autoplay /></div>
              <div className="mk-featured-cap">
                <span className="mk-chip">Featured</span>
                <b>{featured.title}</b>
                <span className="dim">{duration(featured)} · {featured.scenes.length} scenes</span>
                <Swatches t={featured} max={5} />
              </div>
            </Link>
          )}
        </div>
      </section>

      <section className="mk-section" id="templates">
        <div className="mk-wrap">
          <div className="mk-section-head">
            <div><h2>Templates</h2><p>{templates.length} template{templates.length === 1 ? "" : "s"} · hover to preview</p></div>
            <div className="mk-filters">{cats.map((c) => <button key={c} className={c === cat ? "on" : ""} onClick={() => setCat(c)}>{c}</button>)}</div>
          </div>
          {!data ? <div className="mk-grid">{[0, 1].map((i) => <div key={i} className="mk-card skeleton"><div className="mk-media" /><div className="mk-card-body"><i /><i /></div></div>)}</div>
            : shown.length ? <div className="mk-grid">{shown.map((t) => <TemplateCard key={t.slug} t={t} onEdit={edit.start} />)}</div>
            : <div className="mk-empty">No templates yet.</div>}
        </div>
      </section>

      <section className="mk-section mk-how">
        <div className="mk-wrap">
          <h2>How it works</h2>
          <ol className="mk-steps">{STEPS.map(([h, p], i) => <li key={h}><span className="n">{String(i + 1).padStart(2, "0")}</span><b>{h}</b><p>{p}</p></li>)}</ol>
        </div>
      </section>
      {edit.overlay}
    </Shell>
  );
};
