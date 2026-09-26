// Marketplace: routes, the catalogue, hover-to-play cards, the template page, and "Edit in Studio"
// end to end (own copy → editor open with the template's processed scan + filmstrip, no analysis pass).
// The copy it makes is deleted afterwards and the project that was open before is re-opened.
import fs from "node:fs";
import { chromium } from "playwright";
const BASE = "http://localhost:4321";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
let pass = 0, fail = 0;
const check = (c, m, d = "") => { if (c) pass++; else { fail++; console.log("  ✗", m, d); } };
const api = (p) => fetch(BASE + p).then((r) => r.json());
const before = (await api("/api/project")).current?.path;

// routes
for (const r of ["/", "/templates/studio-launch", "/studio"]) check((await fetch(BASE + r)).status === 200, `GET ${r} → 200`);
const { templates } = await api("/api/templates");
check(templates.length >= 2, `${templates.length} templates in the catalogue`);
for (const t of templates) {
  check(t.preview && (await fetch(BASE + t.preview, { method: "HEAD" })).ok, `${t.slug}: preview.mp4 served`);
  check(t.poster && (await fetch(BASE + t.poster, { method: "HEAD" })).ok, `${t.slug}: poster served`);
  check(t.counts.clips > 0 && t.counts.sounds > 0 && t.scenes.length > 0 && t.palette.length > 0, `${t.slug}: manifest has scenes, clips, sounds, palette`);
}

// home: cards, hover plays inside the card, leave pauses
await page.goto(BASE + "/", { waitUntil: "load" });
await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
await page.waitForSelector(".mk-card[data-slug]");
check(await page.locator(".mk-card[data-slug]").count() === templates.length, "a card per template");
const slug = templates[templates.length - 1].slug;
const card = `.mk-card[data-slug="${slug}"]`;
check(await page.locator(`${card} video`).count() === 0, "card video not loaded before hover");
await page.hover(`${card} .mk-media`); await page.waitForTimeout(1800);
const v = await page.evaluate((c) => { const el = document.querySelector(`${c} video`); return el && { t: el.currentTime, paused: el.paused, muted: el.muted, on: el.classList.contains("on"), inCard: !!el.closest(".mk-media") }; }, card);
check(v && !v.paused && v.t > 0.5 && v.muted && v.on && v.inCard, "hover plays the mp4 inside the card, muted", JSON.stringify(v));
check(await page.locator(`${card} .mk-media-actions .mk-btn.primary`).isVisible(), "Edit in Studio shows on hover");
await page.mouse.move(2, 2); await page.waitForTimeout(500);
check(await page.evaluate((c) => document.querySelector(`${c} video`).paused, card), "leaving pauses it");
// filters
const cat = templates[0].category;
await page.click(`.mk-filters button:has-text("${cat}")`);
check(await page.locator(".mk-card[data-slug]").count() === templates.filter((t) => t.category === cat).length, `filter "${cat}"`);
await page.click('.mk-filters button:has-text("All")');

// template page via client-side routing
await page.click(`${card} .mk-card-title`);
await page.waitForURL(`**/templates/${slug}`);
check(await page.locator(".mk-player video").count() === 1 && await page.locator(".mk-scene").count() === templates.find((t) => t.slug === slug).scenes.length, "template page: player + one button per scene");
await page.locator(".mk-scene").nth(2).click(); await page.waitForTimeout(500);
const t2 = await page.evaluate(() => document.querySelector(".mk-player video").currentTime);
const exp = templates.find((t) => t.slug === slug); const from2 = (exp.scenes[0].frames + exp.scenes[1].frames) / exp.fps;
check(t2 >= from2 - 0.1 && t2 < from2 + 1.2, "clicking a scene seeks the preview to it (then plays)", `${t2.toFixed(2)} vs ${from2.toFixed(2)}`);
await page.goBack(); await page.waitForURL(BASE + "/"); await page.waitForSelector(".mk-card[data-slug]");
check(await page.locator(".mk-card[data-slug]").count() === templates.length, "back returns to the marketplace");

// Edit in Studio → own copy → editor with processed files
await page.hover(`${card} .mk-media`);
const t0 = Date.now();
await page.click(`${card} .mk-media-actions .mk-btn.primary`);
await page.waitForURL("**/studio", { timeout: 180000 });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 120000 });
const took = Date.now() - t0;
const job = await api(`/api/templates/${slug}/use`);
const s = await page.evaluate(() => ({ project: window.__INSYD_PROJECT__, clips: window.__insydStore.getState().scan.elements.length }));
check(job.path && s.project === job.path && job.path.includes("Studio Projects"), "the editor opened your own copy", s.project);
check(s.clips === exp.counts.clips, "processed scan used (same clips as the manifest)", `${s.clips}`);
check(took < 20000, `open + scan ready in ${took} ms (no analysis pass)`);
await page.waitForSelector(".sblock.film", { timeout: 30000 }).catch(() => {});
check(await page.locator(".sblock.film").count() > 0, "timeline filmstrip from the processed thumbnails");
check(fs.existsSync(job.path) && fs.lstatSync(`${job.path}/node_modules`).isSymbolicLink(), "copy shares the template's node_modules");

// clean up: delete the copy, re-open what was open
if (job.path && job.path.includes("Studio Projects")) fs.rmSync(job.path, { recursive: true, force: true });
if (before) await fetch(BASE + "/api/project/open", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: before }) });
check(errors.length === 0, "no page errors", errors.slice(0, 2).join(" | "));
console.log(`${pass}/${pass + fail} passed`);
await browser.close();
process.exit(fail ? 1 : 0);
