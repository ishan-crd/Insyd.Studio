// End-to-end: exercises every editing path in a real browser and checks that Save rewrites source files.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

import { PROJECT, snapshotProject, finish } from "./lib/project.mjs";
snapshotProject();
const BASE = "http://localhost:4321/";
const results = []; let failed = 0;
const check = (name, ok, info = "") => { results.push([ok ? "PASS" : "FAIL", name, info]); if (!ok) failed++; console.log(`${ok ? "✓" : "✗"} ${name}${info ? "  — " + info : ""}`); };

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.addInitScript(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith("insyd:")) localStorage.removeItem(k); } catch {} });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const S = () => page.evaluate(() => window.__insydStore.getState());
const st = (fn) => page.evaluate(fn);
const rectOf = (id) => page.evaluate((id) => { const en = window.__insydRegistry.getElement(id); if (!en) return null; const r = en.el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, id);
const seek = async (f) => { await page.evaluate((f) => window.__insydPlayer.seekTo(f), f); await page.waitForTimeout(250); };
const dragMouse = async (x0, y0, x1, y1, steps = 8) => { await page.mouse.move(x0, y0); await page.mouse.down(); for (let i = 1; i <= steps; i++) await page.mouse.move(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); await page.mouse.up(); await page.waitForTimeout(150); };

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 180000 });
await page.waitForTimeout(500);
let s = await S();
check("project loads + scan finds elements", s.scan.elements.length >= 28, `${s.scan.elements.length} elements`);
const propCount = await st(() => window.__insydRegistry.getProps().length);
check("editable props registered (edit/brand/useAnim)", propCount >= 40, `${propCount} props`);

// ---- canvas hit-test + drag
await seek(1362); // CTA scene starts at f1340
let r = await rectOf("cta.headline");
check("CTA headline mounted at f1362", !!r);
await page.mouse.click(r.x + r.w / 2, r.y + r.h / 2); await page.waitForTimeout(200);
s = await S(); check("click on canvas selects the innermost Editable", s.selection?.id === "cta.headline", JSON.stringify(s.selection));
await dragMouse(r.x + r.w / 2, r.y + r.h / 2, r.x + r.w / 2 + 120, r.y + r.h / 2 + 30);
s = await S(); const t1 = s.layout.elements["cta.headline"];
check("drag moves the element (x≈+240 comp px at 0.5 scale)", t1 && t1.x > 150 && t1.y > 30, JSON.stringify(t1));
const r2 = await rectOf("cta.headline");
check("DOM follows the drag", Math.abs((r2.x - r.x) - 120) < 6, `moved ${Math.round(r2.x - r.x)}px`);
// snap: drag back near centre → x snaps so element centre = 960
await dragMouse(r2.x + r2.w / 2, r2.y + r2.h / 2, r2.x + r2.w / 2 - 118, r2.y + r2.h / 2);
s = await S(); const cx = await page.evaluate(() => { const r = window.__insydRegistry.measureId("cta.headline"); return r.x + r.w / 2; });
check("centre snapping (within 1px of 960)", Math.abs(cx - 960) < 1.5, `centre x=${cx.toFixed(1)}`);
// scale handle
const box = await page.$(".box.selected .handle.se"); const hb = await box.boundingBox();
await dragMouse(hb.x + 5, hb.y + 5, hb.x + 60, hb.y + 40);
s = await S(); check("corner handle scales", (s.layout.elements["cta.headline"]?.scale ?? 1) > 1.05, `scale=${s.layout.elements["cta.headline"]?.scale}`);

// ---- inspector: number prop → DOM
await page.evaluate(() => window.__insydStore.getState().setProp("cta.headline.size", 140));
await page.waitForTimeout(250);
const fs1 = await page.evaluate(() => { const el = document.querySelector('[data-insyd-id="cta.headline"] > div'); return el ? getComputedStyle(el).fontSize : "(not mounted)"; });
check("number prop (headline size) updates the composition", fs1 === "140px", fs1);
// inspector renders the prop rows for the selected element
const inspText = await page.innerText(".insp");
await page.click('.insp .tabs >> text=Animation'); await page.waitForTimeout(200);
const animText = await page.innerText(".insp");
await page.click('.insp .tabs >> text=Element'); await page.waitForTimeout(200);
check("inspector shows the element's own props + animation (Animation tab)", /Size/.test(inspText) && /Motion/.test(animText) && /Delay/.test(animText));

