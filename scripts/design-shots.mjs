// Screenshots of the redesigned UI in a few states (light + dark), for review.
import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:4321/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 240000 });
await page.waitForTimeout(800);
const S = () => window.__insydStore.getState();
const shot = (n) => page.screenshot({ path: `.insyd/shots/design-${n}.png` });
await page.evaluate(() => localStorage.setItem("insyd:theme", "light"));
await page.evaluate(() => document.documentElement.dataset.theme = "light");
// element selected
const el = await page.evaluate(() => { const s = window.__insydStore.getState(); const e = s.scan.elements.find((x) => x.kind === "text") ?? s.scan.elements[0]; window.__insydPlayer.seekTo(e.first + 12); s.select({ type: "element", id: e.id }); return e.id; });
await page.waitForTimeout(700); await shot("element");
await page.click('.insp .tabs >> text=Animation'); await page.waitForTimeout(300); await shot("animation");
// sound selected
await page.evaluate(() => { const s = window.__insydStore.getState(); const c = s.scan.sounds.find((x) => /whoosh/i.test(x.src)) ?? s.scan.sounds[0]; s.select({ type: "sound", id: c.id }); });
await page.waitForTimeout(700); await shot("sound");
// brand
await page.click('.lib .tabs >> text=Brand'); await page.waitForTimeout(400); await shot("brand");
// nothing selected + scenes tab
await page.evaluate(() => window.__insydStore.getState().select(null)); await page.click('.lib .tabs >> text=Scenes'); await page.waitForTimeout(300); await shot("empty");
// dialogs
await page.click('.btn[title^="Keyboard shortcuts"]'); await page.waitForTimeout(300); await shot("shortcuts"); await page.keyboard.press("Escape");
await page.click('.btn[title^="Connect Claude"]'); await page.waitForTimeout(600); await shot("claude"); await page.keyboard.press("Escape");
await page.click('.btn.primary:has-text("Export")'); await page.waitForTimeout(300); await shot("export"); await page.keyboard.press("Escape");
// dark
await page.click('.lib .tabs >> text=Elements');
await page.evaluate((id) => window.__insydStore.getState().select({ type: "element", id }), el);
await page.click('.btn[title="Switch to dark mode"]'); await page.waitForTimeout(500); await shot("dark");
await page.click('.btn[title="Switch to light mode"]');
// open project screen
await page.click('.topbar .project'); await page.waitForTimeout(600); await shot("open");
console.log("errors:", errors.length ? errors : "none");
await browser.close();
