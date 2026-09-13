// Main-thread cost while playing: CDP Performance metrics delta over a 4s play window.
// Lower TaskDuration/LayoutDuration/ScriptDuration per rendered frame = smoother playback.
import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, headless: !process.env.HEADED });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send("Performance.enable");
await page.goto("http://localhost:4321/" + (process.env.Q || ""), { waitUntil: "networkidle" });
await page.waitForFunction(() => !!window.__insydPlayer, null, { timeout: 120000 });
// let the scan finish (it is cached after the first run)
await page.waitForFunction(() => { const s = window.__insydStore?.getState(); return !s || s.scan.status !== "running"; }, null, { timeout: 120000 });
await page.waitForTimeout(800);
const metrics = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
const run = async (label, startFrame, seconds = 4) => {
  await page.evaluate(async (f) => { const p = window.__insydPlayer; p.pause(); p.seekTo(f); await new Promise((r) => setTimeout(r, 400)); }, startFrame);
  const a = await metrics();
  const frames = await page.evaluate(async (seconds) => {
    const p = window.__insydPlayer; const set = new Set(); const on = (e) => set.add(e.detail.frame);
    p.addEventListener("frameupdate", on); p.play(); await new Promise((r) => setTimeout(r, seconds * 1000)); p.pause(); p.removeEventListener("frameupdate", on); return set.size;
  }, seconds);
  const b = await metrics();
  const d = (k) => Math.round((b[k] - a[k]) * 1000);
  const task = d("TaskDuration");
  console.log(label.padEnd(18), `frames=${frames}`, `task=${task}ms`, `script=${d("ScriptDuration")}ms`, `style=${d("RecalcStyleDuration")}ms`, `layout=${d("LayoutDuration")}ms`, `→ ${(task / frames).toFixed(1)} ms/frame`);
};
await run("logo→meet (f0)", 0);
await run("search (f440)", 440);
await run("figma (f800)", 800);
await run("yellow (f1200)", 1200);
await browser.close();
