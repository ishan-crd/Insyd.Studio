import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto("http://localhost:4321/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 180000 });
await page.waitForTimeout(600);
// 1) element with props + animation editor
await page.evaluate(() => { window.__insydPlayer.seekTo(470); window.__insydStore.getState().select({ type: "element", id: "search.card" }); });
await page.waitForTimeout(700);
await page.screenshot({ path: ".insyd/shots/v2-inspector.png" });
// 2) brand tab
await page.click('.tabs >> text=Brand'); await page.waitForTimeout(400);
await page.screenshot({ path: ".insyd/shots/v2-brand.png" });
// 3) scene settings + hover state on canvas
await page.evaluate(() => { window.__insydPlayer.seekTo(1000); window.__insydStore.getState().select({ type: "scene", id: "figma" }); });
await page.waitForTimeout(600);
const r = await page.evaluate(() => { const en = window.__insydRegistry.getElement("figma.phone"); const b = en.el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
await page.mouse.move(r.x, r.y); await page.waitForTimeout(300);
await page.screenshot({ path: ".insyd/shots/v2-scene.png" });
await browser.close();
