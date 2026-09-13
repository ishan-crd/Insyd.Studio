import React, { useEffect, useState } from "react";
import { animAt, animLength, SPRING_PRESETS, type AnimSpec, type EditKind, type EditMeta } from "@project/sdk";
import { useStore } from "../state/store";

// ---- primitive fields -------------------------------------------------------

export const NumberField: React.FC<{ value: number; onChange: (v: number, commit?: boolean) => void; step?: number; min?: number; max?: number; unit?: string; slider?: boolean }> = ({
  value, onChange, step, min, max, unit, slider,
}) => {
  const st = step ?? (Math.abs(value) >= 100 ? 1 : Math.abs(value) >= 10 ? 0.5 : 0.1);
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(Number.isInteger(value) ? value : Math.round(value * 1000) / 1000)); }, [value]);
  const store = useStore.getState;
  return (
    <div className={slider && min !== undefined && max !== undefined ? "slider" : undefined}>
      {slider && min !== undefined && max !== undefined && (
        <input type="range" min={min} max={max} step={st} value={value} style={{ ["--p" as any]: `${Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))}%` }}
          onPointerDown={() => store().begin()} onPointerUp={() => store().end()}
          onChange={(e) => onChange(parseFloat(e.target.value), false)} />
      )}
      <div className="unit">
        {unit && <i>{unit}</i>}
        <input type="number" value={text} step={st} min={min} max={max}
          onChange={(e) => { setText(e.target.value); const v = parseFloat(e.target.value); if (Number.isFinite(v)) onChange(v); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); const d = (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? st * 10 : st); onChange(Math.round((value + d) * 1000) / 1000); }
          }} />
      </div>
    </div>
  );
};