// ---- text edit through the inspector textarea
await page.fill("#insp-text", "Give Claude a thumb.|Ship faster.");
await page.waitForTimeout(300);
const headText = await page.evaluate(() => document.querySelector('[data-insyd-id="cta.headline"]').innerText.replace(/\s+/g, " ").trim());
check("text edit re-renders the headline", /Ship faster/.test(headText), headText);

// ---- color prop on a scene panel
await seek(560);
await page.evaluate(() => window.__insydStore.getState().setProp("search.panel.color", "#0EA5E9"));
await page.waitForTimeout(250);
await page.waitForFunction(() => !!document.querySelector('[data-insyd-id="search.panel"] > div'), null, { timeout: 15000 }).catch(() => {});
const panelBg = await page.evaluate(() => { const el = document.querySelector('[data-insyd-id="search.panel"] > div'); return el ? getComputedStyle(el).backgroundColor : "(not mounted)"; });
check("color prop repaints the blue panel", panelBg === "rgb(14, 165, 233)", panelBg);

// ---- brand token
await page.evaluate(() => window.__insydStore.getState().setProp("brand.paper", "#101418"));
await page.waitForTimeout(250);
const paperBg = await page.evaluate(() => { const shell = document.querySelector('[data-insyd-shell="search.panel"]'); const paper = shell.parentElement.firstElementChild; return getComputedStyle(paper).backgroundColor; });
check("brand token (paper) changes the scene background", paperBg === "rgb(16, 20, 24)", paperBg);
await page.evaluate(() => window.__insydStore.getState().resetProp("brand.paper"));

// ---- animation: delay change moves the entrance
await page.evaluate(() => window.__insydStore.getState().setProp("search.card.in", { delay: 40 }));
await seek(423 + 20); // 20 frames into the scene: with delay 40 the card must still be off to the left
const cardX = await page.evaluate(() => window.__insydRegistry.measureId("search.card")?.x);
check("animation delay override postpones the entrance", cardX < -500, `card x at +20f = ${Math.round(cardX)}`);
await page.evaluate(() => window.__insydStore.getState().resetProp("search.card.in"));
// animation via the timeline bar: select the card and drag its anim bar
await page.evaluate(() => window.__insydStore.getState().select({ type: "element", id: "search.card" }));
await page.waitForTimeout(400);
const bar = await page.$(".clip.on .anim");
check("timeline shows an entrance bar inside the clip", !!bar);
if (bar) { const bb = await bar.boundingBox(); await dragMouse(bb.x + 2, bb.y + 2, bb.x + 42, bb.y + 2); s = await S(); check("dragging the bar re-times the animation", (s.layout.props["search.card.in"]?.delay ?? 0) > 6, JSON.stringify(s.layout.props["search.card.in"])); }
await page.evaluate(() => window.__insydStore.getState().resetProp("search.card.in"));

// ---- element shift (clip drag) + scene trim
await page.evaluate(() => window.__insydStore.getState().select({ type: "element", id: "no.pill" })); await page.waitForTimeout(400);
let clip = await page.$(".clip.on"); let cb = await clip.boundingBox();
await dragMouse(cb.x + cb.width / 2, cb.y + cb.height / 2 - 4, cb.x + cb.width / 2 + 30, cb.y + cb.height / 2 - 4);
s = await S(); const pillDelay = s.layout.elements["no.pill"]?.delay ?? 0; check("dragging a clip shifts the element in time", pillDelay > 10, `delay=${pillDelay}`);
const edges = await page.$$(".sblock .edge"); const eb = await edges[1].boundingBox();
await dragMouse(eb.x + 4, eb.y + 12, eb.x - 20, eb.y + 12);
s = await S(); check("dragging a scene edge trims it", (s.layout.scenes.meet ?? 72) < 72, `meet=${s.layout.scenes.meet}`);

// ---- undo / redo
const before = JSON.stringify((await S()).layout);
await page.keyboard.press("Meta+z"); await page.waitForTimeout(100);
s = await S(); check("undo reverts the last change", s.layout.scenes.meet === undefined);
await page.keyboard.press("Meta+Shift+z"); await page.waitForTimeout(100);
s = await S(); check("redo re-applies it", JSON.stringify(s.layout) === before);

