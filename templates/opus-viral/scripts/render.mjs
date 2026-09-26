// Final render with true motion blur: 4 sub-frame passes across a 180° shutter (each pass is the whole
// film offset back by k/8 of a frame, wrapping — it loops), averaged by ffmpeg at 10-bit precision, then
// encoded to H.264 with the soundtrack.   node scripts/render.mjs [out.mp4] [--samples 4]
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
const args = process.argv.slice(2);
const out = path.resolve(args.find((a) => a.endsWith(".mp4")) ?? "out/opus-viral.mp4");
const n = Number(args[args.indexOf("--samples") + 1]) || 4;
const tmp = path.resolve("out/.passes"); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
const layout = JSON.parse(fs.readFileSync("layout.json", "utf8"));
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const passes = [];
for (let k = 0; k < n; k++) {
  const subframe = 0.5 * (k / n); // 180° shutter
  const composition = await selectComposition({ serveUrl, id: "OpusViral", inputProps: { layout, subframe } });
  const file = `${tmp}/pass${k}.mov`;
  process.stdout.write(`pass ${k + 1}/${n} (−${subframe.toFixed(3)} f) `);
  await renderMedia({ composition, serveUrl, codec: "prores", proResProfile: "4444", outputLocation: file, inputProps: { layout, subframe }, muted: k > 0, concurrency: 6,
    onProgress: ({ progress }) => { if (Math.round(progress * 100) % 25 === 0) process.stdout.write("."); } });
  console.log(" ✓");
  passes.push(file);
}
const inputs = passes.flatMap((p) => ["-i", p]);
execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", `${passes.map((_, i) => `[${i}:v]format=yuv444p10le[v${i}]`).join(";")};${passes.map((_, i) => `[v${i}]`).join("")}mix=inputs=${n}[m];[m]format=yuv420p[o]`,
  "-map", "[o]", "-map", "0:a?", "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out], { stdio: "inherit" });
fs.rmSync(tmp, { recursive: true, force: true });
console.log("→", path.relative(process.cwd(), out));
