// Element clip vocabulary: linked duplicate, paste at playhead, split (trim window), trim handles, delete/hide, lock, save.
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
const S = () => page.evaluate(() => { const s = window.__insydStore.getState(); return { sel: s.selection, multi: s.multi, el: s.layout.elements, frame: window.__insydPlayer.getCurrentFrame() }; });
const seek = async (f) => { await page.evaluate((f) => window.__insydPlayer.seekTo(f), f); await page.waitForTimeout(300); };
const dragMouse = async (x0, y0, x1, y1, steps = 8) => { await page.mouse.move(x0, y0); await page.mouse.down(); for (let i = 1; i <= steps; i++) await page.mouse.move(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); await page.mouse.up(); await page.waitForTimeout(150); };
const mounted = (id) => page.evaluate((id) => !!window.__insydRegistry.getElement(id), id);

await page.goto("http://localhost:4321/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 240000 });
await page.waitForTimeout(2000);
await page.evaluate(() => { document.querySelector(".app").style.setProperty("--tl-h", "440px"); }); await page.waitForTimeout(300);

// ---- duplicate the CTA headline (⌘D) → linked copy renders, offset, own clip row
await seek(1362);
await page.evaluate(() => window.__insydStore.getState().select({ type: "element", id: "cta.headline" })); await page.waitForTimeout(200);
await page.keyboard.press("Meta+d"); await page.waitForTimeout(500);
let s = await S();
check("⌘D creates a linked copy (cloneOf) offset by 24px", s.el["cta.headline.copy1"]?.cloneOf === "cta.headline" && s.el["cta.headline.copy1"].x === 24, JSON.stringify(s.el["cta.headline.copy1"]));
check("the copy is mounted and shows the same text", await page.evaluate(() => { const c = window.__insydRegistry.getElement("cta.headline.copy1"); return !!c && /Give\s*Claude/.test(c.el.textContent || ""); }), await page.evaluate(() => (window.__insydRegistry.getElement("cta.headline.copy1")?.el.textContent || "").slice(0, 40)));
check("the copy gets its own clip row in the timeline", !!(await page.$('[data-clip-id="cta.headline.copy1"]')));
const r0 = await page.evaluate(() => window.__insydRegistry.measureId("cta.headline")), r1 = await page.evaluate(() => window.__insydRegistry.measureId("cta.headline.copy1"));
check("copy sits 24px right/below the original", Math.abs(r1.x - r0.x - 24) < 1 && Math.abs(r1.y - r0.y - 24) < 1, `Δ=${(r1.x - r0.x).toFixed(1)},${(r1.y - r0.y).toFixed(1)}`);
// move the copy independently via canvas drag
const canvas = await (await page.$(".overlay")).boundingBox(); const scale = canvas.width / 1920;
await dragMouse(canvas.x + (r1.x + r1.w - 20) * scale, canvas.y + (r1.y + r1.h / 2) * scale, canvas.x + (r1.x + r1.w - 20) * scale + 80, canvas.y + (r1.y + r1.h / 2) * scale + 40);
s = await S(); check("the copy moves independently of the original", (s.el["cta.headline.copy1"].x ?? 0) > 100 && (s.el["cta.headline"]?.x ?? 0) === 0, JSON.stringify({ copy: s.el["cta.headline.copy1"].x, orig: s.el["cta.headline"]?.x }));
// delete the copy → removed; delete the original → hidden
await page.keyboard.press("Backspace"); await page.waitForTimeout(200);
s = await S(); check("⌫ on a linked copy removes it", !s.el["cta.headline.copy1"]);
await page.evaluate(() => window.__insydStore.getState().select({ type: "element", id: "cta.headline" }));
await page.keyboard.press("Backspace"); await page.waitForTimeout(300);
s = await S(); check("⌫ on a code element hides it (toast)", s.el["cta.headline"]?.hidden === true && /hidden instead/.test(await page.innerText(".toast").catch(() => "")));
await page.evaluate(() => window.__insydStore.getState().undo());

// ---- copy / paste at playhead with relative offsets (two search elements → pasted into the figma scene)
await page.evaluate(() => { window.__insydStore.setState({ selection: { type: "element", id: "search.card" }, multi: ["search.card", "search.phone"] }); });
await page.keyboard.press("Meta+c"); await seek(520); await page.keyboard.press("Meta+v"); await page.waitForTimeout(500);
s = await S();
const pc = s.el["search.card.copy1"], pp = s.el["search.phone.copy1"];
const firstCard = await page.evaluate(() => window.__insydStore.getState().scan.elements.find((e) => e.id === "search.card").first);
check("⌘V pastes linked copies timed to the playhead", !!pc && !!pp && pc.cloneOf === "search.card" && (firstCard + pc.delay) === 520, JSON.stringify({ cardDelay: pc?.delay, phoneDelay: pp?.delay, firstCard }));
check("relative offset between the two is preserved", pp && pc && (pp.delay - pc.delay) === 0, `Δdelay=${pp?.delay - pc?.delay}`);
check("pasted copy is mounted at the playhead", await mounted("search.card.copy1"));
await seek(1000); await page.keyboard.press("Meta+v"); await page.waitForTimeout(400);
check("pasting outside the source scene keeps the copy in its scene (clamped, with a toast)", (await S()).el["search.card.copy2"]?.delay === 0 && /source scene/.test(await page.innerText(".toast").catch(() => "")));
await page.evaluate(() => window.__insydStore.getState().undo());
await page.evaluate(() => window.__insydStore.getState().undo());

// ---- split at playhead: original gets trimOut, copy gets trimIn
await seek(1000);
await page.evaluate(() => window.__insydStore.getState().select({ type: "element", id: "figma.phone" }));
await page.keyboard.press("Meta+k"); await page.waitForTimeout(400);
s = await S();
const local = 1000 - (await page.evaluate(() => window.__insydStore.getState().scan.elements.find((e) => e.id === "figma.phone").first));
check("⌘K splits: original ends before the playhead, copy starts at it", s.el["figma.phone"]?.trimOut === local - 1 && s.el["figma.phone.copy1"]?.trimIn === local, JSON.stringify({ o: s.el["figma.phone"], c: s.el["figma.phone.copy1"] }));
await seek(990); check("before the split point only the original exists", (await mounted("figma.phone")) && !(await mounted("figma.phone.copy1")));
await seek(1010); check("after the split point only the copy exists", !(await mounted("figma.phone")) && (await mounted("figma.phone.copy1")));
await page.evaluate(() => window.__insydStore.getState().undo());

// ---- trim handles on an element clip
await page.evaluate(() => window.__insydStore.getState().select({ type: "element", id: "figma.window" })); await page.waitForTimeout(400);
let cb = await (await page.$('[data-clip-id="figma.window"]')).boundingBox();
await dragMouse(cb.x + cb.width - 2, cb.y + cb.height / 2, cb.x + cb.width - 40, cb.y + cb.height / 2);
s = await S(); check("dragging the clip's right edge sets trimOut", typeof s.el["figma.window"]?.trimOut === "number" && s.el["figma.window"].trimOut < 341, JSON.stringify(s.el["figma.window"]));
cb = await (await page.$('[data-clip-id="figma.window"]')).boundingBox();
await dragMouse(cb.x + 2, cb.y + cb.height / 2, cb.x + 30, cb.y + cb.height / 2);
s = await S(); check("dragging the left edge sets trimIn", (s.el["figma.window"]?.trimIn ?? 0) > 0, JSON.stringify(s.el["figma.window"]));
await seek(760); check("element absent before trimIn", !(await mounted("figma.window")));
await page.evaluate(() => { const st = window.__insydStore.getState(); st.undo(); st.undo(); });

// ---- lock
await page.evaluate(() => window.__insydStore.getState().select({ type: "element", id: "figma.window" }));
await page.keyboard.press("Meta+l"); await page.waitForTimeout(200);
s = await S(); check("⌘L locks an element", s.el["figma.window"]?.locked === true);
await seek(900);
const rw = await page.evaluate(() => window.__insydRegistry.measureId("figma.window"));
await dragMouse(canvas.x + (rw.x + rw.w / 2) * scale, canvas.y + (rw.y + 30) * scale, canvas.x + (rw.x + rw.w / 2) * scale + 60, canvas.y + (rw.y + 30) * scale);
s = await S(); check("locked element does not move on the canvas", (s.el["figma.window"]?.x ?? 0) === 0);
await page.keyboard.press("Backspace"); s = await S(); check("locked element cannot be deleted", s.el["figma.window"]?.hidden !== true);
// context menu on the canvas
await page.mouse.click(canvas.x + (rw.x + rw.w / 2) * scale, canvas.y + (rw.y + 30) * scale, { button: "right" }); await page.waitForTimeout(200);
check("canvas right-click shows the element menu with Unlock", /Duplicate \(linked copy\)[\s\S]*Unlock/.test(await page.innerText(".ctx").catch(() => "")));
await page.click('.ctx .ctx-item:has-text("Unlock")'); await page.waitForTimeout(200);
s = await S(); check("Unlock from the menu works", s.el["figma.window"]?.locked === false);

// ---- save: trimOut/locked to code, clones to layout.json
await page.evaluate(() => { const st = window.__insydStore.getState(); st.updateElement("figma.window", { trimOut: 300, locked: true }); st.select({ type: "element", id: "figma.phone" }); });
await page.keyboard.press("Meta+d"); await page.waitForTimeout(200);
await page.keyboard.press("Meta+s");
await page.waitForFunction(() => document.body.innerText.includes("Saved"), null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(2500);
const fig = fs.readFileSync(path.join(PROJECT, "src/scenes/SceneFigma.tsx"), "utf8");
check("SceneFigma.tsx: trimOut + locked written as attrs", /<Editable id="figma.window" trimOut=\{300\} locked /.test(fig), fig.match(/<Editable id="figma.window"[^>]*>/)?.[0]?.slice(0, 80));
const lj = JSON.parse(fs.readFileSync(path.join(PROJECT, "layout.json"), "utf8"));
check("linked copy persisted in layout.json", lj.elements?.["figma.phone.copy1"]?.cloneOf === "figma.phone");
await page.waitForFunction(() => window.__insydStore?.getState().def, null, { timeout: 60000 }); await page.waitForTimeout(1500); await seek(900);
check("after reload the copy still renders (from layout.json defaults)", await mounted("figma.phone.copy1"));
check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
await finish(results.every(Boolean) ? 0 : 1);
