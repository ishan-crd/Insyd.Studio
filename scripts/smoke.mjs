// Opens the editor in headless Chromium, exercises the main flows, and saves screenshots to .insyd/shots/.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.INSYD_URL || "http://localhost:4321";
const dir = new URL("../.insyd/shots/", import.meta.url).pathname;
fs.mkdirSync(dir, { recursive: true });
// Uses Playwright's bundled Chromium, or CHROME=/path/to/chromium.
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`[${m.type()}] ${m.text().slice(0, 300)}`); });
page.on("response", (r) => { if (r.status() >= 400) errors.push(`[${r.status()}] ${r.url()}`); });
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
const shot = (n) => page.screenshot({ path: `${dir}${n}.png` });

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await shot("01-loaded");
// wait for scan
await page.waitForFunction(() => !document.body.innerText.includes("Analyzing"), null, { timeout: 120000 }).catch(() => {});
await page.waitForTimeout(500);
await shot("02-scanned");
const text = await page.innerText("body");
console.log("timeline head:", text.match(/\d+ scenes · \d+ elements/)?.[0]);

// seek to the search scene and select the card by clicking its overlay box
await page.evaluate(() => window.__insydStore.getState().select(null));
await page.waitForTimeout(600);
await shot("03-search-frame");
const box = await page.$('.box');
console.log("boxes:", (await page.$$('.box')).length);
// click the library element "Claude Code card" if present
const row = await page.$('text=Claude Code card');
if (row) { await row.click(); await page.waitForTimeout(700); await shot("04-selected"); }
// drag the selected box 120px right
const sel = await page.$('.box.selected');
if (sel) {
  const b = await sel.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2 + 20, { steps: 8 });
  await page.mouse.move(b.x + b.width / 2 + 120, b.y + b.height / 2 + 40, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  await shot("05-dragged");
  console.log("inspector X/Y:", await page.$$eval('.field input[type=number]', (els) => els.slice(0, 2).map((e) => e.value)));
}
// scene selection + export dialog
await page.click('text=Figma match').catch(() => {});
await page.waitForTimeout(600);
await shot("06-scene");
await page.click('button:has-text("Export")');
await page.waitForTimeout(400);
await shot("07-export");
console.log("errors:", errors.length ? errors.slice(0, 12).join("\n") : "none");
await browser.close();
