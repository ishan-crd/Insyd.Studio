// Sound clip vocabulary: context menu, duplicate, split, trim, copy/cut/paste, delete, lock, save → code.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { PROJECT, snapshotProject, finish } from "./lib/project.mjs";
snapshotProject();
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.addInitScript(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith("insyd:")) localStorage.removeItem(k); } catch {} });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const results = []; const check = (n, ok, info = "") => { results.push(ok); console.log(`${ok ? "✓" : "✗"} ${n}${info ? " — " + info : ""}`); };
const S = () => page.evaluate(() => { const s = window.__insydStore.getState(); return { sel: s.selection, multi: s.multi, sounds: s.layout.sounds, frame: window.__insydPlayer.getCurrentFrame() }; });
const clipBox = async (title) => { const c = await page.$(`.aclip[title^="${title}"]`); return c ? c.boundingBox() : null; };
const dragMouse = async (x0, y0, x1, y1, steps = 8) => { await page.mouse.move(x0, y0); await page.mouse.down(); for (let i = 1; i <= steps; i++) await page.mouse.move(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); await page.mouse.up(); await page.waitForTimeout(150); };
const menuClick = async (label) => { await page.click(`.ctx .ctx-item:has-text("${label}")`); await page.waitForTimeout(250); };

await page.goto("http://localhost:4321/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 240000 });
await page.waitForTimeout(2500);
await page.evaluate(() => { document.querySelector(".app").style.setProperty("--tl-h", "460px"); });
await page.waitForTimeout(300);
await page.evaluate(() => { const t = document.querySelector(".tl-tracks"); t.scrollTop = t.scrollHeight; }); await page.waitForTimeout(400);

// ---- context menu on the music clip
let mb = await clipBox("Music bed");
await page.mouse.click(mb.x + 300, mb.y + mb.height / 2, { button: "right" }); await page.waitForTimeout(250);
const menu = await page.innerText(".ctx").catch(() => "");
check("right-click opens a clip context menu", /Cut[\s\S]*Copy[\s\S]*Paste at playhead[\s\S]*Duplicate[\s\S]*Split at playhead[\s\S]*Mute[\s\S]*Lock[\s\S]*Delete/.test(menu));
await page.keyboard.press("Escape");

// ---- split the music at the playhead (⌘K)
await page.evaluate(() => { window.__insydPlayer.seekTo(600); window.__insydStore.getState().select({ type: "sound", id: "music.bed" }); }); await page.waitForTimeout(300);
// the music may carry a code-default shift (e.g. shift={-10}); the head length is measured from the clip's real start
const mStart = +(await page.getAttribute('.aclip[data-clip-id="music.bed"]', "title")).match(/starts f(-?\d+)/)[1];
const HEAD = 600 - mStart;
await page.keyboard.press("Meta+k"); await page.waitForTimeout(400);
let s = await S();
const part2 = Object.entries(s.sounds).find(([k, v]) => k.startsWith("added.") && v.trimStart === HEAD);
check("⌘K splits the music into head (duration) + tail (added, trimmed)", s.sounds["music.bed"]?.duration === HEAD && !!part2 && part2[1].at === 600 && part2[1].src === "sfx/bed.wav", JSON.stringify({ head: s.sounds["music.bed"], tail: part2?.[1], start: mStart }));
check("two music clips now on the Music lane", (await page.$$('.aclip[title^="Music bed"]')).length === 2);
check("tail is mounted in the player with startFrom", await page.evaluate((HEAD) => window.__insydRegistry.getSounds("main").some((x) => x.id.startsWith("added.") && x.trimStart === HEAD && x.absStart === 600), HEAD));
await page.evaluate(() => window.__insydStore.getState().undo()); await page.waitForTimeout(200);
s = await S(); check("undo restores the unsplit music", s.sounds["music.bed"] === undefined && !Object.keys(s.sounds).some((k) => k.startsWith("added.")));

// ---- trim handles (on the wide music clip)
// a clip that starts before frame 0 has no reachable left edge — bring it to 0 first (one extra undo step below)
const nudged = mStart < 0;
if (nudged) await page.evaluate(() => window.__insydStore.getState().setSound("music.bed", { shift: 0 }, true));
const tStart = nudged ? 0 : mStart;
await page.evaluate(() => window.__insydStore.getState().select({ type: "sound", id: "music.bed" })); await page.waitForTimeout(150);
mb = await clipBox("Music bed");
await dragMouse(mb.x + mb.width - 3, mb.y + mb.height / 2, mb.x + mb.width - 63, mb.y + mb.height / 2);
s = await S(); check("dragging the right edge trims the end (duration set)", typeof s.sounds["music.bed"]?.duration === "number" && s.sounds["music.bed"].duration < 1550, JSON.stringify(s.sounds["music.bed"]));
mb = await clipBox("Music bed");
await dragMouse(mb.x + 3, mb.y + mb.height / 2, mb.x + 43, mb.y + mb.height / 2);
s = await S(); check("dragging the left edge trims the start (trimStart + shift, end stays)", (s.sounds["music.bed"]?.trimStart ?? 0) > 0 && s.sounds["music.bed"]?.shift === tStart + s.sounds["music.bed"]?.trimStart, JSON.stringify(s.sounds["music.bed"]));
check("trimmed clip plays from the trimmed offset", await page.evaluate((tStart) => { const x = window.__insydRegistry.getSounds("main").find((x) => x.id === "music.bed"); return x && x.trimStart > 0 && x.absStart === tStart + x.trimStart; }, tStart));
await page.evaluate((n) => { const st = window.__insydStore.getState(); for (let i = 0; i < n; i++) st.undo(); }, nudged ? 3 : 2);
const wh = await page.$$('.aclip[title^="Whoosh"]'); const w0 = await wh[0].boundingBox();
await page.mouse.click(w0.x + w0.width / 2, w0.y + w0.height / 2); await page.waitForTimeout(150);
s = await S(); const wid = s.sel.id;

// ---- duplicate / copy / paste / cut / delete
await page.evaluate((id) => window.__insydStore.getState().select({ type: "sound", id }), wid); await page.waitForTimeout(150);
await page.keyboard.press("Meta+d"); await page.waitForTimeout(300);
s = await S(); let dup = Object.entries(s.sounds).find(([k, v]) => k.startsWith("added.") && v.src === "sfx/whoosh.wav");
check("⌘D duplicates the sound right after it", !!dup && s.sel.id === dup[0], JSON.stringify(dup?.[1]));
await page.evaluate(() => window.__insydStore.getState().undo());
await page.evaluate((id) => window.__insydStore.getState().select({ type: "sound", id }), wid);
await page.keyboard.press("Meta+c"); await page.evaluate(() => window.__insydPlayer.seekTo(900)); await page.waitForTimeout(100);
await page.keyboard.press("Meta+v"); await page.waitForTimeout(300);
s = await S(); const pasted = Object.values(s.sounds).find((v) => v.added && v.at === 900 && v.src === "sfx/whoosh.wav");
check("⌘C then ⌘V pastes at the playhead", !!pasted, JSON.stringify(pasted));
await page.evaluate(() => window.__insydStore.getState().undo());
// paste 2 with relative offsets
await page.evaluate(() => { const st = window.__insydStore.getState(); window.__insydStore.setState({ selection: { type: "sound", id: "search.sfx1" }, multi: ["search.sfx1", "search.sfx3"] }); });
await page.keyboard.press("Meta+c"); await page.evaluate(() => window.__insydPlayer.seekTo(1000)); await page.keyboard.press("Meta+v"); await page.waitForTimeout(300);
s = await S(); const p2 = Object.values(s.sounds).filter((v) => v.added).map((v) => v.at).sort((a, b) => a - b);
check("pasting several keeps their relative offsets from the playhead", p2.length === 2 && p2[0] === 1000 && p2[1] > 1000, JSON.stringify(p2));
await page.evaluate(() => window.__insydStore.getState().undo());
// delete: added → removed, code → muted
await page.evaluate(() => window.__insydStore.getState().select({ type: "sound", id: "search.sfx1" }));
await page.keyboard.press("Backspace"); await page.waitForTimeout(300);
s = await S(); check("⌫ on a code sound mutes it (with a toast)", s.sounds["search.sfx1"]?.muted === true && /muted instead/.test(await page.innerText(".toast").catch(() => "")));
await page.evaluate(() => window.__insydStore.getState().undo());
await page.evaluate(() => window.__insydStore.getState().addSound({ src: "sfx/pop.wav", at: 50 })); await page.waitForTimeout(200);
await page.keyboard.press("Backspace"); await page.waitForTimeout(200);
s = await S(); check("⌫ on an added sound removes it", !Object.values(s.sounds).some((v) => v.added));
// lock
await page.evaluate(() => window.__insydStore.getState().select({ type: "sound", id: "music.bed" }));
await page.keyboard.press("Meta+l"); await page.waitForTimeout(300);
s = await S(); check("⌘L locks", s.sounds["music.bed"]?.locked === true);
mb = await clipBox("Music bed");
await dragMouse(mb.x + 200, mb.y + mb.height / 2, mb.x + 260, mb.y + mb.height / 2);
s = await S(); check("locked clip does not move", (s.sounds["music.bed"]?.shift ?? 0) === 0);
check("locked clip is striped", await page.evaluate(() => !!document.querySelector(".aclip.locked")));
await page.keyboard.press("Backspace"); await page.waitForTimeout(200); s = await S(); check("locked clip cannot be deleted (and stays selected)", s.sounds["music.bed"]?.muted !== true && s.sel?.id === "music.bed");
await page.keyboard.press("Meta+l");

// ---- save: duration/trimStart/locked reach the code; split tail goes to layout.json
await page.evaluate(() => { window.__insydPlayer.seekTo(600); window.__insydStore.getState().select({ type: "sound", id: "music.bed" }); });
await page.keyboard.press("Meta+k"); await page.waitForTimeout(300);
await page.evaluate(() => window.__insydStore.getState().setSound("cta.sfx1", { locked: true }));
await page.keyboard.press("Meta+s");
await page.waitForFunction(() => document.body.innerText.includes("Saved"), null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(2500);
const root = fs.readFileSync(path.join(PROJECT, "src/Root.tsx"), "utf8");
check("Root.tsx: split head written as duration attr", new RegExp(`<Sound id="music.bed"[^>]*duration=\\{${HEAD}\\}`).test(root), root.match(/<Sound id="music.bed"[^>]*>/)?.[0]);
const cta = fs.readFileSync(path.join(PROJECT, "src/scenes/SceneCTA.tsx"), "utf8");
check("SceneCTA.tsx: lock written as attr", /<Sfx id="cta.sfx1" locked /.test(cta));
const lj = JSON.parse(fs.readFileSync(path.join(PROJECT, "layout.json"), "utf8"));
check("split tail persisted in layout.json", Object.values(lj.sounds ?? {}).some((v) => v.added && v.trimStart === HEAD && v.src === "sfx/bed.wav"));
check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
await finish(results.every(Boolean) ? 0 : 1);
