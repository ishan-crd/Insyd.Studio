import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Shell } from "./Shell";
import { fetchTemplate, type Template, duration, aspect, HOSTED } from "./api";
import { useEditTemplate } from "./useTemplate";

const SCENE_COLORS = ["#3B7DD8", "#D95F6E", "#2E9E6B", "#D8A23A", "#2A9D9F", "#E0733A", "#7B61D9", "#C9527F", "#5E8F3A", "#3A8FB8", "#B8743A"];

export const TemplatePage: React.FC = () => {
  const { slug = "" } = useParams();
  const [t, setT] = useState<Template | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const v = useRef<HTMLVideoElement>(null);
  const edit = useEditTemplate();
  useEffect(() => { setT(null); fetchTemplate(slug).then((x) => { setT(x); document.title = `${x.title} · Studio by Insyd`; }).catch((e) => setErr(e.message)); document.getElementById("mk-scroll")?.scrollTo(0, 0); }, [slug]);
  if (err) return <Shell><div className="mk-wrap mk-page"><Link to="/" className="mk-back">← All templates</Link><div className="mk-empty">{err}</div></div></Shell>;
  if (!t) return <Shell><div className="mk-wrap mk-page"><div className="mk-detail skeleton"><div className="mk-player" /></div></div></Shell>;
  const total = t.durationInFrames;
  let at = 0;
  const scenes = t.scenes.map((s, i) => { const from = at; at += s.frames; return { ...s, from, color: SCENE_COLORS[i % SCENE_COLORS.length] }; });
  const cur = time * t.fps;
  const seek = (frame: number) => { const el = v.current; if (!el) return; el.currentTime = frame / t.fps + 0.01; el.play().catch(() => {}); };
  const facts: Array<[string, React.ReactNode]> = [
    ["Length", `${duration(t)} · ${total} frames`], ["Format", `${aspect(t)} · ${t.width}×${t.height} · ${t.fps} fps`],
    ["Scenes", t.scenes.length], ["Clips", t.counts.clips], ["Sounds", t.counts.sounds], ["Editable values", t.counts.values],
    ...(t.music ? [["Music", t.music] as [string, React.ReactNode]] : []),
  ];
  return (
    <Shell>
      <div className="mk-wrap mk-page">
        <Link to="/" className="mk-back">← All templates</Link>
        <div className="mk-detail">
          <div className="mk-detail-main">
            <div className="mk-player">
              <video ref={v} src={t.preview ?? undefined} poster={t.poster ?? undefined} controls playsInline preload="metadata" onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} />
            </div>
            <div className="mk-scenes" aria-label="Scenes">
              {scenes.map((s) => (
                <button key={s.id} className={`mk-scene ${cur >= s.from && cur < s.from + s.frames ? "on" : ""}`} style={{ flex: s.frames, ["--c" as string]: s.color }} onClick={() => seek(s.from)} title={`${s.label} · ${(s.frames / t.fps).toFixed(1)}s`}>
                  <span className="lbl">{s.label}</span>
                </button>
              ))}
              <span className="mk-scenes-head" style={{ left: `${Math.min(100, (cur / total) * 100)}%` }} />
            </div>
            <div className="mk-prose">
              <h2>About this template</h2>
              <p>{t.description}</p>
              <h3>What you can change</h3>
              <ul className="mk-checks">
                <li><b>{t.counts.clips} clips</b> — every text line, texture, image and panel is its own clip: move, trim, restyle or hide it.</li>
                <li><b>{t.counts.sounds} sounds</b> — music and every effect sit on the timeline: re-time, re-level, swap or mute.</li>
                <li><b>{t.counts.values} values</b> — sizes, positions, animation timings and copy, each a literal in the code.</li>
                <li><b>{t.counts.brand} brand tokens</b> — colours and fonts applied everywhere at once.</li>
              </ul>
            </div>
          </div>
          <aside className="mk-side">
            <span className="mk-chip">{t.category}</span>
            <h1>{t.title}</h1>
            <p className="mk-side-tag">{t.tagline}</p>
            <button className="mk-btn primary lg block" onClick={() => edit.start(t)} disabled={edit.busy}>{HOSTED ? "Use this template →" : "Edit in Studio →"}</button>
            <p className="mk-side-note">{HOSTED ? "Download the source and open it in Studio on your computer." : "Makes your own copy in ~/Documents/Studio Projects and opens it in Studio."}</p>
            <dl className="mk-dl">{facts.map(([k, val]) => <React.Fragment key={k}><dt>{k}</dt><dd>{val}</dd></React.Fragment>)}</dl>
            <h4>Palette</h4>
            <div className="mk-palette">{t.palette.map((c) => <div key={c.name}><i style={{ background: c.value }} /><span>{c.name}</span><code>{c.value}</code></div>)}</div>
            {t.fonts.length > 0 && <><h4>Type</h4><div className="mk-fonts">{t.fonts.map((f) => <span key={f} style={{ fontFamily: `"${f}", system-ui` }}>{f}</span>)}</div></>}
            <div className="mk-tags">{t.tags.map((x) => <span key={x}>{x}</span>)}</div>
          </aside>
        </div>
      </div>
      {edit.overlay}
    </Shell>
  );
};
