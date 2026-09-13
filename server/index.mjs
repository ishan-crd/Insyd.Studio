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
import { renderMedia, selectComposition, makeCancelSignal } from "@remotion/renderer";
import { buildIndex, applyLayout } from "./codemod.mjs";

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

// ---------- audio files ----------
const AUDIO_EXT = /\.(wav|mp3|m4a|aac|ogg|flac|webm)$/i;
app.get("/api/audio/list", (_req, res) => {
  const dir = process.env.INSYD_PROJECT;
  if (!dir) return res.status(400).json({ error: "No project open" });
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
  res.json({ files: out.sort((a, b) => a.src.localeCompare(b.src)) });
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

// ---------- vite ----------
// Production React by default: the dev build roughly doubles the per-frame cost of the hosted
// composition. INSYD_DEV=1 switches back to the dev build (Fast Refresh, React warnings).
const mode = process.env.INSYD_DEV ? "development" : "production";
process.env.NODE_ENV = mode;
vite = await createViteServer({ root: ROOT, mode, server: { middlewareMode: true, port: PORT, hmr: true }, appType: "spa" });
app.use(vite.middlewares);

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  Insyd Studio  →  ${url}\n  project: ${process.env.INSYD_PROJECT || "(none open)"}\n`);
  if (!process.env.INSYD_NO_OPEN && process.platform === "darwin") exec("open", [url]).catch(() => {});
});
