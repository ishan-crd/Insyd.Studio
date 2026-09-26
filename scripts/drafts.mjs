// Unsaved drafts vs. code that changed underneath them: restored edits whose code value changed since
// they were made are dropped (with a toast); edits still valid are kept; Discard throws the rest away.
import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
let pass = 0, fail = 0;
const check = (c, m, d = "") => { if (c) pass++; else { fail++; console.log("  ✗", m, d); } };
const load = async () => { await page.goto("http://localhost:4321/studio", { waitUntil: "load", timeout: 180000 }); await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 600000 }); await page.waitForTimeout(800); };
await load();
// pick a clip the code positions explicitly (delay in the code) and one it does not
const ids = await page.evaluate(() => { const loc = window.__insydStore.getState().index.locators; const all = Object.keys(loc).filter((k) => k.startsWith("jsx:"));
  const v = (k) => loc[k].values ?? {};
  return { placed: all.find((k) => (v(k).delay ?? 0) > 10).slice(4), free: all.find((k) => v(k).delay === undefined && v(k).x === undefined).slice(4) }; });
const key = await page.evaluate(() => Object.keys(localStorage).find((k) => k.startsWith("insyd:draft:")) ?? ("insyd:draft:" + window.__INSYD_PROJECT__));
const draftKey = key ?? (await page.evaluate(() => { const s = window.__insydStore.getState(); s.updateElement(s.allElements()[0].id, { x: 1 }); return Object.keys(localStorage).find((k) => k.startsWith("insyd:draft:")); }));
// 1. a legacy (v1) draft that moves the explicitly-placed clip to frame 1 and nudges a free one
await page.evaluate(({ k, placed, free }) => localStorage.setItem(k, JSON.stringify({ version: 3, elements: { [placed]: { delay: 1 }, [free]: { x: 40 } }, copy: {}, scenes: {}, props: {}, sounds: {}, sceneSpeeds: {} })), { k: draftKey, ...ids });
await load();
let L = await page.evaluate(() => window.__insydStore.getState().layout.elements);
check(L[ids.placed]?.delay === undefined, `legacy draft: stale move of ${ids.placed} dropped`, JSON.stringify(L[ids.placed]));
check(L[ids.free]?.x === 40, `legacy draft: edit on ${ids.free} (no code value) kept`, JSON.stringify(L[ids.free]));
// 2. a v2 draft whose base no longer matches the code → dropped; matching base → kept
const cd = await page.evaluate((id) => window.__insydStore.getState().index.locators[`jsx:${id}`].values, ids.placed);
await page.evaluate(({ k, placed, free, cd }) => localStorage.setItem(k, JSON.stringify({ v: 2, layout: { version: 3, elements: { [placed]: { delay: cd.delay + 9 }, [free]: { y: 12 } }, copy: {}, scenes: {}, props: {}, sounds: {}, sceneSpeeds: {} },
  base: { elements: { [placed]: { ...cd, delay: cd.delay - 50 }, [free]: {} }, props: {} } })), { k: draftKey, ...ids, cd });
await load();
L = await page.evaluate(() => window.__insydStore.getState().layout.elements);
check(L[ids.placed]?.delay === undefined, "v2 draft: edit made against an older code value dropped", JSON.stringify(L[ids.placed]));
check(L[ids.free]?.y === 12, "v2 draft: edit whose code is unchanged kept", JSON.stringify(L[ids.free]));
await page.evaluate(({ k, placed, cd }) => localStorage.setItem(k, JSON.stringify({ v: 2, layout: { version: 3, elements: { [placed]: { delay: cd.delay + 9 } }, copy: {}, scenes: {}, props: {}, sounds: {}, sceneSpeeds: {} }, base: { elements: { [placed]: cd }, props: {} } })), { k: draftKey, ...ids, cd });
await load();
L = await page.evaluate(() => window.__insydStore.getState().layout.elements);
check(L[ids.placed]?.delay === cd.delay + 9, "v2 draft: a move made against the current code survives a reload");
// 3. Discard
check(await page.locator('.topbar .btn:has-text("Discard")').count() === 1, "Discard shown while there are unsaved changes");
await page.click('.topbar .btn:has-text("Discard")'); await page.waitForTimeout(300);
check(await page.evaluate(() => !window.__insydStore.getState().dirty()), "Discard → nothing unsaved");
check(await page.locator('.topbar .btn:has-text("Discard")').count() === 0, "Discard hidden when clean");
await page.keyboard.press("Meta+z"); await page.waitForTimeout(200);
check(await page.evaluate((id) => window.__insydStore.getState().layout.elements[id]?.delay, ids.placed) === cd.delay + 9, "⌘Z brings discarded edits back");
await page.click('.topbar .btn:has-text("Discard")'); await page.waitForTimeout(200);
await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("insyd:draft:")) localStorage.removeItem(k); });
check(errors.length === 0, "no page errors", errors.slice(0, 2).join(" | "));
console.log(`${pass}/${pass + fail} passed`);
await browser.close();
process.exit(fail ? 1 : 0);
