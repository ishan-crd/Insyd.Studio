// Rubber-band selection in the timeline: drag on empty space selects every clip the box touches.
import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const results = []; const check = (n, ok, info = "") => { results.push(ok); console.log(`${ok ? "✓" : "✗"} ${n}${info ? " — " + info : ""}`); };
const S = () => page.evaluate(() => { const s = window.__insydStore.getState(); return { sel: s.selection, multi: s.multi, frame: window.__insydPlayer.getCurrentFrame() }; });
const dragMouse = async (x0, y0, x1, y1, steps = 10, mid) => { await page.mouse.move(x0, y0); await page.mouse.down(); for (let i = 1; i <= steps; i++) { await page.mouse.move(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); if (mid && i === Math.floor(steps / 2)) await mid(); } await page.mouse.up(); await page.waitForTimeout(150); };
await page.goto("http://localhost:4321/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 240000 });
await page.waitForTimeout(2000);
await page.evaluate(() => { document.querySelector(".app").style.setProperty("--tl-h", "460px"); });
await page.waitForTimeout(300);

// 1) marquee across the search-scene element rows
await page.evaluate(() => window.__insydStore.getState().select({ type: "element", id: "search.card" })); await page.waitForTimeout(500);
const rowOf = async (id) => { const el = await page.$(`[data-clip-id="${id}"]`); return el.boundingBox(); };
const a = await rowOf("search.card"), b = await rowOf("search.prompt");
// start in empty space to the right of the clips, drag up-left across all five search rows
const x1 = a.x + a.width + 120, y1 = b.y + b.height + 4, x2 = a.x + 20, y2 = a.y - 4;
let midBox = null;
await dragMouse(x1, y1, x2, y2, 10, async () => { midBox = await page.$(".marquee"); });
check("marquee box is drawn while dragging", !!midBox);
let s = await S();
check("release selects every element clip the box touched", s.sel?.type === "element" && s.multi.length === 5, JSON.stringify(s.multi));
check("no native text selection was created", (await page.evaluate(() => window.getSelection()?.toString() ?? "")) === "");
check("box removed after release", !(await page.$(".marquee")));

// 2) shift-marquee adds more (the ship headline row below)
const ship = await rowOf("ship.headline");
await page.keyboard.down("Shift");
await dragMouse(ship.x + ship.width + 60, ship.y + ship.height + 3, ship.x + 4, ship.y - 3);
await page.keyboard.up("Shift");
s = await S(); check("⇧-marquee adds to the existing selection", s.multi.length === 6 && s.multi.includes("ship.headline"), `${s.multi.length}`);

// 3) marquee over the audio lanes selects sounds (domain switches)
await page.evaluate(() => { const t = document.querySelector(".tl-tracks"); t.scrollTop = t.scrollHeight; }); await page.waitForTimeout(400);
const lane = await page.$$('.trow .aclip'); const first = await lane[0].boundingBox(); const tracks = await (await page.$(".tl-tracks")).boundingBox();
const lx0 = tracks.x + 224, ly0 = first.y - 6, lx1 = tracks.x + 224 + 260, ly1 = first.y + 3 * 30 + 10;
await dragMouse(lx0 + 0.5, ly0 + 0.5, lx1, ly1);
s = await S(); check("marquee over the audio lanes selects sounds", s.sel?.type === "sound" && s.multi.length >= 5, `${s.multi.length} sounds`);
check("sound clips highlighted", (await page.$$(".aclip.on")).length === s.multi.length);
// group drag of the marquee-selected sounds
const before = await page.evaluate((ids) => ids.map((id) => (window.__insydStore.getState().layout.sounds[id]?.shift ?? 0)), s.multi);
const one = await page.$(`.aclip.on`); const ob = await one.boundingBox();
await dragMouse(ob.x + 2, ob.y + ob.height / 2, ob.x + 2 + 30, ob.y + ob.height / 2);
const after = await page.evaluate((ids) => ids.map((id) => (window.__insydStore.getState().layout.sounds[id]?.shift ?? 0)), s.multi);
check("dragging one of them moves the whole marquee selection", after.every((v, i) => v - before[i] === after[0] - before[0]) && after[0] - before[0] > 3, `Δ=${after[0] - before[0]}`);

// 4) click without moving on empty space still seeks
const beforeF = (await S()).frame;
await page.mouse.click(tracks.x + 600, first.y + 3 * 30 + 12); await page.waitForTimeout(250);
s = await S(); check("plain click on empty track space seeks the playhead", s.frame !== beforeF && s.frame > 0, `f${s.frame}`);
check("plain click on empty space deselects everything", s.sel === null && s.multi.length === 0, JSON.stringify(s.sel));
// ⇧-click on empty space keeps the selection
await page.evaluate(() => window.__insydStore.getState().select({ type: "element", id: "search.card" })); await page.waitForTimeout(200);
await page.keyboard.down("Shift"); await page.mouse.click(tracks.x + 640, first.y + 3 * 30 + 12); await page.keyboard.up("Shift"); await page.waitForTimeout(200);
s = await S(); check("⇧-click on empty space keeps the selection", s.sel?.id === "search.card");
check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
