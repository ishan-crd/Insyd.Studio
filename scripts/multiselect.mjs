// Multi-select: ⇧-click two clips in the timeline, drag one → both slide together (and canvas group move).
import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:4321/studio", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 180000 });
await page.waitForTimeout(500);
const S = () => page.evaluate(() => { const s = window.__insydStore.getState(); return { sel: s.selection, multi: s.multi, el: s.layout.elements }; });
const results = []; const check = (n, ok, info = "") => { results.push(ok); console.log(`${ok ? "✓" : "✗"} ${n}${info ? " — " + info : ""}`); };
const clipBox = async (id) => { const clips = await page.$$(".clip"); for (const c of clips) { const t = await c.getAttribute("title"); if (t && t.startsWith(labelOf[id])) return c.boundingBox(); } return null; };
const labelOf = { "yellow.chip1": 'Chip · tap_text("Wi-Fi")', "yellow.chip2": 'Chip · scroll_to("General")', "yellow.chip3": "Chip · describe_screen()" };
const dragMouse = async (x0, y0, x1, y1, steps = 8) => { await page.mouse.move(x0, y0); await page.mouse.down(); for (let i = 1; i <= steps; i++) await page.mouse.move(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); await page.mouse.up(); await page.waitForTimeout(150); };

// bring the yellow scene rows into view
await page.evaluate(() => window.__insydStore.getState().select({ type: "element", id: "yellow.chip1" })); await page.waitForTimeout(500);
let b1 = await clipBox("yellow.chip1"), b2 = await clipBox("yellow.chip2"), b3 = await clipBox("yellow.chip3");
check("clips visible in the timeline", !!b1 && !!b2 && !!b3);
// plain click first clip, shift-click second and third
await page.mouse.click(b1.x + 10, b1.y + b1.height / 2 - 4); await page.waitForTimeout(150);
await page.keyboard.down("Shift"); await page.mouse.click(b2.x + 10, b2.y + b2.height / 2 - 4); await page.mouse.click(b3.x + 10, b3.y + b3.height / 2 - 4); await page.keyboard.up("Shift"); await page.waitForTimeout(200);
let s = await S();
check("⇧-click builds a 3-element selection", s.multi.length === 3 && s.multi.includes("yellow.chip1") && s.multi.includes("yellow.chip3"), JSON.stringify(s.multi));
check("all three clips are highlighted", (await page.$$(".clip.on")).length === 3);
// drag the second clip 30px right → all three shift by the same frames
b2 = await clipBox("yellow.chip2");
await dragMouse(b2.x + b2.width / 2, b2.y + b2.height / 2 - 4, b2.x + b2.width / 2 + 40, b2.y + b2.height / 2 - 4);
s = await S();
const d = ["yellow.chip1", "yellow.chip2", "yellow.chip3"].map((id) => s.el[id]?.delay ?? 0);
check("dragging one selected clip slides all three by the same amount", d[0] > 5 && d[0] === d[1] && d[1] === d[2], `delays=${d.join(",")}`);
check("selection survives the drag", s.multi.length === 3);
// ⌘-click removes one
b3 = await clipBox("yellow.chip3");
await page.keyboard.down("Meta"); await page.mouse.click(b3.x + 10, b3.y + b3.height / 2 - 4); await page.keyboard.up("Meta"); await page.waitForTimeout(150);
s = await S(); check("⌘-click toggles an element out of the selection", s.multi.length === 2 && !s.multi.includes("yellow.chip3"), JSON.stringify(s.multi));
// canvas group move: seek into the yellow scene where chips are visible, drag chip1 on the canvas → chip2 moves too
await page.evaluate(() => window.__insydPlayer.seekTo(1300)); await page.waitForTimeout(400);
const r1 = await page.evaluate(() => window.__insydRegistry.measureId("yellow.chip1"));
const canvas = await (await page.$(".overlay")).boundingBox(); const scale = canvas.width / 1920;
await dragMouse(canvas.x + (r1.x + r1.w / 2) * scale, canvas.y + (r1.y + r1.h / 2) * scale, canvas.x + (r1.x + r1.w / 2) * scale + 50, canvas.y + (r1.y + r1.h / 2) * scale + 20);
s = await S();
check("dragging on the canvas moves the whole group", (s.el["yellow.chip1"]?.x ?? 0) > 50 && Math.abs((s.el["yellow.chip1"]?.x ?? 0) - (s.el["yellow.chip2"]?.x ?? 0)) < 0.01 && Math.abs((s.el["yellow.chip1"]?.y ?? 0) - (s.el["yellow.chip2"]?.y ?? 0)) < 0.01, `chip1=${JSON.stringify(s.el["yellow.chip1"])} chip2=${JSON.stringify(s.el["yellow.chip2"])}`);
check("two selection boxes drawn on the canvas", (await page.$$(".box.selected")).length === 2);
// arrow nudge moves both
await page.mouse.click(1450, 640); // focus somewhere neutral (inspector blank area)
await page.keyboard.press("Shift+ArrowRight"); await page.waitForTimeout(150);
const s2 = await S();
check("arrow keys nudge the group", (s2.el["yellow.chip1"].x - s.el["yellow.chip1"].x) === 10 && (s2.el["yellow.chip2"].x - s.el["yellow.chip2"].x) === 10);
// undo collapses the group move in one step
await page.keyboard.press("Meta+z"); await page.waitForTimeout(150);
const s3 = await S(); check("one undo reverts the whole group nudge", s3.el["yellow.chip1"].x === s.el["yellow.chip1"].x && s3.el["yellow.chip2"].x === s.el["yellow.chip2"].x);
// inspector shows the group header
check("inspector shows the group header", /2 elements selected/.test(await page.innerText(".insp")));
// Escape clears
await page.keyboard.press("Escape"); s = await S(); check("Escape clears the selection", s.multi.length === 0 && s.sel === null);
check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
