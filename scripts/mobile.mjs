// Phone layout: the same editor at 390×844 with a touch screen. Checks the dock, the panels, touch
// scrubbing/dragging on the timeline, the More sheet, and that nothing the desktop does is lost.
import { chromium, devices } from "playwright";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const ctx = await browser.newContext({ ...devices["iPhone 14"], defaultBrowserType: "chromium" });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("  FAIL", m); } };
const shot = (n) => page.screenshot({ path: `.insyd/shots/mobile-${n}.png` });
const S = () => page.evaluate(() => { const s = window.__insydStore.getState(); return { sel: s.selection, multi: s.multi, zoom: s.zoom, frame: window.__insydPlayer?.getCurrentFrame?.() }; });

await page.goto("http://localhost:4321/studio", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 240000 });
await page.evaluate(() => { localStorage.setItem("insyd:theme", "light"); document.documentElement.dataset.theme = "light"; });
await page.waitForTimeout(600);
const restore = await page.evaluate(() => { const s = window.__insydStore.getState(); return JSON.stringify({ layout: s.layout, saved: s.saved }); });

// ---- layout ----
ok(await page.locator(".app.mobile").count() === 1, "mobile shell renders");
ok(await page.locator(".topbar").count() === 0, "desktop top bar is gone");
ok(await page.locator(".m-dock .m-dock-btn").count() === 4, "4 dock items");
const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.body.scrollWidth <= window.innerWidth + 1);
ok(noHScroll, "page does not scroll sideways");
const tl = await page.evaluate(() => { const el = document.querySelector(".tl-tracks"); return { sw: el.scrollWidth, cw: el.clientWidth, names: !!document.querySelector(".tl-names") && getComputedStyle(document.querySelector(".tl-names")).display }; });
ok(tl.sw > tl.cw * 1.8, `timeline scrolls sideways (${tl.sw} > ${tl.cw})`);
ok(tl.names === "none", "name column hidden");
const stage = await page.locator(".stage.m .canvas").boundingBox();
ok(stage && stage.width > 300 && stage.width <= 390 - 24, `canvas fits the width (${Math.round(stage?.width)})`);
await shot("layers");

// ---- layers → inspect ----
await page.locator(".lib .row[data-lib]").first().click();
await page.waitForTimeout(300);
let s = await S();
ok(s.sel?.type === "element", "tap on a layer row selects the element");
ok(await page.locator(".insp").count() === 1, "…and switches to Inspect");
ok(await page.locator('.m-dock-btn[data-tab="inspect"].on').count() === 1, "dock highlights Inspect");
ok(await page.locator(".insp .panel-tabs .tabs button").count() === 2, "Element / Animation tabs");
const fieldH = await page.evaluate(() => document.querySelector('.insp input[type="number"]')?.getBoundingClientRect().height);
ok(fieldH >= 36, `36px fields (${fieldH})`);
await shot("inspect");
await page.locator(".insp .panel-tabs .tabs >> text=Animation").click(); await page.waitForTimeout(200); await shot("animation");

// edit a field from the phone and undo from the transport
const x0 = await page.evaluate(() => window.__insydStore.getState().transform(window.__insydStore.getState().selection.id).x);
await page.locator(".insp .panel-tabs .tabs >> text=Element").click();
const xin = page.locator(".insp .grid2 .field").first().locator("input");
await xin.fill(String(x0 + 50)); await xin.press("Enter"); await page.waitForTimeout(200);
ok((await page.evaluate(() => window.__insydStore.getState().transform(window.__insydStore.getState().selection.id).x)) === x0 + 50, "typing X on the phone moves the element");
await page.locator('.m-transport .m-ib[title="Undo"]').click(); await page.waitForTimeout(200);
ok((await page.evaluate(() => window.__insydStore.getState().transform(window.__insydStore.getState().selection.id).x)) === x0, "transport undo works");

