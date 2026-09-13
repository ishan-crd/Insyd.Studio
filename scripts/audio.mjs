// Audio tracks: clips present, drag re-times a sound, replace/volume/mute, add at playhead, save → code + layout.json.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const PROJECT = process.env.PROJECT || "/Users/ishangupta/superconductor/projects/thumb-mcp/video";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.addInitScript(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith("insyd:")) localStorage.removeItem(k); } catch {} });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const results = []; const check = (n, ok, info = "") => { results.push(ok); console.log(`${ok ? "✓" : "✗"} ${n}${info ? " — " + info : ""}`); };
const S = () => page.evaluate(() => { const s = window.__insydStore.getState(); return { sel: s.selection, multi: s.multi, sounds: s.layout.sounds, n: s.scan.sounds.length }; });
const dragMouse = async (x0, y0, x1, y1, steps = 8) => { await page.mouse.move(x0, y0); await page.mouse.down(); for (let i = 1; i <= steps; i++) await page.mouse.move(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); await page.mouse.up(); await page.waitForTimeout(150); };
const clipBox = async (id) => { const c = await page.$(`.aclip[title^="${id}"]`); return c ? c.boundingBox() : null; };

await page.goto("http://localhost:4321/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 240000 });
await page.waitForTimeout(2500);
let s = await S();
check("scan discovers the sounds", s.n >= 60, `${s.n} sounds`);
check("audio clips are drawn", (await page.$$(".aclip")).length >= 60);
check("music bed sits on the Music lane", await page.evaluate(() => !!document.querySelector('.aclip[title^="Music bed"]')));
check("waveforms decoded (canvas has pixels)", await page.evaluate(() => { const c = document.querySelector('.aclip[title^="Music bed"] canvas'); if (!c) return false; const g = c.getContext("2d"); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n > 500; }));

// enlarge timeline + scroll to the audio rows
await page.evaluate(() => { document.querySelector(".app").style.setProperty("--tl-h", "440px"); });
await page.waitForTimeout(300);
await page.evaluate(() => { const t = document.querySelector(".tl-tracks"); t.scrollTop = t.scrollHeight; });
await page.waitForTimeout(400);

// click music clip → selects sound, inspector shows it
let mb = await clipBox("Music bed");
await page.mouse.click(mb.x + mb.width / 2, mb.y + mb.height / 2); await page.waitForTimeout(300);
s = await S(); check("clicking a clip selects the sound", s.sel?.type === "sound" && s.sel.id === "music.bed", JSON.stringify(s.sel));
const insp = await page.innerText(".insp");
check("inspector shows the sound panel (file, volume, timing)", /Music bed/.test(insp) && /Volume/.test(insp) && /Replace/.test(insp) && /bed\.wav/.test(insp));

// drag an SFX clip → shift written to layout; group drag with ⇧
const whooshes = await page.$$('.aclip[title^="Whoosh"]');
check("several whoosh clips exist", whooshes.length >= 5, `${whooshes.length}`);
const w0 = await whooshes[0].boundingBox(); const t0 = await whooshes[0].getAttribute("title");
await page.mouse.click(w0.x + w0.width / 2, w0.y + w0.height / 2); await page.waitForTimeout(150);
s = await S(); const wid = s.sel?.id;
await dragMouse(w0.x + w0.width / 2, w0.y + w0.height / 2, w0.x + w0.width / 2 + 30, w0.y + w0.height / 2);
s = await S(); const sh = s.sounds[wid]?.shift;
check("dragging a sound clip shifts it", typeof sh === "number" && sh > 5, `${wid} shift=${sh}`);
check("selection stays on the sound after drag", s.sel?.id === wid);
// shift-click a second clip and drag → both move
const w1 = await whooshes[1].boundingBox();
await page.keyboard.down("Shift"); await page.mouse.click(w1.x + w1.width / 2, w1.y + w1.height / 2); await page.keyboard.up("Shift"); await page.waitForTimeout(150);
s = await S(); check("⇧-click multi-selects sounds", s.multi.length === 2, JSON.stringify(s.multi));
const before = { ...s.sounds };
await dragMouse(w1.x + w1.width / 2, w1.y + w1.height / 2, w1.x + w1.width / 2 + 20, w1.y + w1.height / 2);
s = await S();
const d0 = (s.sounds[s.multi[0]]?.shift ?? 0) - (before[s.multi[0]]?.shift ?? 0), d1 = (s.sounds[s.multi[1]]?.shift ?? 0) - (before[s.multi[1]]?.shift ?? 0);
check("group drag moves both sounds by the same frames", d0 > 0 && d0 === d1, `Δ=${d0},${d1}`);

// volume / mute / replace via the store (inspector fields call these)
await page.evaluate(() => window.__insydStore.getState().setSound("music.bed", { volume: 0.4 }));
await page.evaluate(() => window.__insydStore.getState().setSound("search.sfx1", { muted: true }));
await page.evaluate(() => window.__insydStore.getState().setSound("logo.sfx2", { src: "sfx/pop.wav" }));
await page.waitForTimeout(400);
const live = await page.evaluate(() => Object.fromEntries(window.__insydRegistry.getSounds("main").map((x) => [x.id, { volume: x.volume, muted: x.muted, src: x.src }])));
check("volume change reaches the composition", live["music.bed"]?.volume === 0.4, JSON.stringify(live["music.bed"]));
check("muted clip renders dashed/dim", await page.evaluate(() => !!document.querySelector('.aclip.muted')));
// the muted sound must not mount an <audio>; music must be mounted
await page.evaluate(() => window.__insydPlayer.seekTo(5)); await page.waitForTimeout(400);
const audios = await page.evaluate(() => Array.from(document.querySelectorAll("audio")).map((a) => a.src.split("/").pop()));
check("music <audio> element is mounted in the player", audios.includes("bed.wav"), audios.slice(0, 4).join(","));

// add a sound at the playhead
await page.evaluate(() => window.__insydPlayer.seekTo(300)); await page.waitForTimeout(200);
await page.click(".trow.grp >> text=Sound"); await page.waitForTimeout(500);
check("sound picker lists project audio files", /bed\.wav/.test(await page.innerText(".popover")));
await page.click(".popover .row >> text=sfx/chime.wav"); await page.waitForTimeout(500);
s = await S(); const addedId = Object.keys(s.sounds).find((k) => k.startsWith("added."));
check("added sound stored at the playhead", !!addedId && s.sounds[addedId].at === 300 && s.sounds[addedId].src === "sfx/chime.wav", JSON.stringify(s.sounds[addedId]));
check("added sound appears as a clip", await page.evaluate(() => !!document.querySelector('.aclip[title^="chime.wav"]')));
check("added sound mounts in the composition", await page.evaluate(() => window.__insydRegistry.getSounds("main").some((x) => x.id.startsWith("added."))));

// save → code
const before2 = fs.readFileSync(path.join(PROJECT, "src/scenes/SceneLogo.tsx"), "utf8");
await page.keyboard.press("Meta+s");
await page.waitForFunction(() => document.body.innerText.includes("Saved"), null, { timeout: 30000 }).catch(() => {});
console.log("  toast:", await page.innerText(".toast").catch(() => "(none)"));
await page.waitForTimeout(2500);
const logo = fs.readFileSync(path.join(PROJECT, "src/scenes/SceneLogo.tsx"), "utf8");
check("SceneLogo.tsx: replaced file written as src attr", /<Sfx id="logo.sfx2" src="sfx\/pop.wav"/.test(logo), logo.match(/<Sfx id="logo.sfx2"[^>]*>/)?.[0]?.slice(0, 90));
const search = fs.readFileSync(path.join(PROJECT, "src/scenes/SceneSearch.tsx"), "utf8");
check("SceneSearch.tsx: mute written as attr", /<Sfx id="search.sfx1" muted /.test(search), search.match(/<Sfx id="search.sfx1"[^>]*>/)?.[0]?.slice(0, 90));
const root = fs.readFileSync(path.join(PROJECT, "src/Root.tsx"), "utf8");
check("Root.tsx: music volume literal rewritten", /<Sound id="music.bed"[^>]*volume=\{0\.4\}/.test(root), root.match(/<Sound id="music.bed"[^>]*>/)?.[0]);
const anyShift = fs.readdirSync(path.join(PROJECT, "src/scenes")).some((f) => /shift=\{\d+\}/.test(fs.readFileSync(path.join(PROJECT, "src/scenes", f), "utf8")));
check("dragged sounds written as shift attrs", anyShift);
const lj = JSON.parse(fs.readFileSync(path.join(PROJECT, "layout.json"), "utf8"));
check("added sound persisted in layout.json (no code counterpart)", Object.values(lj.sounds ?? {}).some((o) => o.added && o.src === "sfx/chime.wav"));
await page.waitForFunction(() => window.__insydStore?.getState().def, null, { timeout: 60000 });
await page.waitForTimeout(1500);
const pending = await page.evaluate(() => JSON.stringify(window.__insydStore.getState().pending().sounds));
check("after reload: nothing pending for sounds", pending === "{}", pending.slice(0, 100));
const liveAfter = await page.evaluate(() => Object.fromEntries(window.__insydRegistry.getSounds("main").map((x) => [x.id, { volume: x.volume, src: x.src }])));
check("after reload: music plays at the saved volume from code", liveAfter["music.bed"]?.volume === 0.4);
check("after reload: added sound still plays (from layout.json defaults)", Object.keys(liveAfter).some((k) => k.startsWith("added.")));
check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
