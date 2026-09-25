// Clip timing: for whatever project Studio has open, every element's clip in the timeline must start
// and end on exactly the frames the element is on screen, and moving a clip must move it on screen.
import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
let pass = 0, fail = 0;
const check = (c, m) => { if (c) pass++; else { fail++; console.log("  ✗", m); } };
await page.goto("http://localhost:4321/", { waitUntil: "load", timeout: 180000 });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 600000 });
const clips = () => page.evaluate(() => {
  const s = window.__insydStore.getState();
  return s.allElements().map((e) => { const t = s.transform(e.id); return { id: e.id, start: e.first + t.delay + t.trimIn, end: e.first + t.delay + (t.trimOut ?? e.last - e.first), delay: t.delay }; });
});
const last = await page.evaluate(() => window.__insydStore.getState().duration() - 1);
const on = async (f, id) => { await page.evaluate((f) => window.__insydPlayer.seekTo(f), f); await page.waitForTimeout(50); return page.evaluate((id) => window.__insydRegistry.getElements("main").some((e) => e.id === id), id); };
const exact = async (c) => (c.start <= 0 || !(await on(c.start - 1, c.id))) && (await on(c.start, c.id)) && (await on(Math.min(c.end, last), c.id)) && (c.end >= last || !(await on(c.end + 1, c.id)));
const all = await clips();
let bad = 0;
for (const c of all) if (!(await exact(c))) { bad++; console.log(`  ✗ ${c.id}: timeline ${c.start}–${c.end} ≠ on screen`); }
check(bad === 0, `${bad} of ${all.length} clips off`);
console.log(`  ${all.length} clips checked`);
// move a clip that starts mid-scene by +12 frames: the element must follow on screen, and undo restores it
const c = all.find((x) => x.start > 12 && x.end < last - 20 && x.end - x.start > 20);
if (c) {
  await page.evaluate(({ id, d }) => window.__insydStore.getState().updateElement(id, { delay: d }), { id: c.id, d: c.delay + 12 });
  const moved = (await clips()).find((x) => x.id === c.id);
  check(moved.start === c.start + 12 && moved.end === c.end + 12, `timeline follows the move (${moved.start}–${moved.end})`);
  check(await exact(moved), `${c.id} on screen at its moved clip`);
  await page.evaluate(() => window.__insydStore.getState().undo());
  check(await exact(c), "undo puts it back");
}
check(errors.length === 0, "no page errors " + errors.slice(0, 2).join(" | "));
console.log(`${pass}/${pass + fail} passed`);
await browser.close();
process.exit(fail ? 1 : 0);
