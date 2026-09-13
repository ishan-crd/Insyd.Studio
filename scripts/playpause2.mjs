import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, headless: !process.env.HEADED, args: process.env.HEADED ? ["--autoplay-policy=no-user-gesture-required"] : [] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
// fresh scan every time: clear the cache
await ctx.addInitScript(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith("insyd:scan")) localStorage.removeItem(k); } catch {} });
const page = await ctx.newPage();
await page.goto("http://localhost:4321/", { waitUntil: "networkidle" });
await page.waitForFunction(() => !!window.__insydPlayer, null, { timeout: 60000 });
await page.waitForTimeout(1500); // scan has started by now
const scanStatus = await page.evaluate(() => window.__insydStore.getState().scan.status);
console.log("scan status when user clicks Play:", scanStatus);
const playBtn = page.locator(".transport .btn.icon").nth(2);
await playBtn.click();
const samples = [];
for (let i = 0; i < 8; i++) { await page.waitForTimeout(500); samples.push(await page.evaluate(() => [window.__insydPlayer.getCurrentFrame(), window.__insydPlayer.isPlaying(), window.__insydStore.getState().scan.status].join(":"))); }
console.log("frame:playing:scan over 4s →", samples.join("  "));
// buffering events in a real browser
await page.waitForFunction(() => window.__insydStore.getState().scan.status === "done", null, { timeout: 180000 });
const buf = await page.evaluate(async () => {
  const p = window.__insydPlayer; p.pause(); p.seekTo(422); let waiting = 0, resume = 0;
  p.addEventListener("waiting", () => waiting++); p.addEventListener("resume", () => resume++);
  const f0 = 422; p.play(); await new Promise((r) => setTimeout(r, 4000)); const f1 = p.getCurrentFrame(); const playing = p.isPlaying(); p.pause();
  return { advanced: f1 - f0, playing, waiting, resume };
});
console.log("audio-heavy scene (headed=" + !!process.env.HEADED + "):", JSON.stringify(buf));
await browser.close();