// ---- playback cost while editing overlays are live
await seek(0);
const cost = await page.evaluate(async () => {
  const p = window.__insydPlayer; const t0 = performance.now(); let n = 0; const on = () => n++;
  p.addEventListener("frameupdate", on); p.play(); await new Promise((r) => setTimeout(r, 3000)); p.pause(); p.removeEventListener("frameupdate", on);
  return { frames: n, ms: performance.now() - t0 };
});
check("playback runs (frames advance)", cost.frames > 20, `${cost.frames} frames in ${Math.round(cost.ms)}ms`);

// ---- save → source files
const pending = await page.evaluate(() => window.__insydStore.getState().pending());
const nPending = Object.values(pending).filter((v) => typeof v === "object").reduce((a, v) => a + Object.keys(v).length, 0);
const filesBefore = Object.fromEntries(["src/scenes/SceneCTA.tsx", "src/scenes/SceneSearch.tsx", "src/scenes/SceneNo.tsx", "src/Root.tsx"].map((f) => [f, fs.readFileSync(path.join(PROJECT, f), "utf8")]));
await page.keyboard.press("Meta+s");
await page.waitForFunction(() => document.body.innerText.includes("Saved"), null, { timeout: 30000 }).catch(() => {});
const toast = await page.innerText(".toast").catch(() => "");
check("save reports success", /Saved/.test(toast), toast);
await page.waitForTimeout(2500); // reload
await page.waitForFunction(() => window.__insydStore?.getState().def, null, { timeout: 60000 });
await page.waitForTimeout(1500);
const cta = fs.readFileSync(path.join(PROJECT, "src/scenes/SceneCTA.tsx"), "utf8");
check("SceneCTA.tsx: text literal rewritten", cta.includes('useCopy("cta.headline", "Give Claude a thumb.|Ship faster.")'));
check("SceneCTA.tsx: size literal rewritten", cta.includes('edit("cta.headline.size", 140,'));
check("SceneCTA.tsx: transform written as JSX attrs (x omitted when snapped back to 0)", /<Editable id="cta.headline"( x=\{[-\d.]+\})? y=\{[-\d.]+\} scale=\{[\d.]+\}/.test(cta));
const search = fs.readFileSync(path.join(PROJECT, "src/scenes/SceneSearch.tsx"), "utf8");
check("SceneSearch.tsx: color literal rewritten", search.includes('edit("search.panel.color", "#0EA5E9"'));
const no = fs.readFileSync(path.join(PROJECT, "src/scenes/SceneNo.tsx"), "utf8");
check("SceneNo.tsx: element shift written as delay attr", /<Editable id="no.pill" delay=\{\d+\}/.test(no));
const root = fs.readFileSync(path.join(PROJECT, "src/Root.tsx"), "utf8");
check("Root.tsx: scene duration rewritten", /id: "meet", label: "Meet the thumb", component: SceneMeet, duration: ([1-6]\d) \}/.test(root));
s = await S();
const dirty = await page.evaluate(() => window.__insydStore.getState().dirty());
check("after reload: nothing pending, code is the source of truth", !dirty, JSON.stringify(await page.evaluate(() => window.__insydStore.getState().pending())).slice(0, 120));
check("after reload: session restored (frame/selection)", s.selection?.type === "element" || s.selection?.type === "scene", JSON.stringify(s.selection));
await page.waitForFunction((d) => window.__insydStore.getState().codeDefaults["no.pill"]?.delay === d, pillDelay, { timeout: 30000 }).catch(() => {});
const eff = await page.evaluate(() => window.__insydStore.getState().transform("no.pill").delay);
check("after reload: saved code defaults are read back (no.pill delay)", eff === pillDelay, `delay=${eff} expected ${pillDelay}`);
await seek(1362);
await page.waitForFunction(() => !!document.querySelector('[data-insyd-id="cta.headline"] > div'), null, { timeout: 15000 }).catch(() => {});
const fs2 = await page.evaluate(() => { const el = document.querySelector('[data-insyd-id="cta.headline"] > div'); return el ? getComputedStyle(el).fontSize : "(not mounted)"; });
check("after reload: composition renders the saved values from code", fs2 === "140px", fs2);
check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
console.log(`\n${results.length - failed}/${results.length} passed`);
await finish(failed ? 1 : 0);
