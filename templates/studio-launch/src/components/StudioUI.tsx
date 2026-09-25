import React from "react";
import { useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { hash } from "./motion";

// Studio by Insyd, drawn in its own dark theme tokens (the real editor's palette) at 1600×900.
export const D = {
  ground: "#151514", panel: "#1D1D1C", panel2: "#222221", line: "#2D2D2B", lineSoft: "#282826", field: "#383836",
  hover: "#2F2F2D", ink: "#F2F2F0", ink2: "#C9C9C5", ink3: "#9C9C97", ink4: "#8A8A84", dis: "#55554F",
  accent: "#3D74E8", selBg: "#22304D", selChip: "#2C3F6B", selText: "#A9C2FF", claude: "#D97757", ok: "#4CB98A",
};
export const SCENE_COLORS = ["#3B7DD8", "#D95F6E", "#2E9E6B", "#D8A23A", "#2A9D9F", "#7B61D9"];
const font = () => ({ fontFamily: "Inter, system-ui, sans-serif" });

const Btn: React.FC<{ children: React.ReactNode; primary?: boolean; style?: React.CSSProperties }> = ({ children, primary, style }) => (
  <div style={{ height: 30, padding: "0 12px", borderRadius: 6, display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
    background: primary ? D.ink : D.panel, color: primary ? "#1A1A19" : D.ink, border: `1px solid ${primary ? D.ink : D.field}`, ...style }}>{children}</div>
);
const Field: React.FC<{ label: string; value: string; unit?: string; on?: boolean }> = ({ label, value, unit, on }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <span style={{ fontSize: 11, color: D.ink3 }}>{label}</span>
    <div style={{ height: 28, borderRadius: 6, background: D.panel2, border: `1px solid ${on ? D.accent : D.field}`, boxShadow: on ? `0 0 0 3px ${D.selChip}` : undefined,
      display: "flex", alignItems: "center", padding: "0 8px", fontSize: 12, color: D.ink }}>{value}<span style={{ marginLeft: "auto", color: D.ink4, fontSize: 11 }}>{unit}</span></div>
  </div>
);
export const Wave: React.FC<{ n?: number; seed?: number; color?: string; h?: number }> = ({ n = 40, seed = 3, color = "#7A8B99", h = 100 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 1.5, height: "100%", width: "100%" }}>
    {Array.from({ length: n }, (_, i) => <span key={i} style={{ flex: 1, minWidth: 1, height: `${(18 + hash(i, seed) * 72) * (h / 100)}%`, background: color, borderRadius: 1 }} />)}
  </div>
);

/** The mini "launch video" frame shown inside the editor canvas. */
export const MiniFrame: React.FC<{ title?: string; tint?: string; t?: number }> = ({ title = "acme", tint = "#E14BFF", t = 0 }) => (
  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 120%, ${tint}55, transparent 60%), linear-gradient(160deg, #0B0D10, #050506)`, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: "50%", top: "46%", transform: "translate(-50%,-50%)", fontFamily: "Inter", fontWeight: 800, fontSize: 64, letterSpacing: "-0.05em", color: "#fff" }}>{title}</div>
    <div style={{ position: "absolute", left: "50%", top: "62%", transform: "translateX(-50%)", fontFamily: "Inter", fontSize: 14, color: "#ffffffaa", whiteSpace: "nowrap" }}>the launch video, finally.</div>
    <div style={{ position: "absolute", left: `${30 + 40 * ((t % 60) / 60)}%`, top: "18%", width: 14, height: 14, borderRadius: 7, background: tint, boxShadow: `0 0 24px ${tint}` }} />
  </div>
);