// ---- brand ----
await page.locator('.m-dock-btn[data-tab="brand"]').click(); await page.waitForTimeout(300);
const swatches = await page.locator(".swatch").count();
ok(swatches > 0, "brand palette shown");
await shot("brand");
await page.locator(".swatch").first().click(); await page.waitForTimeout(300);
s = await S(); ok(s.sel?.type === "brand" && (await page.locator(".insp").count()) === 1, "tap swatch → brand inspector");

// ---- transport ----
await page.locator('.m-dock-btn[data-tab="layers"]').click();
await page.locator('.m-transport .m-ib[title="Next scene"]').click(); await page.waitForTimeout(300);
s = await S();
const scenes = await page.evaluate(() => window.__insydStore.getState().scenes().map((x) => x.from));
ok(scenes.includes(s.frame), `next scene seeks to a scene start (f${s.frame})`);
await page.locator(".m-play").click(); await page.waitForTimeout(700);
ok(await page.evaluate(() => window.__insydPlayer.isPlaying()), "play");
await page.locator(".m-play").click(); await page.waitForTimeout(200);
ok(!(await page.evaluate(() => window.__insydPlayer.isPlaying())), "pause");

// ---- timeline touch ----
const ruler = await page.locator(".tl-tracks .trow.ruler").boundingBox();
const tap = async (x, y) => { const c = await page.context().newCDPSession(page); await c.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] }); await c.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await c.detach(); };
const swipe = async (x1, y1, x2, y2, steps = 8) => { const c = await page.context().newCDPSession(page); await c.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x1, y: y1 }] }); for (let i = 1; i <= steps; i++) await c.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x1 + ((x2 - x1) * i) / steps, y: y1 + ((y2 - y1) * i) / steps }] }); await c.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await c.detach(); };
await page.evaluate(() => window.__insydPlayer.seekTo(0)); await page.waitForTimeout(100);
await tap(ruler.x + 120, ruler.y + 10); await page.waitForTimeout(200);
s = await S(); ok(s.frame > 5, `touch on the ruler scrubs (f${s.frame})`);
const f1 = s.frame;
await swipe(ruler.x + 120, ruler.y + 10, ruler.x + 220, ruler.y + 10); await page.waitForTimeout(200);
s = await S(); ok(s.frame > f1 + 5, `dragging the ruler scrubs (f${s.frame})`);
// swipe on an empty lane scrolls the track instead of box-selecting
const lane = await page.locator(".tl-tracks .trow:not(.ruler):not(.scene)").first().boundingBox(); // element lane: its clip sits at the far left
const sl0 = await page.evaluate(() => document.querySelector(".tl-tracks").scrollLeft);
await swipe(lane.x + 360, lane.y + 12, lane.x + 160, lane.y + 12); await page.waitForTimeout(300);
const sl1 = await page.evaluate(() => document.querySelector(".tl-tracks").scrollLeft);
ok(sl1 > sl0, `swiping empty track space scrolls (${sl0} → ${sl1})`);
ok(await page.locator(".marquee").count() === 0, "no marquee from a touch swipe");
await page.evaluate(() => { document.querySelector(".tl-tracks").scrollLeft = 0; });
// drag a clip with a finger
const clip = page.locator(".tl-tracks .clip").first();
const cid = await clip.getAttribute("data-clip-id");
const d0 = await page.evaluate((id) => window.__insydStore.getState().transform(id).delay, cid);
const cb = await clip.boundingBox();
await swipe(cb.x + Math.min(30, cb.width / 2), cb.y + cb.height / 2, cb.x + Math.min(30, cb.width / 2) + 60, cb.y + cb.height / 2); await page.waitForTimeout(300);
const d1 = await page.evaluate((id) => window.__insydStore.getState().transform(id).delay, cid);
ok(d1 > d0, `finger-dragging a clip moves it (${d0} → ${d1})`);
s = await S(); ok(s.sel?.type === "element" && s.sel.id === cid, "…and selects it");
await page.locator('.m-transport .m-ib[title="Undo"]').click();
// tap a scene block
const sb = await page.locator(".tl-tracks .sblock").nth(1).boundingBox();
await tap(sb.x + 10, sb.y + sb.height / 2); await page.waitForTimeout(200);
s = await S(); ok(s.sel?.type === "scene", "tap a scene block selects the scene");
await page.locator('.m-dock-btn[data-tab="inspect"]').click(); await page.waitForTimeout(200);
ok(await page.locator(".insp >> text=Speed").count() > 0, "scene inspector (with speed) on the phone");
await shot("scene");

