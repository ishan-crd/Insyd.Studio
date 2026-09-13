import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const results = []; const check = (n, ok, info = "") => { results.push(ok); console.log(`${ok ? "✓" : "✗"} ${n}${info ? " — " + info : ""}`); };
const P = () => page.evaluate(() => window.__insydPreview.get());
await page.goto("http://localhost:4321/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 240000 });
await page.waitForTimeout(1500);
// select a thump (0.5s) and click its waveform
await page.evaluate(() => window.__insydStore.getState().select({ type: "sound", id: "search.sfx2" })); await page.waitForTimeout(600);
const box = page.locator('[data-testid="wave-preview"]');
check("waveform is clickable with a play affordance", await box.count() === 1 && /click the waveform to listen/.test(await page.innerText(".insp")));
await box.click(); await page.waitForTimeout(150);
let p = await P();
check("clicking the waveform starts playback of that clip", p.playing && !p.paused && p.id === "search.sfx2", JSON.stringify(p));
const want = (+await page.inputValue(".insp .field:has(label:has-text('Volume')) input[type=number]")) / 100;
check("plays at the clip's volume", p.volume !== null && Math.abs(p.volume - want) < 1e-6, `volume=${p.volume} (clip ${want})`);
await page.waitForTimeout(200);
const p2 = await P(); check("playhead sweeps across the waveform", p2.progress > p.progress && !!(await page.$(".wave-cursor")), `${p.progress.toFixed(2)} → ${p2.progress.toFixed(2)}`);
await page.waitForTimeout(700);
p = await P(); check("stops by itself after the clip (0.5s) — plays once", !p.playing && p.paused, JSON.stringify(p));
// click while playing stops
await box.click(); await page.waitForTimeout(100); await box.click(); await page.waitForTimeout(100);
p = await P(); check("clicking again while playing stops it", !p.playing);
// trimmed clip previews only the trimmed range
await page.evaluate(() => window.__insydStore.getState().setSound("music.bed", { trimStart: 300, duration: 30 }));
await page.evaluate(() => window.__insydStore.getState().select({ type: "sound", id: "music.bed" })); await page.waitForTimeout(600);
await page.locator('[data-testid="wave-preview"]').click(); await page.waitForTimeout(250);
p = await P(); check("trimmed clip starts at its trim point (10.0s into the file)", p.playing && p.currentTime >= 10 && p.currentTime < 10.6, `t=${p.currentTime?.toFixed(2)}`);
await page.waitForTimeout(1200);
p = await P(); check("…and stops after the trimmed duration (1s)", !p.playing);
await page.evaluate(() => window.__insydStore.getState().resetSound("music.bed"));
// switching selection stops a running preview
await page.evaluate(() => window.__insydStore.getState().select({ type: "sound", id: "music.bed" })); await page.waitForTimeout(400);
await page.locator('[data-testid="wave-preview"]').click(); await page.waitForTimeout(150);
await page.evaluate(() => window.__insydStore.getState().select({ type: "sound", id: "search.sfx2" })); await page.waitForTimeout(200);
p = await P(); check("selecting another sound stops the preview", !p.playing);
check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
