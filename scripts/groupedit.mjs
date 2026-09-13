// Group inspector: with several items selected, only shared fields show and edits apply to all.
import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const results = []; const check = (n, ok, info = "") => { results.push(ok); console.log(`${ok ? "✓" : "✗"} ${n}${info ? " — " + info : ""}`); };
await page.goto("http://localhost:4321/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 240000 });
await page.waitForTimeout(2000);

// ---- sounds: select ALL sounds (like the screenshot) and change volume from the inspector
await page.evaluate(() => { const s = window.__insydStore.getState(); const ids = s.scan.sounds.map((x) => x.id); window.__insydStore.setState({ selection: { type: "sound", id: ids[0] }, multi: ids }); });
await page.waitForTimeout(500);
const insp = await page.innerText(".insp");
check("group panel shows N sounds selected", /9\d sounds selected/.test(insp), insp.match(/\d+ sounds selected/)?.[0]);
check("only shared fields: no per-sound waveform/Start/Shift fields", /Volume/.test(insp) && /Muted/.test(insp) && /Move all/.test(insp) && /Replace all/.test(insp) && !/Starts at/.test(insp) && !/decoding|0\.45s/.test(insp));
check("volume marked Mixed when it differs", /Mixed/.test(insp));
// set volume via the inspector number field → all sounds get it
const volInput = page.locator(".insp .field:has(label:has-text('Volume')) input[type=number]");
await volInput.fill("4"); await volInput.dispatchEvent("change"); await page.waitForTimeout(400);
let vols = await page.evaluate(() => { const s = window.__insydStore.getState(); return s.scan.sounds.map((x) => s.layout.sounds[x.id]?.volume); });
check("volume applies to every selected sound", vols.length > 60 && vols.every((v) => Math.abs(v - 0.04) < 1e-9), `${vols.filter((v) => Math.abs(v - 0.04) < 1e-9).length}/${vols.length} at 4%`);
check("the composition plays them at the new level", await page.evaluate(() => window.__insydRegistry.getSounds("main").every((x) => Math.abs(x.volume - 0.04) < 1e-9)));
check("Mixed tag gone once all match", !/Mixed/.test(await page.innerText(".insp .field:has(label:has-text('Volume'))")));
check("one undo step reverts the whole group", await page.evaluate(async () => { const n0 = window.__insydStore.getState().past.length; window.__insydStore.getState().undo(); const s = window.__insydStore.getState(); return n0 >= 1 && s.scan.sounds.every((x) => s.layout.sounds[x.id]?.volume === s.saved.sounds[x.id]?.volume); }));
// mute all via the switch
await page.locator(".insp .field:has(label:has-text('Muted')) input[type=checkbox]").click(); await page.waitForTimeout(300);
check("mute switch mutes every selected sound", await page.evaluate(() => { const s = window.__insydStore.getState(); return s.scan.sounds.every((x) => s.layout.sounds[x.id]?.muted === true); }));
await page.evaluate(() => window.__insydStore.getState().undo());
// Move all +10f
await page.click(".insp .field:has(label:has-text('Move all')) button:has-text('+10')"); await page.waitForTimeout(300);
check("Move all shifts every selected sound by 10 frames", await page.evaluate(() => { const s = window.__insydStore.getState(); return s.scan.sounds.filter((x) => !x.added).every((x) => s.layout.sounds[x.id]?.shift === (x.defaults.shift ?? 0) + 10); }));
await page.evaluate(() => window.__insydStore.getState().undo());

// ---- elements: select the five search-scene elements + two headlines
await page.evaluate(() => { const ids = ["search.card", "search.phone", "search.mascot"]; window.__insydStore.setState({ selection: { type: "element", id: ids[0] }, multi: ids }); window.__insydPlayer.seekTo(560); });
await page.waitForTimeout(600);
const insp2 = await page.innerText(".insp");
check("element group panel shows shared transform fields only", /3 elements selected/.test(insp2) && /Scale/.test(insp2) && /Opacity/.test(insp2) && /Move X/.test(insp2) && !/Position/.test(insp2) && !/Animation/.test(insp2));
check("no shared property when suffixes differ (card/phone have width, mascot has size)", !/Shared properties/i.test(insp2));
await page.evaluate(() => { const ids = ["search.card", "search.phone"]; window.__insydStore.setState({ selection: { type: "element", id: ids[0] }, multi: ids }); }); await page.waitForTimeout(400);
check("card + phone share Width", /Shared properties/i.test(await page.innerText(".insp")) && /Width/.test(await page.innerText(".insp")));
await page.evaluate(() => { const ids = ["search.card", "search.phone", "search.mascot"]; window.__insydStore.setState({ selection: { type: "element", id: ids[0] }, multi: ids }); }); await page.waitForTimeout(400);
const op = page.locator(".insp .field:has(label:has-text('Opacity')) input[type=number]");
await op.fill("0.5"); await op.dispatchEvent("change"); await page.waitForTimeout(300);
check("opacity applies to all selected elements", await page.evaluate(() => ["search.card", "search.phone", "search.mascot"].every((id) => window.__insydStore.getState().layout.elements[id]?.opacity === 0.5)));
await page.click(".insp .field:has(label:has-text('Move X')) button:has-text('+10')"); await page.waitForTimeout(300);
check("Move X nudges all selected elements", await page.evaluate(() => ["search.card", "search.phone", "search.mascot"].every((id) => window.__insydStore.getState().layout.elements[id]?.x === 10)));
// text-only elements: headlines share "size"
await page.evaluate(() => { const ids = ["control.headline", "ship.headline", "cta.headline"]; window.__insydStore.setState({ selection: { type: "element", id: ids[0] }, multi: ids }); });
await page.waitForTimeout(500);
const sizeInput = page.locator(".insp .field:has(label:has-text('Size')) input[type=number]").first();
check("three headlines share the Size property", await sizeInput.count() === 1);
await sizeInput.fill("120"); await sizeInput.dispatchEvent("change"); await page.waitForTimeout(300);
check("shared Size applies to all three headlines", await page.evaluate(() => ["control.headline.size", "ship.headline.size", "cta.headline.size"].every((id) => window.__insydStore.getState().layout.props[id] === 120)));
check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
