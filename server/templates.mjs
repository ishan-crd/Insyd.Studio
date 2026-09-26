// Templates + processed project files.
//
// A template is a Remotion project under templates/<slug>/ with a `.studio/` folder of processed files:
//   manifest.json   title, copy, tags + generated facts (size, scenes, clips, sounds, palette, fonts, hash)
//   preview.mp4     half-size render with sound (marketplace hover + detail page)
//   poster.jpg      the card image
//   scan.json       when every element is on screen + every sound (Studio skips its analysis pass)
//   thumbs/         filmstrip frames for the timeline's scene track
// Everything processed is keyed by a *content* hash of src/, public/ and layout.json, so a copy of a
// template (or a project moved to another machine) is still recognised, and any edit invalidates it.
// Studio writes scan.json / thumbs/ for every project it opens, so any project becomes instant too.
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import express from "express";

export const STUDIO_DIR = ".studio";

// ---------- content hash ----------
const walkFiles = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, out); else out.push(p);
  }
  return out;
};
const memo = new Map(); // dir -> { stamp, hash }
/** md5 of every file under src/ and public/ plus layout.json (paths + bytes). Memoised on mtimes. */
export const sourceHash = (dir, layoutFile = "layout.json") => {
  const files = [...walkFiles(path.join(dir, "src")), ...walkFiles(path.join(dir, "public")), path.join(dir, layoutFile)].filter((f) => fs.existsSync(f)).sort();
  const stamp = files.map((f) => { const s = fs.statSync(f); return `${f}:${s.mtimeMs}:${s.size}`; }).join("|");
  const m = memo.get(dir);
  if (m && m.stamp === stamp) return m.hash;
  const h = crypto.createHash("md5");
  for (const f of files) { h.update(path.relative(dir, f)); h.update("\0"); h.update(fs.readFileSync(f)); }
  const hash = h.digest("hex").slice(0, 16);
  memo.set(dir, { stamp, hash });
  return hash;
};

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };

// ---------- catalogue ----------
const listTemplates = (root) => {
  const dir = path.join(root, "templates");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory())
    .map((e) => ({ slug: e.name, dir: path.join(dir, e.name), manifest: readJson(path.join(dir, e.name, STUDIO_DIR, "manifest.json")) }))
    .filter((t) => t.manifest)
    .map(({ slug, dir: d, manifest }) => ({
      ...manifest, slug,
      preview: fs.existsSync(path.join(d, STUDIO_DIR, "preview.mp4")) ? `/template-media/${slug}/preview.mp4` : null,
      poster: fs.existsSync(path.join(d, STUDIO_DIR, "poster.jpg")) ? `/template-media/${slug}/poster.jpg` : null,
      installed: fs.existsSync(path.join(d, "node_modules", "remotion")),
    }))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.title.localeCompare(b.title));
};

// ---------- using a template ----------
const PROJECTS_DIR = process.env.INSYD_PROJECTS_DIR || path.join(os.homedir(), "Documents", "Studio Projects");
const run = (cmd, args, cwd) => new Promise((resolve, reject) => {
  const p = spawn(cmd, args, { cwd, stdio: "ignore" });
  p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`))));
  p.on("error", reject);
});
const uses = new Map(); // slug -> { stage, path, error }

/** Copy the template into ~/Documents/Studio Projects/<slug>[-n] (node_modules shared by symlink) and open it. */
const useTemplate = async (root, slug, openProject, job) => {
  const src = path.join(root, "templates", slug);
  if (!fs.existsSync(path.join(src, "node_modules", "remotion"))) {
    job.stage = "Installing the template's packages (first use only)…";
    await run("npm", ["install", "--no-audit", "--no-fund"], src);
  }
  job.stage = "Creating your copy…";
  await fsp.mkdir(PROJECTS_DIR, { recursive: true });
  let dest = path.join(PROJECTS_DIR, slug), n = 2;
  while (fs.existsSync(dest)) dest = path.join(PROJECTS_DIR, `${slug}-${n++}`);
  await fsp.cp(src, dest, { recursive: true, filter: (s) => { const rel = path.relative(src, s); return !(rel === "node_modules" || rel.startsWith("node_modules" + path.sep) || rel === "out" || rel.startsWith("out" + path.sep)); } });
  await fsp.symlink(path.join(src, "node_modules"), path.join(dest, "node_modules"), "dir");
  // the copy is yours: give it its own package name
  try { const pj = JSON.parse(await fsp.readFile(path.join(dest, "package.json"), "utf8")); pj.name = path.basename(dest); await fsp.writeFile(path.join(dest, "package.json"), JSON.stringify(pj, null, 2) + "\n"); } catch {}
  job.stage = "Opening Studio…";
  job.path = dest;
  openProject(dest);
  job.stage = "done";
};

export const mountTemplates = (app, { root, getProject, openProject }) => {
  app.get("/api/templates", (_req, res) => res.json({ templates: listTemplates(root), projectsDir: PROJECTS_DIR }));
  app.get("/api/templates/:slug", (req, res) => {
    const t = listTemplates(root).find((x) => x.slug === req.params.slug);
    t ? res.json(t) : res.status(404).json({ error: "No such template" });
  });
  app.use("/template-media/:slug", (req, res, next) => {
    if (!/^[\w.-]+$/.test(req.params.slug)) return res.status(400).end();
    express.static(path.join(root, "templates", req.params.slug, STUDIO_DIR), { maxAge: "1h" })(req, res, next);
  });
  app.post("/api/templates/:slug/use", (req, res) => {
    const slug = req.params.slug;
    if (!listTemplates(root).some((t) => t.slug === slug)) return res.status(404).json({ error: "No such template" });
    const job = { stage: "Starting…", path: null, error: null };
    uses.set(slug, job);
    useTemplate(root, slug, openProject, job).catch((e) => { job.error = e.message; job.stage = "error"; });
    res.json({ ok: true });
  });
  app.get("/api/templates/:slug/use", (req, res) => res.json(uses.get(req.params.slug) ?? { stage: "idle" }));

  // ---------- processed files of the open project ----------
  app.use("/project-studio", (req, res, next) => {
    const dir = getProject();
    if (!dir) return res.status(404).end();
    express.static(path.join(dir, STUDIO_DIR), { maxAge: 0 })(req, res, next);
  });
  // the element/sound scan, if it was made from exactly this source
  app.get("/api/project/scan", (_req, res) => {
    const dir = getProject();
    const s = dir && readJson(path.join(dir, STUDIO_DIR, "scan.json"));
    if (!s || s.hash !== sourceHash(dir)) return res.json({ scan: null });
    res.json({ scan: s.props ? { elements: s.elements, sounds: s.sounds, props: s.props } : null }); // older scans (no values) are redone
  });
  app.post("/api/project/scan", async (req, res) => {
    const dir = getProject();
    if (!dir) return res.status(400).json({ error: "No project open" });
    await fsp.mkdir(path.join(dir, STUDIO_DIR), { recursive: true });
    await fsp.writeFile(path.join(dir, STUDIO_DIR, "scan.json"), JSON.stringify({ hash: sourceHash(dir), elements: req.body.elements, sounds: req.body.sounds, props: req.body.props ?? [] }));
    res.json({ ok: true });
  });
};

/** Thumbnails already processed for this exact source (shipped with a template or made earlier). */
export const processedThumbs = (dir) => {
  const m = readJson(path.join(dir, STUDIO_DIR, "thumbs", "manifest.json"));
  if (!m || m.hash !== sourceHash(dir)) return null;
  return { ...m, base: "/project-studio/thumbs" };
};