export const StudioUI: React.FC<{ project?: string; playhead?: number; selected?: number }> = ({ project = "Acme — launch video", playhead = 0.32, selected = 1 }) => {
  const frame = useCurrentFrame();
  const scenes = [["Cold open", 0.16], ["Problem", 0.14], ["Product", 0.24], ["Features", 0.26], ["End card", 0.2]] as const;
  return (
    <div style={{ ...font(), position: "absolute", inset: 0, width: 1600, height: 900, background: D.ground, color: D.ink, display: "grid",
      gridTemplateRows: "44px 1fr 230px", gridTemplateColumns: "230px 1fr 280px", gridTemplateAreas: '"top top top" "lib pre insp" "tl tl tl"', overflow: "hidden" }}>
      {/* top bar */}
      <div style={{ gridArea: "top", display: "flex", alignItems: "center", gap: 10, padding: "0 12px 0 16px", background: D.panel, borderBottom: `1px solid ${D.line}` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, paddingRight: 14, borderRight: `1px solid ${D.line}` }}><b style={{ fontSize: 14 }}>Studio</b><span style={{ fontSize: 12, color: D.ink3 }}>by Insyd</span></div>
        <span style={{ width: 7, height: 7, borderRadius: 4, background: "#E2B45A" }} /><span style={{ fontSize: 13, fontWeight: 500 }}>{project}</span><span style={{ fontSize: 12, color: D.ink3 }}>1920×1080 · 30 fps</span>
        <div style={{ flex: 1 }} />
        <Btn><span style={{ color: D.claude }}>✦</span> Open in Claude Code</Btn>
        <Btn>Save <span style={{ background: D.hover, borderRadius: 4, padding: "0 5px", fontSize: 11 }}>12</span></Btn>
        <Btn primary>↑ Export</Btn>
      </div>
      {/* library */}
      <div style={{ gridArea: "lib", background: D.panel, borderRight: `1px solid ${D.line}`, padding: 10, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", gap: 2, padding: 2, background: D.hover, borderRadius: 7, marginBottom: 8 }}>
          {["Scenes", "Elements", "Sounds", "Brand"].map((t, i) => <div key={t} style={{ flex: 1, textAlign: "center", fontSize: 11, padding: "5px 0", borderRadius: 5, background: i === 1 ? "#3A3A38" : "transparent", color: i === 1 ? D.ink : D.ink3 }}>{t}</div>)}
        </div>
        {scenes.slice(0, 3).map(([s], si) => (
          <div key={s}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, height: 28, padding: "0 8px", fontSize: 12, fontWeight: 500 }}><span style={{ color: D.ink4 }}>›</span><span style={{ width: 8, height: 8, borderRadius: 2, background: SCENE_COLORS[si] }} />{s}</div>
            {[["T", "Headline"], ["IMG", "Logo"], ["UI", "Card"]].map(([k, n], ei) => {
              const on = si === 0 && ei === selected;
              return <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, height: 26, padding: "0 8px", marginLeft: 18, borderRadius: 5, fontSize: 12, background: on ? D.selBg : "transparent", color: on ? D.ink : D.ink2 }}>
                <span style={{ minWidth: 22, height: 17, borderRadius: 3, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600, background: on ? D.selChip : D.hover, color: on ? D.selText : D.ink3 }}>{k}</span>{n}</div>;
            })}
          </div>
        ))}
      </div>
      {/* preview */}
      <div style={{ gridArea: "pre", display: "grid", placeItems: "center", position: "relative" }}>
        <div style={{ position: "relative", width: 780, height: 439, borderRadius: 4, boxShadow: "0 0 0 1px rgba(255,255,255,.06), 0 12px 32px -12px rgba(0,0,0,.6)", overflow: "hidden" }}>
          <MiniFrame t={frame} />
          <div style={{ position: "absolute", left: 244, top: 160, width: 292, height: 88, border: `1.5px solid ${D.accent}`, borderRadius: 2 }}>
            {[[-4, -4], [288, -4], [-4, 84], [288, 84]].map(([x, y], i) => <span key={i} style={{ position: "absolute", left: x, top: y, width: 7, height: 7, background: "#fff", border: `1.5px solid ${D.accent}` }} />)}
            <span style={{ position: "absolute", left: "50%", top: -24, transform: "translateX(-50%)", background: D.accent, color: "#fff", fontSize: 11, padding: "2px 7px", borderRadius: 3, whiteSpace: "nowrap" }}>Headline</span>
          </div>
        </div>
      </div>
      {/* inspector */}
      <div style={{ gridArea: "insp", background: D.panel, borderLeft: `1px solid ${D.line}`, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 2, padding: 2, background: D.hover, borderRadius: 7 }}>{["Element", "Animation"].map((t, i) => <div key={t} style={{ flex: 1, textAlign: "center", fontSize: 11, padding: "5px 0", borderRadius: 5, background: i === 0 ? "#3A3A38" : "transparent", color: i === 0 ? D.ink : D.ink3 }}>{t}</div>)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}><span style={{ width: 26, height: 26, borderRadius: 5, background: D.hover, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, color: D.ink2 }}>T</span><div><div style={{ fontSize: 13, fontWeight: 600 }}>Headline</div><div style={{ fontSize: 11, color: D.ink3 }}>Cold open · 0.4s → 3.1s</div></div></div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>Content</div>
        <div style={{ background: D.panel2, border: `1px solid ${D.field}`, borderRadius: 6, padding: "8px 9px", fontSize: 13 }}>acme</div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>Transform</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><Field label="X" value="0" unit="px" /><Field label="Y" value="-24" unit="px" on /><Field label="Scale" value="1.20" unit="×" /><Field label="Rotation" value="0" unit="°" /></div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>Speed</div>
        <div style={{ display: "flex", gap: 6 }}>{["0.5×", "1×", "1.5×", "2×"].map((s, i) => <div key={s} style={{ flex: 1, textAlign: "center", fontSize: 12, padding: "6px 0", borderRadius: 6, border: `1px solid ${i === 2 ? D.ink : D.field}`, background: i === 2 ? D.ink : "transparent", color: i === 2 ? "#1A1A19" : D.ink2 }}>{s}</div>)}</div>
      </div>
      {/* timeline */}
      <div style={{ gridArea: "tl", background: D.panel, borderTop: `1px solid ${D.line}`, position: "relative", overflow: "hidden" }}>
        <div style={{ height: 36, display: "flex", alignItems: "center", gap: 12, padding: "0 14px", borderBottom: `1px solid ${D.line}`, fontSize: 12 }}><b>Timeline</b><span style={{ color: D.ink3 }}>5 scenes · 38 elements · 24 sounds</span><div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 2, padding: 2, background: D.hover, borderRadius: 7 }}>{["Split", "Duplicate", "Lock"].map((t) => <span key={t} style={{ padding: "3px 10px", color: D.ink2 }}>{t}</span>)}</div></div>
        <div style={{ position: "absolute", left: 14, right: 14, top: 44, height: 44, display: "flex", gap: 3 }}>
          {scenes.map(([s, w], i) => <div key={s} style={{ width: `${w * 100}%`, borderRadius: 4, background: D.panel2, border: `1px solid ${D.field}`, position: "relative", display: "flex", alignItems: "center", padding: "0 10px", fontSize: 12, fontWeight: 500, overflow: "hidden" }}>
            <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: SCENE_COLORS[i] }} />{s}</div>)}
        </div>
        {[[0.02, 0.12, 0], [0.08, 0.1, 0], [0.18, 0.12, 1], [0.33, 0.2, 2], [0.56, 0.18, 3]].map(([l, w, c], i) => (
          <div key={i} style={{ position: "absolute", left: `calc(14px + ${l * 96}%)`, width: `${w * 96}%`, top: 96 + (i % 3) * 26, height: 20, borderRadius: 4,
            background: `color-mix(in srgb, ${SCENE_COLORS[c]} 18%, ${D.panel})`, border: `1px solid ${SCENE_COLORS[c]}B3`, fontSize: 11, display: "flex", alignItems: "center", padding: "0 8px" }}>{["Headline", "Logo", "Pill carousel", "Phone", "Card"][i]}</div>
        ))}
        {[[0.04, 0.05], [0.2, 0.05], [0.36, 0.05], [0.52, 0.05], [0.7, 0.05]].map(([l, w], i) => (
          <div key={i} style={{ position: "absolute", left: `calc(14px + ${l * 96}%)`, width: `${w * 96}%`, top: 176, height: 18, borderRadius: 4, background: "#252A2E", border: "1px solid #7A8B9999", padding: "2px 4px" }}><Wave n={14} seed={i} /></div>
        ))}
        <div style={{ position: "absolute", left: 14, right: 14, top: 200, height: 20, borderRadius: 4, background: "#252A2E", border: "1px solid #5B7A9A99", padding: "2px 6px" }}><Wave n={120} seed={9} color="#5B7A9A" /></div>
        <div style={{ position: "absolute", left: `calc(14px + ${playhead * 96}%)`, top: 36, bottom: 0, width: 1, background: "#E5484D" }}><span style={{ position: "absolute", left: -5, top: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "8px solid #E5484D" }} /></div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- floating cards (feature panels)
