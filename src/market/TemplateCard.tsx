import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { type Template, duration, aspect, signature, HOSTED } from "./api";

/**
 * A 16:9 card whose preview plays inside it while hovered (muted, looping, from the start), with a
 * progress line, and fades back to the poster when the pointer leaves. The video only loads on the
 * first hover.
 */
export const HoverVideo: React.FC<{ t: Template; active: boolean; autoplay?: boolean }> = ({ t, active, autoplay }) => {
  const v = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(!!autoplay);
  const [playing, setPlaying] = useState(false);
  const [p, setP] = useState(0);
  const on = active || !!autoplay;
  useEffect(() => { if (on) setLoaded(true); }, [on]);
  useEffect(() => {
    const el = v.current; if (!el || !loaded) return;
    if (on) { if (!autoplay) el.currentTime = 0; el.play().catch(() => {}); }
    else { el.pause(); }
  }, [on, loaded, autoplay]);
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const loop = () => { const el = v.current; if (el && el.duration) setP(el.currentTime / el.duration); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  // anything that isn't 16:9 is shown whole (contain), on a blurred backdrop made from its own poster
  const fit = Math.abs(t.width / t.height - 16 / 9) > 0.02;
  return (
    <>
      {fit && (t.background ? <div className="mk-backdrop" style={{ background: t.background, filter: "none", opacity: 1, inset: 0, width: "100%", height: "100%" }} /> : t.poster && <img className="mk-backdrop" src={t.poster} alt="" draggable={false} />)}
      {t.poster && <img className={`mk-poster ${fit ? "fit" : ""}`} src={t.poster} alt="" draggable={false} />}
      {loaded && t.preview && (
        <video ref={v} className={`mk-video ${fit ? "fit" : ""} ${on && playing ? "on" : ""}`} src={t.preview} muted loop playsInline preload="auto"
          onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      )}
      <div className="mk-progress" style={{ opacity: on && playing ? 1 : 0 }}><i style={{ width: `${p * 100}%` }} /></div>
    </>
  );
};

export const Swatches: React.FC<{ t: Template; max?: number }> = ({ t, max = 6 }) => (
  <span className="mk-swatches">{signature(t, max).map((c) => <i key={c.name} style={{ background: c.value }} title={`${c.name} ${c.value}`} />)}</span>
);

export const TemplateCard: React.FC<{ t: Template; onEdit: (t: Template) => void }> = ({ t, onEdit }) => {
  const [hover, setHover] = useState(false);
  return (
    <article className={`mk-card ${hover ? "hover" : ""}`} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} data-slug={t.slug}>
      <Link to={`/templates/${t.slug}`} className="mk-media" aria-label={t.title}>
        <HoverVideo t={t} active={hover} />
        <span className="mk-chip tl">{t.category}</span>
        <span className="mk-chip tr">{duration(t)}</span>
        <div className="mk-media-actions">
          <button className="mk-btn primary sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(t); }}>{HOSTED ? "Use this template →" : "Edit in Studio →"}</button>
          <span className="mk-btn ghost-dark sm">Details</span>
        </div>
      </Link>
      <div className="mk-card-body">
        <div className="mk-card-top">
          <Link to={`/templates/${t.slug}`} className="mk-card-title">{t.title}</Link>
          <Swatches t={t} max={5} />
        </div>
        <p className="mk-card-tag">{t.tagline}</p>
        <div className="mk-facts">
          <span>{aspect(t)}</span><span>{t.scenes.length} scenes</span><span>{t.counts.clips} clips</span><span>{t.counts.sounds} sounds</span>
        </div>
      </div>
    </article>
  );
};
