// The template catalogue (served from templates/<slug>/.studio/manifest.json).
export type Scene = { id: string; label: string; frames: number };
export type Template = {
  slug: string; title: string; tagline: string; description: string; category: string; tags: string[];
  author: string; music?: string; order?: number; background?: string;
  width: number; height: number; fps: number; durationInFrames: number;
  scenes: Scene[]; counts: { clips: number; sounds: number; values: number; brand: number };
  palette: Array<{ name: string; value: string }>; fonts: string[];
  preview: string | null; poster: string | null; installed: boolean;
};

export const fetchTemplates = (): Promise<{ templates: Template[]; projectsDir: string }> => fetch("/api/templates").then((r) => r.json());
export const fetchTemplate = (slug: string): Promise<Template> => fetch(`/api/templates/${slug}`).then((r) => { if (!r.ok) throw new Error("Template not found"); return r.json(); });

export const duration = (t: Pick<Template, "durationInFrames" | "fps">) => {
  const s = Math.round(t.durationInFrames / t.fps);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
export const aspect = (t: Pick<Template, "width" | "height">) => (t.width === t.height ? "1:1" : t.width > t.height ? (Math.abs(t.width / t.height - 16 / 9) < 0.02 ? "16:9" : `${t.width}×${t.height}`) : "9:16");

/** The template's most characteristic colours: most colourful first, near-duplicates dropped. */
export const signature = (t: Pick<Template, "palette">, n = 5) => {
  const rgb = (hex: string) => { const h = hex.replace("#", ""); const v = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const chroma = (hex: string) => { const [r, g, b] = rgb(hex); return Math.max(r, g, b) - Math.min(r, g, b); };
  const dist = (a: string, b: string) => { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  const out: Template["palette"] = [];
  for (const c of [...t.palette].filter((c) => /^#[0-9a-f]{3,8}$/i.test(c.value)).sort((a, b) => chroma(b.value) - chroma(a.value))) {
    if (out.every((o) => dist(o.value, c.value) > 60)) out.push(c);
    if (out.length === n) break;
  }
  return out;
};