export const Card: React.FC<{ title: string; sub?: string; w?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ title, sub, w = 420, children, style }) => (
  <div style={{ ...font(), width: w, background: "#141817", border: "1px solid #2A302E", borderRadius: 12, padding: 16, color: D.ink, boxShadow: "0 30px 80px -30px rgba(0,0,0,.9)", ...style }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: sub ? 2 : 12 }}><b style={{ fontSize: 15 }}>{title}</b><span style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid #2A302E", display: "grid", placeItems: "center", color: D.ink3, fontSize: 12 }}>⌘</span></div>
    {sub && <div style={{ fontSize: 12, color: D.ink3, marginBottom: 12 }}>{sub}</div>}
    {children}
  </div>
);

export const InspectorCard: React.FC = () => (
  <Card title="Inspector" sub="Every element, every value — editable">
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><Field label="X" value="120" unit="px" /><Field label="Y" value="-40" unit="px" on /><Field label="Scale" value="1.20" unit="×" /><Field label="Rotation" value="-4" unit="°" /></div>
    <div style={{ marginTop: 12, fontSize: 11, color: D.ink3, display: "flex", justifyContent: "space-between" }}><span>Opacity</span><span style={{ color: D.ink }}>92%</span></div>
    <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: D.line }}><div style={{ width: "92%", height: 4, borderRadius: 4, background: D.ink }} /></div>
  </Card>
);
export const SoundCard: React.FC = () => (
  <Card title="Sounds" sub="Every whoosh, click and beat on the timeline">
    {["whoosh.wav", "impact.wav", "score — dark pulse"].map((n, i) => (
      <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: D.ink3, background: D.hover, borderRadius: 3, padding: "2px 5px", minWidth: 30, textAlign: "center" }}>{i === 2 ? "MUS" : "SFX"}</span>
        <div style={{ flex: 1, height: 22, borderRadius: 4, background: "#20262A", border: "1px solid #7A8B9966", padding: "2px 6px" }}><Wave n={36} seed={i + 4} color={i === 2 ? "#5B7A9A" : "#7A8B99"} /></div>
        <span style={{ fontSize: 11, color: D.ink3, width: 34, textAlign: "right" }}>{["40%", "85%", "65%"][i]}</span>
      </div>
    ))}
  </Card>
);
export const BrandCard: React.FC = () => (
  <Card title="Brand" sub="Your logo, colours and fonts — everywhere at once">
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
      {[["Ink", "#F2F5F3"], ["Orb", "#E14BFF"], ["Accent", "#3D74E8"], ["Mint", "#3FD1A0"], ["Void", "#030404"], ["Coral", "#E9573F"]].map(([n, c]) => (
        <div key={n} style={{ display: "flex", alignItems: "center", gap: 7, padding: 6, border: "1px solid #2A302E", borderRadius: 6 }}><i style={{ width: 20, height: 20, borderRadius: 4, background: c, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.12)" }} /><div style={{ lineHeight: 1.25 }}><div style={{ fontSize: 11 }}>{n}</div><div style={{ fontSize: 10, color: D.ink3 }}>{c}</div></div></div>
      ))}
    </div>
    <div style={{ marginTop: 10, display: "flex", gap: 6 }}>{["Inter", "Geist", "Space Grotesk"].map((f, i) => <span key={f} style={{ fontSize: 11, padding: "5px 9px", borderRadius: 6, border: `1px solid ${i === 0 ? D.ink : "#2A302E"}`, color: i === 0 ? D.ink : D.ink3 }}>{f}</span>)}</div>
  </Card>
);
export const TimingCard: React.FC = () => (
  <Card title="Timing" sub="Trim, split, re-time — or speed up a whole scene">
    <div style={{ display: "flex", gap: 6 }}>{["0.5×", "1×", "1.5×", "2×"].map((s, i) => <div key={s} style={{ flex: 1, textAlign: "center", fontSize: 12, padding: "7px 0", borderRadius: 6, border: `1px solid ${i === 2 ? D.ink : D.field}`, background: i === 2 ? D.ink : "transparent", color: i === 2 ? "#1A1A19" : D.ink2 }}>{s}</div>)}</div>
    <div style={{ position: "relative", height: 34, marginTop: 12, display: "flex", gap: 3 }}>{[0.3, 0.2, 0.5].map((w, i) => <div key={i} style={{ width: `${w * 100}%`, borderRadius: 4, background: D.panel2, border: `1px solid ${i === 1 ? D.ink : D.field}`, position: "relative" }}><span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: SCENE_COLORS[i + 1] }} /></div>)}</div>
  </Card>
);
export const ClaudeCard: React.FC<{ progress?: number }> = ({ progress = 1 }) => (
  <Card title="Claude" sub="Edits live in the editor over MCP — one undo step each">
    {["set_text  headline → “acme”", "set_sounds  whoosh → 40%", "set_value  brand.orb → #E14BFF", "save  → 12 edits written to code"].map((l, i) => (
      <div key={l} style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: theme.fonts.mono, fontSize: 11.5, color: i < progress * 4 ? D.ink : D.dis, marginBottom: 7 }}>
        <span style={{ color: i < progress * 4 ? D.ok : D.dis }}>{i < progress * 4 ? "✓" : "○"}</span>{l}</div>
    ))}
  </Card>
);
export const ExportCard: React.FC<{ p?: number }> = ({ p = 0.72 }) => (
  <Card title="Export" sub="MP4 · H.264 · 3840×2160 · 60 fps">
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: D.ink2 }}><span>Rendering frame {Math.round(p * 3480)} / 3480</span><span style={{ color: D.ink }}>{Math.round(p * 100)}%</span></div>
    <div style={{ marginTop: 8, height: 6, borderRadius: 6, background: D.line }}><div style={{ width: `${p * 100}%`, height: 6, borderRadius: 6, background: theme.colors.mint }} /></div>
  </Card>
);
