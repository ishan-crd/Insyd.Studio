// Insyd Studio dev/desktop server: Vite (middleware mode) + a small JSON API.
import express from "express";
import { createServer as createViteServer } from "vite";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderFrames, renderStill, selectComposition, makeCancelSignal } from "@remotion/renderer";
import http from "node:http";
import crypto from "node:crypto";
import { buildIndex, applyLayout } from "./codemod.mjs";
import { buildBrief, writeClaudeMd } from "./context.mjs";
import { attachBridge, bridge } from "./bridge.mjs";
import { mountMcp } from "./mcp.mjs";

const exec = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE_DIR = path.join(ROOT, ".insyd");
const STATE_FILE = path.join(STATE_DIR, "project.json");
const PORT = Number(process.env.PORT || 4321);

fs.mkdirSync(STATE_DIR, { recursive: true });

const readState = () => {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch { return { path: null, recent: [] }; }
};
const writeState = (s) => fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));

const editorEntry = (dir) => ["src/editor.tsx", "src/editor.ts"].map((f) => path.join(dir, f)).find((f) => fs.existsSync(f)) ?? null;

const describeProject = (dir) => {
  if (!dir || !fs.existsSync(dir)) return { path: dir, exists: false };
  const entry = editorEntry(dir);
  const hasSdk = fs.existsSync(path.join(dir, "src/insyd/index.tsx"));
  const hasRemotion = fs.existsSync(path.join(dir, "node_modules/remotion"));
  let name = path.basename(dir);
  try { name = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")).name || name; } catch {}
  return { path: dir, exists: true, name, entry, hasSdk, hasRemotion, ready: Boolean(entry && hasSdk && hasRemotion) };
};

let state = readState();
process.env.INSYD_PROJECT = state.path && describeProject(state.path).ready ? state.path : "";

const app = express();
app.use(express.json({ limit: "20mb" }));

// ---------- project ----------
app.get("/api/project", (_req, res) => {
  const s = readState();
  res.json({ current: s.path ? describeProject(s.path) : null, recent: (s.recent ?? []).map(describeProject) });
});

app.post("/api/project/pick", async (_req, res) => {
  try {
    const { stdout } = await exec("osascript", ["-e", 'POSIX path of (choose folder with prompt "Open a Remotion project folder")']);
    res.json({ path: stdout.trim().replace(/\/$/, "") });
  } catch (e) {
    res.json({ path: null, cancelled: true });
  }
});

app.post("/api/project/inspect", (req, res) => res.json(describeProject(req.body.path)));

app.post("/api/project/init", async (req, res) => {
  // Vendor the SDK into the project and scaffold src/editor.ts if missing.
  const dir = req.body.path;
  try {
    const info = describeProject(dir);
    if (!info.exists) throw new Error("Folder not found");
    await fsp.mkdir(path.join(dir, "src/insyd"), { recursive: true });
    await fsp.copyFile(path.join(ROOT, "sdk/index.tsx"), path.join(dir, "src/insyd/index.tsx"));
    if (!fs.existsSync(path.join(dir, "layout.json"))) {
      await fsp.writeFile(path.join(dir, "layout.json"), JSON.stringify({ version: 1, elements: {}, copy: {}, scenes: {} }, null, 2));
    }
    if (!editorEntry(dir)) {
      await fsp.writeFile(path.join(dir, "src/editor.ts"), await fsp.readFile(path.join(ROOT, "sdk/editor.template.ts"), "utf8"));
    }
    res.json(describeProject(dir));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

let vite;
app.post("/api/project/open", async (req, res) => {
  const dir = req.body.path;
  const info = describeProject(dir);
  if (!info.ready) return res.status(400).json({ error: "Project is not ready", info });
  const s = readState();
  s.path = dir;
  s.recent = [dir, ...(s.recent ?? []).filter((p) => p !== dir)].slice(0, 8);
  writeState(s);
  process.env.INSYD_PROJECT = dir;
  res.json({ ok: true, info });
  // Restart Vite so the @project alias points at the new folder.
  setTimeout(() => vite?.restart().catch((e) => console.error("[insyd] vite restart failed", e)), 50);
});

app.post("/api/project/close", async (_req, res) => {
  const s = readState(); s.path = null; writeState(s);
  process.env.INSYD_PROJECT = "";
  res.json({ ok: true });
  setTimeout(() => vite?.restart().catch(() => {}), 50);
});

// ---------- layout ----------
app.get("/api/layout", async (req, res) => {
  const dir = process.env.INSYD_PROJECT;
  const file = path.join(dir, req.query.file || "layout.json");
  try { res.json(JSON.parse(await fsp.readFile(file, "utf8"))); } catch { res.json(null); }
});
app.post("/api/layout", async (req, res) => {
  const dir = process.env.INSYD_PROJECT;
  if (!dir) return res.status(400).json({ error: "No project open" });
  const file = path.join(dir, req.body.file || "layout.json");
  await fsp.writeFile(file, JSON.stringify(req.body.layout, null, 2) + "\n");
  res.json({ ok: true, file });
});

// ---------- code write-back ----------
app.get("/api/index", (_req, res) => {
  const dir = process.env.INSYD_PROJECT;
  if (!dir) return res.status(400).json({ error: "No project open" });
  const { byLocator, files } = buildIndex(dir);
  res.json({
    locators: Object.fromEntries([...byLocator.entries()].map(([k, e]) => [k, { file: path.relative(dir, e.file), literal: e.literal ?? true }])),
    errors: files.filter((f) => f.error).map((f) => ({ file: path.relative(dir, f.file), error: f.error })),
  });
});

// Writes overrides into the source files. Anything that has no literal in the code is kept in
// layout.json so nothing is lost. The watcher is muted for the touched files so the editor does not
// reload mid-save; the client reloads itself once the response arrives.
app.post("/api/apply", async (req, res) => {
  const dir = process.env.INSYD_PROJECT;
  if (!dir) return res.status(400).json({ error: "No project open" });
  const { layout, layoutFile = "layout.json" } = req.body;
  try {
    const files = (await import("./codemod.mjs")).listSourceFiles(dir);
    files.forEach((f) => vite?.watcher.unwatch(f));
    const result = applyLayout(dir, layout);
    const fallbackPath = path.join(dir, layoutFile);
    let fallback = { version: 3, elements: {}, copy: {}, scenes: {}, props: {}, sounds: {} };
    try { fallback = { ...fallback, ...JSON.parse(await fsp.readFile(fallbackPath, "utf8")) }; } catch {}
    // resolved ids leave the fallback file; unresolved ones are stored there
    for (const k of ["elements", "copy", "scenes", "props", "sounds"]) {
      fallback[k] = fallback[k] ?? {};
      for (const id of Object.keys(result.applied[k])) delete fallback[k][id];
      Object.assign(fallback[k], result.unresolved[k]);
    }
    await fsp.writeFile(fallbackPath, JSON.stringify(fallback, null, 2) + "\n");
    // invalidate so the next page load compiles the new source
    for (const f of result.changed) { const mods = vite?.moduleGraph.getModulesByFile(f); mods?.forEach((m) => vite.moduleGraph.invalidateModule(m)); }
    setTimeout(() => files.forEach((f) => vite?.watcher.add(f)), 1500);
    res.json({ ok: true, changed: result.changed.map((f) => path.relative(dir, f)), unresolved: result.unresolved, fallback });
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
});

// ---------- Claude Code hand-off ----------
const findClaude = async () => {
  try { const { stdout } = await exec("/bin/zsh", ["-lc", "command -v claude"]); return stdout.trim() || null; } catch { return null; }
};
const makeContext = (body) => {
  const dir = process.env.INSYD_PROJECT;
  const index = buildIndex(dir);
  const brief = buildBrief({ dir, def: body.def, scan: body.scan, layout: body.layout, index, port: PORT });
  const file = writeClaudeMd(dir, brief);
  return { dir, brief, file };
};
// Regenerates CLAUDE.md and returns the brief (also used for "Copy context").
app.post("/api/claude/context", (req, res) => {
  if (!process.env.INSYD_PROJECT) return res.status(400).json({ error: "No project open" });
  try { const { brief, file } = makeContext(req.body); res.json({ ok: true, brief, file: path.basename(file) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
// Opens Terminal in the project and starts Claude Code with a kickoff prompt.
app.post("/api/claude/open", async (req, res) => {
  const dir = process.env.INSYD_PROJECT;
  if (!dir) return res.status(400).json({ error: "No project open" });
  try {
    const { brief } = makeContext(req.body);
    const claude = await findClaude();
    if (!claude) return res.json({ ok: false, brief, reason: "claude-not-found" });
    const kickoff = "You are connected to Studio by Insyd for this project: the editor is open and the person is watching it. You have the insyd-studio MCP tools — prefer them for changes (they apply live in the editor and are undoable; use set_sounds/set_values for bulk edits, preview_frame to look, save to write into the code). Edit source files directly only for structural changes the tools cannot express. CLAUDE.md has the full inventory. Reply with one line confirming you are connected (call get_project), then wait for instructions.";
    const q = (s) => "'" + s.replace(/'/g, `'\\''`) + "'";
    const cmd = `cd ${q(dir)} && clear && ${q(claude)} --mcp-config ${q(mcpConfigPath)} ${q(kickoff)}`;
    const script = `tell application "Terminal"
  activate
  do script ${JSON.stringify(cmd)}
end tell`;
    if (req.body.dryRun) return res.json({ ok: true, brief, claude, cmd });
    await exec("osascript", ["-e", script]);
    res.json({ ok: true, brief });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- audio files ----------
const AUDIO_EXT = /\.(wav|mp3|m4a|aac|ogg|flac|webm)$/i;
const listAudio = (dir) => {
  const pub = path.join(dir, "public");
  const out = [];
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (AUDIO_EXT.test(e.name)) out.push({ src: path.relative(pub, p).split(path.sep).join("/"), bytes: fs.statSync(p).size });
    }
  };
  walk(pub);
  return out.sort((a, b) => a.src.localeCompare(b.src));
};
app.get("/api/audio/list", (_req, res) => {
  const dir = process.env.INSYD_PROJECT;
  if (!dir) return res.status(400).json({ error: "No project open" });
  res.json({ files: listAudio(dir) });
});
// Upload (base64 JSON) into public/<dir>/; returns the src to use in the layout/code.
app.post("/api/audio/upload", async (req, res) => {
  const dir = process.env.INSYD_PROJECT;
  if (!dir) return res.status(400).json({ error: "No project open" });
  const { name, data, folder = "sfx", overwrite = false } = req.body;
  if (!name || !data || !AUDIO_EXT.test(name)) return res.status(400).json({ error: "Need an audio file (wav, mp3, m4a, aac, ogg, flac)" });
  const safe = name.replace(/[^\w.\- ]+/g, "_");
  const target = path.join(dir, "public", folder);
  await fsp.mkdir(target, { recursive: true });
  let file = path.join(target, safe);
  if (!overwrite && fs.existsSync(file)) { const ext = path.extname(safe); file = path.join(target, `${path.basename(safe, ext)}-${Date.now().toString(36)}${ext}`); }
  await fsp.writeFile(file, Buffer.from(data, "base64"));
  res.json({ src: path.relative(path.join(dir, "public"), file).split(path.sep).join("/") });
});

// ---------- filmstrip thumbnails ----------
// One background renderFrames pass (every Nth frame, thumbnail scale) per project state, cached under
// .insyd/thumbs/<project>/<key>/. The key changes when the source, public assets or layout.json change.
const THUMB_W = 160;
const thumbJobs = new Map(); // key -> { status, progress, error }
const slugOf = (dir) => path.basename(dir).replace(/[^\w.-]+/g, "_") + "-" + crypto.createHash("md5").update(dir).digest("hex").slice(0, 6);
const thumbKey = (dir, layoutFile) => {
  let lm = 0; try { lm = fs.statSync(path.join(dir, layoutFile)).mtimeMs; } catch {}
  return crypto.createHash("md5").update([newestMtime(path.join(dir, "src")), newestMtime(path.join(dir, "public")), lm, THUMB_W].join("|")).digest("hex").slice(0, 12);
};
app.use("/thumbs", express.static(path.join(STATE_DIR, "thumbs"), { maxAge: "30d", immutable: true }));

app.post("/api/thumbs", async (req, res) => {
  const dir = process.env.INSYD_PROJECT;
  if (!dir) return res.status(400).json({ error: "No project open" });
  const { compositionId, entryPoint, layoutFile = "layout.json", every = 15 } = req.body;
  const slug = slugOf(dir), key = thumbKey(dir, layoutFile);
  const outDir = path.join(STATE_DIR, "thumbs", slug, key);
  const manifestPath = path.join(outDir, "manifest.json");
  const base = `/thumbs/${slug}/${key}`;
  if (fs.existsSync(manifestPath)) return res.json({ status: "ready", key, base, ...JSON.parse(fs.readFileSync(manifestPath, "utf8")) });
  const running = thumbJobs.get(key);
  if (running) return res.json({ status: running.status, key, base, progress: running.progress, error: running.error });
  const job = { status: "running", progress: 0, error: null };
  thumbJobs.set(key, job);
  res.json({ status: "running", key, base, progress: 0 });
  (async () => {
    try {
      const serveUrl = await getBundle(dir, entryPoint, () => {});
      const composition = await selectComposition({ serveUrl, id: compositionId });
      const tmp = outDir + ".tmp";
      await fsp.rm(tmp, { recursive: true, force: true });
      await fsp.mkdir(tmp, { recursive: true });
      await renderFrames({
        composition, serveUrl, outputDir: tmp, imageFormat: "jpeg", jpegQuality: 70,
        scale: THUMB_W / composition.width, everyNthFrame: every,
        onStart: () => {}, onFrameUpdate: (n) => { job.progress = n / Math.ceil(composition.durationInFrames / every); },
      });
      const files = (await fsp.readdir(tmp)).filter((f) => f.endsWith(".jpeg")).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
      const manifest = { every, count: files.length, width: THUMB_W, height: Math.round((THUMB_W * composition.height) / composition.width), fps: composition.fps, durationInFrames: composition.durationInFrames, files };
      await fsp.writeFile(path.join(tmp, "manifest.json"), JSON.stringify(manifest));
      await fsp.rm(outDir, { recursive: true, force: true });
      await fsp.rename(tmp, outDir);
      // keep only the newest 3 keys per project
      const parent = path.join(STATE_DIR, "thumbs", slug);
      const keys = (await fsp.readdir(parent)).filter((k) => !k.endsWith(".tmp")).map((k) => ({ k, t: fs.statSync(path.join(parent, k)).mtimeMs })).sort((a, b) => b.t - a.t);
      for (const old of keys.slice(3)) await fsp.rm(path.join(parent, old.k), { recursive: true, force: true });
      job.status = "ready"; job.progress = 1;
    } catch (e) {
      job.status = "error"; job.error = e.message;
    } finally {
      setTimeout(() => thumbJobs.delete(key), 60_000);
    }
  })();
});

// ---------- render ----------
const jobs = new Map();
const bundles = new Map(); // projectDir -> { serveUrl, at }

const newestMtime = (dir) => {
  let m = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else m = Math.max(m, fs.statSync(p).mtimeMs);
    }
  };
  try { walk(dir); } catch {}
  return m;
};

const getBundle = async (dir, entryPoint, onProgress) => {
  const cached = bundles.get(dir);
  const srcChanged = newestMtime(path.join(dir, "src")) > (cached?.at ?? 0) || newestMtime(path.join(dir, "public")) > (cached?.at ?? 0);
  if (cached && !srcChanged) return cached.serveUrl;
  const serveUrl = await bundle({
    entryPoint: path.join(dir, entryPoint),
    publicDir: path.join(dir, "public"),
    onProgress,
  });
  bundles.set(dir, { serveUrl, at: Date.now() });
  return serveUrl;
};

app.post("/api/render", (req, res) => {
  const dir = process.env.INSYD_PROJECT;
  if (!dir) return res.status(400).json({ error: "No project open" });
  const { compositionId, entryPoint, inputProps, fileName, codec = "h264", crf = 16 } = req.body;
  const id = Math.random().toString(36).slice(2, 10);
  const outDir = path.join(os.homedir(), "Desktop");
  const outputLocation = path.join(outDir, fileName || `${compositionId}.mp4`);
  const job = { id, stage: "bundling", progress: 0, outputLocation, error: null, listeners: new Set(), cancel: null };
  jobs.set(id, job);
  const update = (patch) => { Object.assign(job, patch); for (const l of job.listeners) l(); };
  (async () => {
    try {
      const serveUrl = await getBundle(dir, entryPoint, (p) => update({ stage: "bundling", progress: p / 100 }));
      update({ stage: "preparing", progress: 0 });
      const composition = await selectComposition({ serveUrl, id: compositionId, inputProps });
      update({ stage: "rendering", progress: 0 });
      const { cancelSignal, cancel } = makeCancelSignal();
      job.cancel = cancel;
      await renderMedia({
        composition, serveUrl, codec, crf, inputProps, outputLocation, cancelSignal,
        onProgress: ({ progress }) => update({ stage: "rendering", progress }),
      });
      update({ stage: "done", progress: 1 });
    } catch (e) {
      update({ stage: "error", error: e.message });
    }
  })();
  res.json({ id, outputLocation });
});


app.get("/api/render/:id/events", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).end();
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders();
  const send = () => res.write(`data: ${JSON.stringify({ stage: job.stage, progress: job.progress, error: job.error, outputLocation: job.outputLocation })}\n\n`);
  send();
  job.listeners.add(send);
  req.on("close", () => job.listeners.delete(send));
});
app.post("/api/render/:id/cancel", (req, res) => { jobs.get(req.params.id)?.cancel?.(); res.json({ ok: true }); });

app.post("/api/reveal", async (req, res) => {
  try { await exec("open", ["-R", req.body.path]); res.json({ ok: true }); } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post("/api/open-file", async (req, res) => {
  try { await exec("open", [req.body.path]); res.json({ ok: true }); } catch (e) { res.status(400).json({ error: e.message }); }
});

// ---------- project assets: staticFile() resolves against the editor origin ----------
app.use((req, res, next) => {
  const dir = process.env.INSYD_PROJECT;
  if (!dir || req.path.startsWith("/api/") || req.path.startsWith("/@") || req.path.startsWith("/src/") || req.path.startsWith("/node_modules/")) return next();
  const file = path.join(dir, "public", decodeURIComponent(req.path));
  if (file.startsWith(path.join(dir, "public")) && fs.existsSync(file) && fs.statSync(file).isFile()) return res.sendFile(file);
  next();
});

// ---------- MCP (Claude control) ----------
const MCP_URL = `http://localhost:${PORT}/mcp`;
const stillCache = { serveUrl: null };
mountMcp(app, {
  projectDir: () => process.env.INSYD_PROJECT,
  buildBrief: (payload) => { const dir = process.env.INSYD_PROJECT; return buildBrief({ dir, def: payload.def, scan: payload.scan, layout: payload.layout, index: buildIndex(dir), port: PORT }); },
  listAudio: () => listAudio(process.env.INSYD_PROJECT),
  renderJob: (id) => jobs.get(id),
  still: async ({ frame, layout, width }) => {
    const dir = process.env.INSYD_PROJECT;
    const entry = fs.existsSync(path.join(dir, "src/index.ts")) ? "src/index.ts" : "src/index.tsx";
    const serveUrl = await getBundle(dir, entry, () => {});
    const compId = (await bridge.call("state")).id;
    const composition = await selectComposition({ serveUrl, id: compId, inputProps: { layout } });
    const out = path.join(os.tmpdir(), `insyd-still-${Date.now()}.jpg`);
    await renderStill({ composition, serveUrl, output: out, frame, inputProps: { layout }, imageFormat: "jpeg", jpegQuality: 80, scale: width / composition.width });
    const buf = await fsp.readFile(out); await fsp.rm(out, { force: true });
    return buf;
  },
});
app.get("/api/mcp/status", (_req, res) => res.json({ url: MCP_URL, editorConnected: bridge.connected() }));
// MCP config file Claude Code can load with --mcp-config
const mcpConfigPath = path.join(STATE_DIR, "mcp.json");
fs.writeFileSync(mcpConfigPath, JSON.stringify({ mcpServers: { "insyd-studio": { type: "http", url: MCP_URL } } }, null, 2));

// ---------- vite ----------
// Production React by default: the dev build roughly doubles the per-frame cost of the hosted
// composition. INSYD_DEV=1 switches back to the dev build (Fast Refresh, React warnings).
const mode = process.env.INSYD_DEV ? "development" : "production";
process.env.NODE_ENV = mode;
vite = await createViteServer({ root: ROOT, mode, server: { middlewareMode: true, port: PORT, hmr: true }, appType: "spa" });
app.use(vite.middlewares);

const httpServer = http.createServer(app);
attachBridge(httpServer);
httpServer.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  Insyd Studio  →  ${url}\n  project: ${process.env.INSYD_PROJECT || "(none open)"}\n  MCP:     ${MCP_URL}\n`);
  if (!process.env.INSYD_NO_OPEN && process.platform === "darwin") exec("open", [url]).catch(() => {});
});