export const ColorField: React.FC<{ value: string; onChange: (v: string, commit?: boolean) => void }> = ({ value, onChange }) => {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : toHex6(value);
  const store = useStore.getState;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 6, alignItems: "center" }}>
      <input type="color" value={hex} style={{ cursor: "pointer" }}
        onFocus={() => store().begin()} onBlur={() => store().end()}
        onChange={(e) => onChange(e.target.value, false)} />
      <input value={value} spellCheck={false} style={{ fontFamily: "var(--mono)", fontSize: 11.5 }} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
};
const toHex6 = (c: string) => {
  if (/^#[0-9a-f]{3}$/i.test(c)) return "#" + c.slice(1).split("").map((x) => x + x).join("");
  if (/^#[0-9a-f]{8}$/i.test(c)) return c.slice(0, 7);
  return "#000000";
};

export const TextField: React.FC<{ value: string; onChange: (v: string, commit?: boolean) => void; multiline?: boolean; id?: string }> = ({ value, onChange, multiline, id }) => {
  const store = useStore.getState;
  return multiline ? (
    <textarea id={id} value={value} onFocus={() => store().begin()} onBlur={() => store().end()} onChange={(e) => onChange(e.target.value, false)} />
  ) : (
    <input id={id} value={value} onFocus={() => store().begin()} onBlur={() => store().end()} onChange={(e) => onChange(e.target.value, false)} />
  );
};

export const BoolField: React.FC<{ value: boolean; onChange: (v: boolean) => void; label?: [string, string] }> = ({ value, onChange, label = ["Off", "On"] }) => (
  <label className="switch"><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /><span>{value ? label[1] : label[0]}</span></label>
);

export const EnumField: React.FC<{ value: string; options: string[]; onChange: (v: string) => void }> = ({ value, options, onChange }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
);

// ---- generic prop control ---------------------------------------------------

export const PropControl: React.FC<{ kind: EditKind; meta: EditMeta; value: unknown; onChange: (v: unknown, commit?: boolean) => void }> = ({ kind, meta, value, onChange }) => {
  switch (kind) {
    case "number": return <NumberField value={Number(value)} onChange={onChange} step={meta.step} min={meta.min} max={meta.max} unit={meta.unit} slider={meta.min !== undefined && meta.max !== undefined} />;
    case "color": return <ColorField value={String(value)} onChange={onChange} />;
    case "boolean": return <BoolField value={Boolean(value)} onChange={onChange} />;
    case "enum": case "font": return <EnumField value={String(value)} options={meta.options ?? [String(value)]} onChange={onChange} />;
    case "anim": return <AnimEditor spec={value as AnimSpec} onChange={onChange} />;
    default: return <TextField value={String(value ?? "")} onChange={onChange} multiline={String(value ?? "").length > 28} />;
  }
};

// ---- animation editor -------------------------------------------------------

const PRESETS = [...Object.keys(SPRING_PRESETS), "custom", "bezier"];
const FROM_KEYS: Array<[keyof NonNullable<AnimSpec["from"]>, string, number]> = [["x", "X", 0], ["y", "Y", 0], ["scale", "Scale", 1], ["opacity", "Opacity", 1], ["rotate", "Rotate", 0], ["blur", "Blur", 0]];

export const AnimEditor: React.FC<{ spec: AnimSpec; onChange: (v: AnimSpec, commit?: boolean) => void }> = ({ spec, onChange }) => {
  const def = useStore((s) => s.def)!;
  const set = (patch: Partial<AnimSpec>, commit = true) => onChange({ ...spec, ...patch }, commit);
  const setFrom = (k: string, v: number | undefined, commit = true) => {
    const from = { ...(spec.from ?? {}) } as Record<string, number | undefined>;
    if (v === undefined) delete from[k]; else from[k] = v;
    set({ from: from as AnimSpec["from"] }, commit);
  };
  const preset = spec.preset ?? "smooth";
  const len = animLength(spec, def.fps);
  // curve preview
  const N = 64, W = 240, H = 64;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const f = (i / N) * Math.max(len, 1) + (spec.delay ?? 0);
    const p = animAt(spec, f, def.fps).p;
    return [(i / N) * W, H - 8 - p * (H - 16)] as const;
  });
  const maxP = Math.max(...pts.map((p) => H - 8 - p[1])) / (H - 16);
  const isSpring = preset !== "bezier";
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="tabs">
        <button className={isSpring ? "on" : ""} onClick={() => { if (!isSpring) set({ preset: "smooth" }); }}>Spring</button>
        <button className={!isSpring ? "on" : ""} onClick={() => { if (isSpring) set({ preset: "bezier", duration: spec.duration ?? 20, easing: spec.easing ?? "out" }); }}>Bezier</button>
      </div>
      <div className="curve">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <line x1={0} x2={W} y1={H - 8} y2={H - 8} stroke="var(--line)" />
          <line x1={0} x2={W} y1={8} y2={8} stroke="var(--line)" strokeDasharray="3 3" />
          <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--ink)" strokeWidth={1.8} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <span style={{ position: "absolute", right: 8, bottom: 6, fontSize: 10, color: "var(--ink-3)" }}>{len}f · {(len / def.fps).toFixed(2)}s{maxP > 1.02 ? ` · overshoot ${Math.round((maxP - 1) * 100)}%` : ""}</span>
      </div>
      <div className="grid2">
        <div className="field"><label>Delay</label><NumberField value={spec.delay ?? 0} step={1} unit="f" onChange={(v, c) => set({ delay: Math.round(v) }, c)} /></div>
        {isSpring
          ? <div className="field"><label>Motion</label><EnumField value={preset} options={PRESETS.filter((p) => p !== "bezier")} onChange={(v) => set({ preset: v as AnimSpec["preset"], ...(v === "custom" && spec.damping === undefined ? { damping: 20, stiffness: 100, mass: 1 } : {}) })} /></div>
          : <div className="field"><label>Easing</label><EnumField value={spec.easing ?? "out"} options={["out", "inOut", "in", "soft", "linear"]} onChange={(v) => set({ easing: v as AnimSpec["easing"] })} /></div>}
      </div>
      {preset === "custom" && (
        <>
          <div className="field"><label>Stiffness<span className="val">{spec.stiffness ?? 100}</span></label><NumberField value={spec.stiffness ?? 100} min={10} max={400} step={5} slider onChange={(v, c) => set({ stiffness: v }, c)} /></div>
          <div className="field"><label>Damping<span className="val">{spec.damping ?? 20}</span></label><NumberField value={spec.damping ?? 20} min={1} max={60} step={1} slider onChange={(v, c) => set({ damping: v }, c)} /></div>
          <div className="field"><label>Mass<span className="val">{spec.mass ?? 1}</span></label><NumberField value={spec.mass ?? 1} min={0.1} max={3} step={0.1} slider onChange={(v, c) => set({ mass: v }, c)} /></div>
        </>
      )}
      {preset === "bezier" && (
        <div className="field"><label>Duration<span className="val">{spec.duration ?? 20}f</span></label><NumberField value={spec.duration ?? 20} min={1} max={120} step={1} slider unit="f" onChange={(v, c) => set({ duration: Math.round(v) }, c)} /></div>
      )}
      <div>
        <div className="section" style={{ padding: "4px 0 8px" }}>From values</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {FROM_KEYS.map(([k, label, rest]) => {
            const v = spec.from?.[k];
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <label className="switch" style={{ flex: 1, gap: 8 }}><input type="checkbox" checked={v !== undefined} onChange={(e) => setFrom(k, e.target.checked ? (k === "scale" ? 0.9 : k === "opacity" ? 0 : k === "y" ? 40 : k === "x" ? -60 : k === "rotate" ? -10 : 8) : undefined)} />{label}</label>
                <div style={{ width: 84 }}>{v !== undefined ? <NumberField value={v} step={k === "scale" || k === "opacity" ? 0.05 : 1} onChange={(nv, c) => setFrom(k, nv, c)} /> : <span className="id" style={{ display: "block", textAlign: "right" }}>rests at {rest}</span>}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
