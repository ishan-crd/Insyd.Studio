import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const results = []; const check = (n, ok, info = "") => { results.push(ok); console.log(`${ok ? "✓" : "✗"} ${n}${info ? " — " + info : ""}`); };
const S = () => page.evaluate(() => { const s = window.__insydStore.getState(); return { sel: s.selection, multi: s.multi, zoom: s.zoom, el: s.layout.elements, snd: s.layout.sounds, n: s.scan.elements.length, ns: s.scan.sounds.length }; });
await page.goto("http://localhost:4321/studio", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 240000 });
await page.waitForTimeout(2000);
await page.mouse.click(800, 400);
// ⌘A → all elements
await page.keyboard.press("Meta+a"); await page.waitForTimeout(200);
let s = await S(); check("⌘A selects every element", s.sel?.type === "element" && s.multi.length === s.n, `${s.multi.length}/${s.n}`);
// with a sound selected → all sounds
await page.evaluate(() => window.__insydStore.getState().select({ type: "sound", id: "music.bed" }));
await page.keyboard.press("Meta+a"); await page.waitForTimeout(200);
s = await S(); check("⌘A with a sound selected selects every sound", s.sel?.type === "sound" && s.multi.length === s.ns, `${s.multi.length}/${s.ns}`);
await page.keyboard.press("Escape");
// zoom
await page.keyboard.press("Meta+="); await page.waitForTimeout(100); s = await S(); check("⌘+ zooms the timeline in", s.zoom === 1.25, `${s.zoom}`);
await page.keyboard.press("Meta+="); await page.keyboard.press("Meta+-"); await page.waitForTimeout(100); s = await S(); check("⌘− zooms out", Math.abs(s.zoom - 1.25) < 1e-9, `${s.zoom}`);
await page.keyboard.press("Meta+0"); await page.waitForTimeout(100); s = await S(); check("⌘0 fits", s.zoom === null);
// shortcuts modal
await page.keyboard.press("?"); await page.waitForSelector(".modal", { timeout: 3000 }).catch(() => {});
const modal = await page.innerText(".modal").catch(() => "(no modal)");
check("? opens the shortcuts modal with grouped sections", /Keyboard shortcuts/i.test(modal) && /Playback/i.test(modal) && /Editing/i.test(modal) && /Split at playhead/.test(modal) && /Zoom timeline/.test(modal), modal.slice(0, 60).replace(/\n/g, " "));
await page.keyboard.press("Escape"); await page.waitForTimeout(150);
check("Escape closes it", !(await page.$(".modal")));
await page.click('button[title^="Keyboard shortcuts"]'); await page.waitForTimeout(150); check("the ? button opens it too", !!(await page.$(".modal"))); await page.keyboard.press("Escape");
// scene track lock
await page.evaluate(() => { document.querySelector(".app").style.setProperty("--tl-h", "420px"); }); await page.waitForTimeout(300);
const grp = page.locator(".tl-names .tname.grp", { hasText: "Search demo" }).first();
await grp.hover(); await grp.locator(".tlock").click(); await page.waitForTimeout(200);
s = await S(); const searchIds = await page.evaluate(() => window.__insydStore.getState().scan.elements.filter((e) => e.sceneId === "search").map((e) => e.id));
check("scene header lock locks every element in the scene", searchIds.length >= 5 && searchIds.every((id) => s.el[id]?.locked === true), `${searchIds.filter((id) => s.el[id]?.locked).length}/${searchIds.length}`);
await grp.hover(); await grp.locator(".tlock").click(); await page.waitForTimeout(200);
s = await S(); check("clicking again unlocks them", searchIds.every((id) => s.el[id]?.locked === false));
// lane locks
await page.evaluate(() => { const t = document.querySelector(".tl-tracks"); t.scrollTop = t.scrollHeight; }); await page.waitForTimeout(300);
const sfxName = page.locator(".tl-names .tname", { hasText: "Sound effects" }).first();
await sfxName.hover(); await sfxName.locator(".tlock").click(); await page.waitForTimeout(300);
s = await S(); const sfxIds = await page.evaluate(() => window.__insydStore.getState().scan.sounds.filter((x) => x.kind !== "music").map((x) => x.id));
check("Sound effects lane lock locks all effects", sfxIds.every((id) => s.snd[id]?.locked === true) && s.snd["music.bed"]?.locked !== true, `${sfxIds.filter((id) => s.snd[id]?.locked).length}/${sfxIds.length}`);
const musicName = page.locator(".tl-names .tname", { hasText: "Music" }).first();
await musicName.hover(); await musicName.locator(".tlock").click(); await page.waitForTimeout(200);
s = await S(); check("Music lane lock locks the bed", s.snd["music.bed"]?.locked === true);
check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
