// Speed: elements get a time remap (their animations run N× faster), sounds a playback rate
// (N× faster and 1/N as long). Both editable in the inspector, saved into the code.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { PROJECT, snapshotProject } from "./lib/project.mjs";
snapshotProject();
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const results = []; const check = (n, ok, info = "") => { results.push(ok); console.log(`${ok ? "✓" : "✗"} ${n}${info ? " — " + info : ""}`); };
await page.goto("http://localhost:4321/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 240000 });
await page.waitForTimeout(1500);
const S = () => page.evaluate(() => window.__insydStore.getState());

// ---- element: pick a text element whose inner node animates (opacity/transform changes over its first frames)
const el = await page.evaluate(() => {
  const s = window.__insydStore.getState();
  return s.scan.elements.filter((e) => e.kind === "text").map((e) => ({ id: e.id, first: e.first, last: e.last }));
});
const styleAt = async (id, frame) => page.evaluate(async ([id, frame]) => {
  window.__insydPlayer.seekTo(frame); await new Promise((r) => setTimeout(r, 120));
  const root = document.querySelector(`[data-insyd-id="${id}"]`); if (!root) return null;
  // signature of the element's animated state: opacity + transform of its first descendants
  return [...root.querySelectorAll("*")].slice(0, 12).map((n) => { const cs = getComputedStyle(n); return cs.opacity + "/" + cs.transform; }).join(";");
}, [id, frame]);
let pick = null;
for (const e of el) { const a = await styleAt(e.id, e.first + 4), b = await styleAt(e.id, e.first + 8); if (a && b && a !== b) { pick = e; break; } }
check("found an element that animates over its first frames", !!pick, pick?.id);
const atSpeed1 = await styleAt(pick.id, pick.first + 8);
await page.evaluate((id) => window.__insydStore.getState().select({ type: "element", id }), pick.id); await page.waitForTimeout(300);
check("inspector shows a Speed field with presets", /Speed/.test(await page.innerText(".insp")) && (await page.locator('.insp .tabs button:has-text("2×")').count()) === 1);
await page.click('.insp .tabs button:has-text("2×")'); await page.waitForTimeout(300);
let st = await S(); check("2× preset writes speed: 2 into the layout", st.layout.elements[pick.id]?.speed === 2);
const atSpeed2 = await styleAt(pick.id, pick.first + 4);
check("at 2× the element at +4 frames looks like it did at +8 frames at 1×", atSpeed2 === atSpeed1, `${atSpeed2} vs ${atSpeed1}`);
check("timeline clip shows the speed badge", /2×/.test(await page.innerText(`.clip[data-clip-id="${pick.id}"]`)));
const speedInput = page.locator(".insp .field:has(label:has-text('Speed')) input[type=number]");
await speedInput.fill("0.5"); await speedInput.dispatchEvent("change"); await page.waitForTimeout(200);
st = await S(); check("typing a value sets 0.5×", st.layout.elements[pick.id]?.speed === 0.5);
const atHalf = await styleAt(pick.id, pick.first + 16);
check("at 0.5× the element at +16 frames looks like +8 at 1×", atHalf === atSpeed1, `${atHalf} vs ${atSpeed1}`);
await page.click('.insp .tabs button:has-text("1×")'); await page.waitForTimeout(200);
st = await S(); check("1× preset restores normal speed", st.layout.elements[pick.id]?.speed === 1);
await page.evaluate(() => { const s = window.__insydStore.getState(); s.undo(); s.undo(); s.undo(); }); await page.waitForTimeout(200);
st = await S(); check("undo removes the speed edits", st.layout.elements[pick.id]?.speed === undefined);

// ---- sound
const snd = await page.evaluate(() => { const s = window.__insydStore.getState(); const c = s.scan.sounds.find((x) => /music/i.test(x.kind)) ?? s.scan.sounds[0]; return c.id; });
await page.evaluate((id) => { const s = window.__insydStore.getState(); s.select({ type: "sound", id }); window.__insydPlayer.seekTo(s.scan.sounds.find((x) => x.id === id).natural + 2); }, snd); await page.waitForTimeout(500);
const framesBefore = await page.evaluate((id) => +document.querySelector(`.aclip[data-clip-id="${id}"]`).title.match(/· ([\d.]+)s ·/)[1], snd);
await page.click('.insp .tabs button:has-text("2×")'); await page.waitForTimeout(500);
st = await S(); check("sound gets speed: 2", st.layout.sounds[snd]?.speed === 2);
const framesAfter = await page.evaluate((id) => +document.querySelector(`.aclip[data-clip-id="${id}"]`).title.match(/· ([\d.]+)s ·/)[1], snd);
check("its clip is half as long on the timeline", Math.abs(framesAfter * 2 - framesBefore) < 0.1, `${framesBefore}s → ${framesAfter}s`);
check("the composition plays it at 2× (registry)", await page.evaluate((id) => window.__insydRegistry.getSounds("main").find((x) => x.id === id)?.speed === 2, snd));
check("clip label shows 2×", /2×/.test(await page.innerText(`.aclip[data-clip-id="${snd}"]`)));

// ---- scene: whole-scene speed (layout.json), duration follows
const scene = await page.evaluate(() => { const s = window.__insydStore.getState(); const sc = s.scenes()[1]; return { id: sc.id, from: sc.from, duration: sc.duration }; });
const total0 = await page.evaluate(() => window.__insydStore.getState().duration());
const inScene = await page.evaluate((id) => window.__insydStore.getState().allElements().find((e) => e.sceneId === id)?.id, scene.id);
const sceneSig1 = await styleAt(inScene, scene.from + 8);
await page.evaluate((id) => window.__insydStore.getState().select({ type: "scene", id }), scene.id); await page.waitForTimeout(300);
check("scene inspector has the Speed field", /Speed/.test(await page.innerText(".insp")) && (await page.locator('.insp .tabs button:has-text("2×")').count()) === 1);
await page.click('.insp .tabs button:has-text("2×")'); await page.waitForTimeout(400);
st = await S();
check("scene speed 2 stored in layout.sceneSpeeds", st.layout.sceneSpeeds?.[scene.id] === 2);
const spans = () => page.evaluate((id) => { const s = window.__insydStore.getState(); return { dur: s.scenes().find((x) => x.id === id).duration, total: s.duration() }; }, scene.id);
const sp2 = await spans();
check("scene duration halves and later scenes shift", sp2.dur === Math.round(scene.duration / 2) && sp2.total === total0 - (scene.duration - sp2.dur), `${scene.duration} → ${sp2.dur} frames · total ${total0} → ${sp2.total}`);
const sceneSig2 = await styleAt(inScene, scene.from + 4);
check("an element inside the scene at +4 frames matches +8 frames at 1×", sceneSig2 === sceneSig1, inScene);
check("scene block shows 2×", /2×/.test(await page.innerText(".trow.scene .sblock.on")));
await page.click('.insp .tabs button:has-text("1×")'); await page.waitForTimeout(300);
st = await S(); check("back to 1× restores the original duration", (await spans()).dur === scene.duration && st.layout.sceneSpeeds?.[scene.id] === 1);
await page.evaluate(() => { const s = window.__insydStore.getState(); s.undo(); s.undo(); }); await page.waitForTimeout(200);

// ---- save: speed reaches the code (element attribute + sound attribute), restore afterwards
const files = () => { const out = {}; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.tsx?$/.test(e.name)) out[p] = fs.readFileSync(p, "utf8"); } }; walk(path.join(PROJECT, "src")); return out; };
const before = files(); const layoutBefore = fs.readFileSync(path.join(PROJECT, "layout.json"), "utf8");
await page.evaluate((id) => window.__insydStore.getState().updateElement(id, { speed: 1.5 }), pick.id);
await page.evaluate((id) => window.__insydStore.getState().setSceneSpeed(id, 2), scene.id);
await page.click('.topbar .btn:has-text("Save")'); await page.waitForTimeout(3000);
const after = files();
const changed = Object.keys(after).filter((f) => after[f] !== before[f]);
check("save rewrote source files", changed.length > 0, changed.map((f) => path.basename(f)).join(", "));
check("element speed written as speed={1.5}", changed.some((f) => new RegExp(`<Editable[^>]*id=\\{?["'\`]?${pick.id.replace(/\./g, "\\.")}[^>]*speed=\\{1\\.5\\}`).test(after[f]) || new RegExp(`<Editable[^>]*speed=\\{1\\.5\\}[^>]*${pick.id.replace(/\./g, "\\.")}`).test(after[f])) || Object.values(after).some((t) => /speed=\{1\.5\}/.test(t)));
const lj = JSON.parse(fs.readFileSync(path.join(PROJECT, "layout.json"), "utf8"));
check("scene speed saved to layout.json (no code literal) and its duration written to the SCENES table", lj.sceneSpeeds?.[scene.id] === 2 && Object.values(after).some((t) => new RegExp(`id: "${scene.id}"[^}]*duration: ${Math.round(scene.duration / 2)}`).test(t)));
check("sound speed written as speed={2}", Object.values(after).some((t) => /speed=\{2\}/.test(t)) || /"speed": 2/.test(fs.readFileSync(path.join(PROJECT, "layout.json"), "utf8")));
for (const [f, t] of Object.entries(before)) fs.writeFileSync(f, t);
fs.writeFileSync(path.join(PROJECT, "layout.json"), layoutBefore);
check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
await new Promise((r) => setTimeout(r, 1500)); // let a late save land before the snapshot is restored
