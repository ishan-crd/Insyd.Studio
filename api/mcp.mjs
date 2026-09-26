// The hosted MCP at https://studio.insyd.in/mcp (a Vercel function): lets any Claude browse the template
// marketplace and fetch a template, from anywhere. It is read-only — editing happens in Studio on your
// computer, whose own MCP (http://localhost:4321/mcp) drives the open editor.
//   claude mcp add --transport http insyd-templates https://studio.insyd.in/mcp
import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const REPO = "https://github.com/ishan-crd/Insyd.Studio";
const DIR = path.join(process.cwd(), "templates");

const catalogue = () => fs.readdirSync(DIR, { withFileTypes: true }).filter((e) => e.isDirectory())
  .map((e) => { try { return { slug: e.name, ...JSON.parse(fs.readFileSync(path.join(DIR, e.name, ".studio", "manifest.json"), "utf8")) }; } catch { return null; } })
  .filter(Boolean).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

const secs = (t) => Math.round(t.durationInFrames / t.fps);
const urls = (base, t) => ({
  page: `${base}/templates/${t.slug}`, preview: `${base}/template-media/${t.slug}/preview.mp4`,
  poster: `${base}/template-media/${t.slug}/poster.jpg`, download: `${base}/downloads/${t.slug}.zip`,
});
const summary = (base, t) => ({
  slug: t.slug, title: t.title, tagline: t.tagline, category: t.category, tags: t.tags,
  format: `${t.width}×${t.height} · ${t.fps} fps · ${secs(t)} s`, scenes: t.scenes.length, ...t.counts, ...urls(base, t),
});
const text = (s, structured) => ({ content: [{ type: "text", text: s }], ...(structured ? { structuredContent: structured } : {}) });
const SETUP = `Studio runs on your computer (Node 20+):
  git clone ${REPO}
  cd Insyd.Studio && npm install && npm run dev      → http://localhost:4321
Then either click "Edit in Studio" on a template there, or unzip a template download, run npm install
inside it and choose "Open a project" in Studio.
To let Claude edit the video live, connect Studio's own MCP (it drives the open editor):
  claude mcp add --transport http insyd-studio http://localhost:4321/mcp`;

const build = (base) => {
  const server = new McpServer({ name: "insyd-templates", version: "1.0.0" }, {
    instructions: `Studio by Insyd's template marketplace (${base}). Launch-video templates that open in Studio, a local editor where every clip, sound and value is editable and written back into the code. Use list_templates / get_template to pick one, then give the person its download link and get_started. This server is read-only; editing is done by Studio's local MCP.`,
  });
  server.registerTool("list_templates", {
    title: "List templates",
    description: "Every launch-video template in the marketplace: title, tagline, category, format, how many scenes/clips/sounds/values are editable, and links (page, preview mp4, poster, zip download). Optionally filter by category or a search phrase.",
    inputSchema: { query: z.string().optional().describe("filter by words in the title, tagline, category or tags"), category: z.string().optional() },
    annotations: { readOnlyHint: true },
  }, async ({ query, category }) => {
    const q = (query ?? "").toLowerCase();
    const list = catalogue().filter((t) => (!category || t.category.toLowerCase() === category.toLowerCase())
      && (!q || [t.title, t.tagline, t.category, ...(t.tags ?? [])].join(" ").toLowerCase().includes(q))).map((t) => summary(base, t));
    const lines = list.map((t) => `• ${t.title} (${t.slug}) — ${t.tagline}\n  ${t.category} · ${t.format} · ${t.scenes} scenes · ${t.clips} clips · ${t.sounds} sounds\n  ${t.page}`);
    return text(list.length ? `${list.length} template${list.length === 1 ? "" : "s"}:\n\n${lines.join("\n\n")}` : "No templates match.", { templates: list });
  });
  server.registerTool("get_template", {
    title: "Get a template",
    description: "Everything about one template: description, scenes with their lengths, what is editable, palette, fonts, music, and links to its page, preview, poster and source download.",
    inputSchema: { slug: z.string().describe("the template's slug, from list_templates") },
    annotations: { readOnlyHint: true },
  }, async ({ slug }) => {
    const t = catalogue().find((x) => x.slug === slug);
    if (!t) return { ...text(`No template "${slug}". Available: ${catalogue().map((x) => x.slug).join(", ")}`), isError: true };
    const u = urls(base, t);
    const scenes = t.scenes.map((s) => `  ${s.label} — ${(s.frames / t.fps).toFixed(1)} s`).join("\n");
    const out = `${t.title} — ${t.tagline}\n\n${t.description}\n\nFormat: ${t.width}×${t.height}, ${t.fps} fps, ${secs(t)} s · ${t.category}\nScenes:\n${scenes}\n\nEditable in Studio: ${t.counts.clips} clips, ${t.counts.sounds} sounds, ${t.counts.values} values, ${t.counts.brand} brand tokens\nPalette: ${t.palette.map((c) => `${c.name} ${c.value}`).join(", ")}\nFonts: ${t.fonts.join(", ") || "—"}${t.music ? `\nMusic: ${t.music}` : ""}\n\nPage: ${u.page}\nPreview: ${u.preview}\nDownload: ${u.download}`;
    return text(out, { ...t, ...u });
  });
  server.registerTool("get_started", {
    title: "Set up Studio",
    description: "How to run Studio locally, open a template in it, and connect Studio's own MCP so Claude can edit the video live.",
    inputSchema: {}, annotations: { readOnlyHint: true },
  }, async () => text(SETUP));
  return server;
};

export default async function handler(req, res) {
  const proto = String(req.headers["x-forwarded-proto"] ?? (req.socket?.encrypted ? "https" : "http")).split(",")[0];
  const base = `${proto}://${req.headers["x-forwarded-host"] ?? req.headers.host ?? "studio.insyd.in"}`;
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type, mcp-session-id, mcp-protocol-version, authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  // a browser opening the URL gets a short description instead of a protocol error
  if (req.method === "GET" && !String(req.headers.accept ?? "").includes("text/event-stream")) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).end(JSON.stringify({
      name: "insyd-templates", description: "Studio by Insyd — template marketplace MCP (read-only)",
      connect: `claude mcp add --transport http insyd-templates ${base}/mcp`, tools: ["list_templates", "get_template", "get_started"],
      editing: "Studio's own MCP runs locally with the editor: http://localhost:4321/mcp",
    }, null, 2));
  }
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).end(); }
  const server = build(base);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
