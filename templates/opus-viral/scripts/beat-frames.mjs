// Render one frame per beat (and optionally extra frames) as a contact sheet — the pre-flight check
// before a full render:  node scripts/beat-frames.mjs [frame ...]
import path from "node:path";
import { execFileSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
const extra = process.argv.slice(2).map(Number);
const frames = extra.length ? extra : Array.from({ length: 28 }, (_, i) => i * 30 + 15); // mid-beat: the settled state of each beat
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "OpusViral" });
const out = path.resolve("out/beats");
for (const f of frames) await renderStill({ composition, serveUrl, frame: f, output: `${out}/f${String(f).padStart(4, "0")}.jpeg`, imageFormat: "jpeg", scale: 0.25 });
const files = frames.map((f) => `${out}/f${String(f).padStart(4, "0")}.jpeg`);
const cols = 7, args = [];
files.forEach((f) => args.push("-i", f));
execFileSync("ffmpeg", ["-v", "error", "-y", ...args, "-filter_complex", `${files.map((_, i) => `[${i}]`).join("")}xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols)}*w0_${Math.floor(i / cols)}*h0`).join("|").replace(/(\d+)\*w0/g, (m, n) => (n === "0" ? "0" : Array.from({ length: +n }, () => "w0").join("+"))).replace(/_(\d+)\*h0/g, (m, n) => "_" + (n === "0" ? "0" : Array.from({ length: +n }, () => "h0").join("+")))}`, `${out}/sheet.jpeg`]);
console.log("sheet →", `${out}/sheet.jpeg`);
