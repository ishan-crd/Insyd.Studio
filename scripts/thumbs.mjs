import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const results = []; const check = (n, ok, info = "") => { results.push(ok); console.log(`${ok ? "✓" : "✗"} ${n}${info ? " — " + info : ""}`); };
const t0 = Date.now();
await page.goto("http://localhost:4321/studio", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 240000 });
const st = await page.evaluate(() => (window.__insydThumbs = null, true));
// wait for thumbnails to become ready (background render)
await page.waitForFunction(() => document.querySelectorAll(".sblock.film img").length > 0, null, { timeout: 300000 });
const tReady = ((Date.now() - t0) / 1000).toFixed(0);
await page.waitForTimeout(1500);
const info = await page.evaluate(() => { const imgs = Array.from(document.querySelectorAll(".sblock.film img")); return { blocks: document.querySelectorAll(".sblock.film").length, imgs: imgs.length, loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length, first: imgs[0]?.src, natural: imgs[0]?.naturalWidth }; });
check("scene blocks switch to filmstrip mode", info.blocks === 11, `${info.blocks} blocks, ready after ${tReady}s`);
check("thumbnails are laid along the scene blocks", info.imgs >= 90, `${info.imgs} images`);
check("thumbnail images actually load", info.loaded === info.imgs && info.natural > 0, `${info.loaded}/${info.imgs} · ${info.natural}px wide`);
// playhead frame vs thumbnail content: the search-scene block should contain a blue-ish thumbnail
const blue = await page.evaluate(async () => {
  const block = Array.from(document.querySelectorAll(".sblock.film")).find((b) => /Search demo/.test(b.textContent));
  const img = block.querySelectorAll("img")[6]; if (!img) return null;
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data; let blueish = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 2] > 200 && d[i] < 120) blueish++;
  return blueish / (d.length / 4);
});
check("filmstrip shows real frames (blue panel visible in the search scene)", blue !== null && blue > 0.2, `blue ratio ${blue?.toFixed(2)}`);
// second load is instant (cached)
const t1 = Date.now(); await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => document.querySelectorAll(".sblock.film img").length > 0, null, { timeout: 60000 });
check("cached thumbnails appear immediately on reload", (Date.now() - t1) < 15000, `${((Date.now() - t1) / 1000).toFixed(1)}s`);
// playback still smooth with the filmstrip present
const frames = await page.evaluate(async () => { const p = window.__insydPlayer; let n = 0; const on = () => n++; p.addEventListener("frameupdate", on); p.seekTo(400); p.play(); await new Promise((r) => setTimeout(r, 2000)); p.pause(); p.removeEventListener("frameupdate", on); return n; });
check("playback unaffected (≥55 frames in 2s)", frames >= 55, `${frames} frames`);
check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
