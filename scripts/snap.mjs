// Snapping: timeline clips snap to other clips / playhead / scene cuts; canvas elements snap to each other.
import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const results = []; const check = (n, ok, info = "") => { results.push(ok); console.log(`${ok ? "✓" : "✗"} ${n}${info ? " — " + info : ""}`); };
const S = () => page.evaluate(() => { const s = window.__insydStore.getState(); return { el: s.layout.elements, snd: s.layout.sounds, first: Object.fromEntries(s.scan.elements.map((e) => [e.id, e.first])), scenes: s.scenes() }; });
const dragTo = async (x0, y0, x1, y1, steps = 10, holdAlt = false) => { await page.mouse.move(x0, y0); await page.mouse.down(); if (holdAlt) await page.keyboard.down("Alt"); for (let i = 1; i <= steps; i++) await page.mouse.move(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); await page.waitForTimeout(80); };
const clipBoxInView = async (sel) => {
  await page.evaluate((sel) => { const el = document.querySelector(sel); const t = document.querySelector(".tl-tracks"); const left = parseFloat(el.style.left || "0"); t.scrollLeft = Math.max(0, left - t.clientWidth / 2); }, sel);
  await page.waitForTimeout(200);
  return (await page.$(sel)).boundingBox();
};
const release = async (holdAlt = false) => { if (holdAlt) await page.keyboard.up("Alt"); await page.mouse.up(); await page.waitForTimeout(150); };

await page.goto("http://localhost:4321/studio", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 240000 });
await page.waitForTimeout(2000);
await page.evaluate(() => { document.querySelector(".app").style.setProperty("--tl-h", "440px"); window.__insydStore.getState().setZoom(4); }); await page.waitForTimeout(300);
let s = await S();
const ppf = await page.evaluate(() => { const el = document.querySelector(".tl-inner"); return (el.clientWidth - 48) / window.__insydStore.getState().duration(); });

// ---- timeline: drag the "ship.headline" clip so its start lands ~3 frames before the figma scene cut → snaps exactly to the cut
await page.evaluate(() => window.__insydStore.getState().select({ type: "element", id: "ship.headline" })); await page.waitForTimeout(400);
const figmaFrom = s.scenes.find((x) => x.id === "figma").from;
let cb = await clipBoxInView('[data-clip-id="ship.headline"]');
const tracks = await (await page.$(".tl-tracks")).boundingBox();
const startFrame = s.first["ship.headline"];
const targetDeltaFrames = (figmaFrom - 1) - startFrame; // land 1f short of the cut; snap should pull it to the cut
await dragTo(cb.x + cb.width / 2, cb.y + cb.height / 2, cb.x + cb.width / 2 + targetDeltaFrames * ppf, cb.y + cb.height / 2);
check("snap guide line shows while dragging near a scene cut", !!(await page.$(".snapline")));
await release();
s = await S(); check("clip start snaps exactly to the scene cut", startFrame + (s.el["ship.headline"]?.delay ?? 0) === figmaFrom, `start=${startFrame + (s.el["ship.headline"]?.delay ?? 0)} cut=${figmaFrom}`);
check("guide removed after release", !(await page.$(".snapline")));
await page.evaluate(() => window.__insydStore.getState().undo());
// with ⌥ held → no snap
cb = await clipBoxInView('[data-clip-id="ship.headline"]');
await dragTo(cb.x + cb.width / 2, cb.y + cb.height / 2, cb.x + cb.width / 2 + targetDeltaFrames * ppf, cb.y + cb.height / 2, 10, true);
check("no guide with ⌥ held", !(await page.$(".snapline")));
await release(true);
s = await S(); check("⌥-drag bypasses snapping", startFrame + (s.el["ship.headline"]?.delay ?? 0) === figmaFrom - 1, `start=${startFrame + (s.el["ship.headline"]?.delay ?? 0)}`);
await page.evaluate(() => window.__insydStore.getState().undo());

// ---- timeline: snap to the playhead
await page.evaluate((f) => window.__insydPlayer.seekTo(f), startFrame + 40); await page.waitForTimeout(200);
cb = await clipBoxInView('[data-clip-id="ship.headline"]');
await dragTo(cb.x + cb.width / 2, cb.y + cb.height / 2, cb.x + cb.width / 2 + 38 * ppf, cb.y + cb.height / 2); await release();
s = await S(); check("clip start snaps to the playhead", (s.el["ship.headline"]?.delay ?? 0) === 40, `delay=${s.el["ship.headline"]?.delay}`);
await page.evaluate(() => window.__insydStore.getState().undo());

// ---- sound clip snaps to another clip's edge
await page.evaluate(() => { const t = document.querySelector(".tl-tracks"); t.scrollTop = t.scrollHeight; }); await page.waitForTimeout(300);
const music = await (await page.$('.aclip[title^="Music bed"]')).boundingBox();
await page.evaluate(() => { const t = document.querySelector(".tl-tracks"); t.scrollLeft = 0; }); await page.waitForTimeout(200);
const sfx = await page.$$('.aclip[title^="Whoosh"]'); const w2 = await sfx[0].boundingBox(); const wTitle = await sfx[0].getAttribute("title");
const wStart = Number(wTitle.match(/starts f(\d+)/)[1]);
// move the whoosh so its start lands 2 frames after the music start (0) → should snap to 0
await dragTo(w2.x + w2.width / 2, w2.y + w2.height / 2, w2.x + w2.width / 2 - (wStart - 2) * ppf, w2.y + w2.height / 2); await release();
const wid = await page.evaluate(() => Object.entries(window.__insydStore.getState().layout.sounds).find(([, v]) => typeof v.shift === "number")?.[0]);
const newStart = wid ? (await page.evaluate((id) => { const s = window.__insydStore.getState(); const sc = s.scan.sounds.find((x) => x.id === id); return sc.natural + (s.layout.sounds[id].shift ?? 0); }, wid)) : null;
check("sound clip snaps to the music clip's start", newStart === 0, `start=${newStart} (${wid})`);
await page.evaluate(() => window.__insydStore.getState().undo());

// ---- canvas: element snaps to another element's left edge
await page.evaluate(() => { window.__insydPlayer.seekTo(1000); window.__insydStore.getState().select({ type: "element", id: "figma.phone" }); }); await page.waitForTimeout(400);
const canvas = await (await page.$(".overlay")).boundingBox(); const scale = canvas.width / 1920;
const win = await page.evaluate(() => window.__insydRegistry.measureId("figma.window"));
const ph = await page.evaluate(() => window.__insydRegistry.measureId("figma.phone"));
// drag the phone so its left edge lands 5px right of the figma window's right edge → should snap flush to it
const wantDx = (win.x + win.w) - ph.x + 5;
await dragTo(canvas.x + (ph.x + ph.w / 2) * scale, canvas.y + (ph.y + 60) * scale, canvas.x + (ph.x + ph.w / 2 + wantDx) * scale, canvas.y + (ph.y + 60) * scale);
check("vertical guide shows on the canvas while snapping", !!(await page.$(".guide.v")));
await release();
const ph2 = await page.evaluate(() => window.__insydRegistry.measureId("figma.phone"));
check("phone snaps flush to the window's right edge", Math.abs(ph2.x - (win.x + win.w)) < 0.6, `Δ=${(ph2.x - (win.x + win.w)).toFixed(2)}`);
check("canvas guides cleared after release", !(await page.$(".guide.v")));
await page.evaluate(() => window.__insydStore.getState().undo());
check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
