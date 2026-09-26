// Process a template so Studio and the marketplace understand it immediately:
//   node scripts/package-template.mjs <slug>          (Studio must be running: npm run dev)
//   node scripts/package-template.mjs <slug> --poster (just the poster, from template.json's posterFrame)
// Writes templates/<slug>/.studio/: scan.json (Studio's own element/sound analysis), thumbs/ (timeline
// filmstrip), preview.mp4 (half size, with sound), poster.jpg, and manifest.json = template.json + facts
// read from the running editor (size, scenes, clip/sound/value counts, palette, fonts, content hash).
// Leaves the project that was open before re-opened.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { sourceHash, STUDIO_DIR } from "../server/templates.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.STUDIO_URL || "http://localhost:4321";
const slug = process.argv[2];
if (!slug) { console.error("usage: node scripts/package-template.mjs <slug>"); process.exit(1); }
const dir = path.join(ROOT, "templates", slug);
const out = path.join(dir, STUDIO_DIR);
const authored = JSON.parse(fs.readFileSync(path.join(dir, "template.json"), "utf8"));
fs.mkdirSync(out, { recursive: true });
const log = (...a) => console.log(`[${slug}]`, ...a);
const api = (p, body) => fetch(BASE + p, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}).then((r) => r.json());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --poster: only re-render poster.jpg from template.json's posterFrame (and update the manifest)
if (process.argv.includes("--poster")) {
  const m = JSON.parse(fs.readFileSync(path.join(out, "manifest.json"), "utf8"));
  execFileSync("npx", ["remotion", "still", "src/index.ts", m.compositionId, path.join(out, "poster.jpg"), "--frame", String(authored.posterFrame ?? 0), "--scale", "0.5", "--image-format", "jpeg", "--jpeg-quality", "88", "--overwrite"], { cwd: dir, stdio: ["ignore", "ignore", "inherit"] });
  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify({ ...m, ...authored, compositionId: m.compositionId }, null, 2) + "\n");
  log("poster.jpg ← frame", authored.posterFrame); process.exit(0);
}
const before = (await api("/api/project")).current?.path ?? null;
const open = async (p) => {
  await api("/api/project/open", { path: p });
  for (let i = 0; i < 80; i++) { await sleep(300); const c = await api("/api/project").catch(() => null); if (c?.current?.path === p && (await fetch(BASE + "/studio").then((r) => r.ok).catch(() => false))) return; }
  throw new Error("project did not open");
};

try {
  log("opening in Studio");
  await open(dir);
  await sleep(1500);
  // 1. scan + facts, from the editor itself
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(BASE + "/studio", { waitUntil: "load", timeout: 180000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  log("scanning");
  await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 900000 });
  const facts = await page.evaluate(() => {
    const s = window.__insydStore.getState();
    const props = window.__insydRegistry.getProps();
    const brand = props.filter((p) => p.owner === "brand");
    return {
      id: s.def.id, width: s.def.width, height: s.def.height, fps: s.def.fps, durationInFrames: s.duration(),
      scenes: s.scenes().map((x) => ({ id: x.id, label: x.label, frames: x.duration })),
      counts: { clips: s.scan.elements.length, sounds: s.scan.sounds.length, values: props.filter((p) => p.owner !== "brand").length, brand: brand.length },
      palette: brand.filter((p) => p.kind === "color").map((p) => ({ name: p.meta.label ?? p.id.replace(/^brand\./, ""), value: String(p.value) })),
      fonts: Array.from(new Set(brand.filter((p) => p.kind === "font").map((p) => String(p.value)))),
    };
  });
  // the editor saves its scan into .studio/scan.json; make sure it is the one for this exact source
  for (let i = 0; i < 40 && !(await api("/api/project/scan")).scan; i++) await sleep(250);
  if (!(await api("/api/project/scan")).scan) throw new Error("scan.json was not written");
  log(`scan: ${facts.counts.clips} clips, ${facts.counts.sounds} sounds, ${facts.counts.values} values, ${facts.counts.brand} brand tokens`);
  await browser.close();

  // 2. timeline thumbnails (rendered by the server into .studio/thumbs)
  log("thumbnails");
  for (;;) {
    const r = await api("/api/thumbs", { compositionId: facts.id, entryPoint: "src/index.ts", layoutFile: "layout.json" });
    if (r.status === "ready") break;
    if (r.status === "error") throw new Error("thumbnails: " + r.error);
    await sleep(1500);
  }

  // 3. preview (half size, with sound, streamable) + poster
  log("preview.mp4");
  const remotion = (args) => execFileSync("npx", ["remotion", ...args], { cwd: dir, stdio: ["ignore", "ignore", "inherit"] });
  const raw = path.join(out, "preview.raw.mp4");
  remotion(["render", "src/index.ts", facts.id, raw, "--scale", "0.5", "--codec", "h264", "--crf", "25", "--audio-bitrate", "128k", "--concurrency", "6", "--overwrite"]);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-c", "copy", "-movflags", "+faststart", path.join(out, "preview.mp4")]);
  fs.rmSync(raw);
  log("poster.jpg");
  remotion(["still", "src/index.ts", facts.id, path.join(out, "poster.jpg"), "--frame", String(authored.posterFrame ?? 0), "--scale", "0.5", "--image-format", "jpeg", "--jpeg-quality", "88", "--overwrite"]);

  // 4. manifest
  const { id, ...rest } = facts;
  const manifest = { ...authored, compositionId: id, ...rest, hash: sourceHash(dir), generatedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  log("done →", path.relative(ROOT, out), `(${(fs.statSync(path.join(out, "preview.mp4")).size / 1e6).toFixed(1)} MB preview)`);
} finally {
  if (before && before !== dir) await open(before).catch(() => {});
}