// ---- more sheet ----
await page.locator(".tl-tracks .clip").first().click(); await page.waitForTimeout(200);
await page.locator('.m-dock-btn[data-tab="more"]').click(); await page.waitForTimeout(300);
ok(await page.locator('[data-testid="more-sheet"]').count() === 1, "More sheet opens");
const box = await page.locator('[data-testid="more-sheet"]').boundingBox();
const vh = await page.evaluate(() => window.innerHeight);
ok(box && Math.abs(box.y + box.height - vh) < 2 && box.width >= 389, `…as a bottom sheet (${JSON.stringify(box)} vh=${vh})`);
await shot("more");
ok(await page.locator(".m-row:has-text('Split at playhead'):not([disabled])").count() === 1, "split enabled with a clip selected");
await page.locator(".m-row:has-text('Lock')").click(); await page.waitForTimeout(200);
ok(await page.evaluate((id) => !!window.__insydStore.getState().transform(id).locked, cid), "Lock from the sheet locks the clip");
ok(await page.locator('[data-testid="more-sheet"]').count() === 0, "sheet closes after an action");
await page.locator('.m-dock-btn[data-tab="more"]').click(); await page.locator(".m-row:has-text('Unlock')").click(); await page.waitForTimeout(200);
await page.locator('.m-dock-btn[data-tab="more"]').click(); await page.locator(".m-zoom .btn:has-text('+')").click(); await page.waitForTimeout(200);
s = await S(); ok(s.zoom > 1, "zoom + from the sheet");
await page.locator(".m-zoom .btn:has-text('Fit')").click(); s = await S(); ok(s.zoom === null, "fit");
await page.keyboard.press("Escape");
// Claude sheet from More
await page.locator('.m-dock-btn[data-tab="more"]').click(); await page.locator(".m-row:has-text('Open in Claude Code')").click(); await page.waitForTimeout(600);
ok(await page.locator(".modal:has-text('Connect the MCP')").count() === 1, "Claude dialog opens as a sheet");
await shot("claude"); await page.keyboard.press("Escape");
// export sheet
await page.locator(".btn.m-export").click(); await page.waitForTimeout(300);
ok(await page.locator(".modal:has-text('Export video')").count() === 1, "export sheet");
await shot("export"); await page.keyboard.press("Escape");
// dark
await page.locator('.m-top .m-ib[title="Switch to dark mode"]').click(); await page.waitForTimeout(400); await shot("dark");
await page.locator('.m-top .m-ib[title="Switch to light mode"]').click();
// project screen
await page.locator('.m-top .m-ib[title="Projects"]').click(); await page.waitForTimeout(500);
ok(await page.locator(".welcome .card").count() === 1, "back → project screen");
await shot("projects");
await page.locator('.welcome .btn[title="Back to the editor"]').click(); await page.waitForTimeout(300);

// ---- desktop unchanged at a wide viewport ----
await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(400);
ok(await page.locator(".app:not(.mobile) .topbar").count() === 1, "resizing wide restores the desktop layout live");
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
ok(await page.locator(".app.mobile").count() === 1, "…and narrow brings the phone layout back");

await page.evaluate((r) => { const { layout, saved } = JSON.parse(r); window.__insydStore.setState({ layout, saved, past: [], future: [] }); }, restore);
console.log(`mobile: ${pass} passed, ${fail} failed`, errors.length ? `\npage errors: ${errors.join("\n")}` : "");
await browser.close();
process.exit(fail || errors.length ? 1 : 0);
