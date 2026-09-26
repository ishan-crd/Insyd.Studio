// The static web build of Studio by Insyd (what Vercel deploys):   npm run build  →  dist/
//   /                      marketplace       /templates/:slug   a template's page
//   /studio                how to run the editor locally (the editor itself needs your filesystem)
//   /catalog/*.json        the template catalogue   (served at /api/templates[/:slug] via vercel.json)
//   /template-media/<slug> preview.mp4 + poster.jpg
//   /downloads/<slug>.zip  the template's source + processed files (.studio/ scan & thumbs)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const SKIP = new Set(["node_modules", "out", "CLAUDE.md", ".DS_Store"]);

// 1. the app, in hosted mode
execFileSync("npx", ["vite", "build", "--emptyOutDir"], { cwd: ROOT, stdio: "inherit", env: { ...process.env, INSYD_HOSTED: "1", INSYD_PROJECT: "" } });

// 2. the catalogue + media + downloads
const dirs = fs.readdirSync(path.join(ROOT, "templates"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const walk = (dir, base = dir, out = {}) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name), rel = path.relative(base, p);
    if (rel === ".studio/preview.mp4" || rel === ".studio/poster.jpg") continue; // media is served separately
    if (e.isDirectory()) walk(p, base, out); else out[rel] = fs.readFileSync(p);
  }
  return out;
};
const templates = [];
for (const slug of dirs) {
  const src = path.join(ROOT, "templates", slug);
  const manifestFile = path.join(src, ".studio", "manifest.json");
  if (!fs.existsSync(manifestFile)) { console.warn(`skip ${slug}: not processed (node scripts/package-template.mjs ${slug})`); continue; }
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const media = path.join(DIST, "template-media", slug);
  fs.mkdirSync(media, { recursive: true });
  for (const f of ["preview.mp4", "poster.jpg"]) if (fs.existsSync(path.join(src, ".studio", f))) fs.copyFileSync(path.join(src, ".studio", f), path.join(media, f));
  const files = walk(src);
  const zip = zipSync(Object.fromEntries(Object.entries(files).map(([rel, buf]) => [`${slug}/${rel.split(path.sep).join("/")}`, [new Uint8Array(buf), { level: /\.(wav|mp3|png|jpe?g|mp4)$/.test(rel) ? 0 : 6 }]])));
  fs.mkdirSync(path.join(DIST, "downloads"), { recursive: true });
  fs.writeFileSync(path.join(DIST, "downloads", `${slug}.zip`), zip);
  const entry = {
    ...manifest, slug,
    preview: fs.existsSync(path.join(media, "preview.mp4")) ? `/template-media/${slug}/preview.mp4` : null,
    poster: fs.existsSync(path.join(media, "poster.jpg")) ? `/template-media/${slug}/poster.jpg` : null,
    installed: false,
    download: { url: `/downloads/${slug}.zip`, bytes: zip.length },
  };
  templates.push(entry);
  console.log(`  ${slug}: ${Object.keys(files).length} files · ${(zip.length / 1e6).toFixed(1)} MB zip`);
}
templates.sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.title.localeCompare(b.title));
fs.mkdirSync(path.join(DIST, "catalog"), { recursive: true });
fs.writeFileSync(path.join(DIST, "catalog", "templates.json"), JSON.stringify({ templates, projectsDir: null }));
for (const t of templates) fs.writeFileSync(path.join(DIST, "catalog", `${t.slug}.json`), JSON.stringify(t));
console.log(`dist/ ready — ${templates.length} templates`);
