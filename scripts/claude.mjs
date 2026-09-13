// "Open in Claude Code": context brief + CLAUDE.md, and live reload of external code edits (what Claude does).
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
const PROJECT = process.env.PROJECT || "/Users/ishangupta/Desktop/thumb-launch-wannabe";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const results = []; const check = (n, ok, info = "") => { results.push(ok); console.log(`${ok ? "✓" : "✗"} ${n}${info ? " — " + info : ""}`); };
await page.goto("http://localhost:4321/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 240000 });
await page.waitForTimeout(2000);
check("top bar has the Open in Claude Code button", await page.locator('button:has-text("Open in Claude Code")').count() === 1);

// --- Copy context → CLAUDE.md written with the inventory
await page.locator('.split .btn[title^="Copy the same context"]').click();
await page.waitForFunction(() => /Context copied/.test(document.body.innerText), null, { timeout: 15000 }).catch(() => {});
const md = fs.readFileSync(path.join(PROJECT, "CLAUDE.md"), "utf8");
check("CLAUDE.md written with the Studio section", md.includes("insyd-studio:start") && /Studio by Insyd — live editing context/.test(md));
check("brief lists scenes, elements, sounds and editable values", /## Scenes[\s\S]*`search`[\s\S]*## Elements[\s\S]*`search.card`[\s\S]*## Sounds[\s\S]*whoosh[\s\S]*## Editable values[\s\S]*`brand.hero`/.test(md));
check("brief points at files", /src\/scenes\/SceneSearch\.tsx/.test(md) && /src\/theme\.ts/.test(md));
check("brief explains the contract + live reload", /Every file you save under/.test(md) && /useCopy/.test(md) && /layout.json win over code/.test(md));
const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
check("same brief copied to the clipboard", clip.includes("insyd-studio:start"), `${(clip.length / 1024).toFixed(0)} KB`);
// regenerating replaces the section (no duplication) and preserves other content
fs.writeFileSync(path.join(PROJECT, "CLAUDE.md"), "# My notes\nkeep me\n\n" + md);
await page.locator('.split .btn[title^="Copy the same context"]').click(); await page.waitForTimeout(1500);
const md2 = fs.readFileSync(path.join(PROJECT, "CLAUDE.md"), "utf8");
check("regeneration replaces the section in place and keeps other content", md2.startsWith("# My notes\nkeep me") && (md2.match(/insyd-studio:start/g) || []).length === 1);

// --- Live reload: edit code the way Claude would ("all whooshes to 10%") while the page is open
await page.evaluate(() => { window.__insydPlayer.seekTo(470); window.__insydStore.getState().select({ type: "element", id: "search.card" }); });
await page.waitForTimeout(400);
const before = await page.evaluate(() => window.__insydRegistry.getSounds("main").filter((s) => s.src.endsWith("whoosh.wav")).map((s) => s.volume));
check("whooshes currently louder than 10%", before.length > 0 && before.every((v) => v > 0.1), JSON.stringify(before));
const file = path.join(PROJECT, "src/scenes/SceneSearch.tsx");
const src = fs.readFileSync(file, "utf8");
fs.writeFileSync(file, src.replace(/(<Sfx[^>]*name="whoosh"[^>]*volume=)\{[0-9.]+\}/g, "$1{0.1}"));
await page.waitForFunction(() => { const s = window.__insydRegistry?.getSounds?.("main"); return s && s.length && s.filter((x) => x.src.endsWith("whoosh.wav")).every((x) => Math.abs(x.volume - 0.1) < 1e-9); }, null, { timeout: 30000 }).catch(() => {});
const after = await page.evaluate(() => window.__insydRegistry.getSounds("main").filter((s) => s.src.endsWith("whoosh.wav")).map((s) => s.volume));
check("saving the file updates the running preview (whooshes now 10%)", after.length > 0 && after.every((v) => Math.abs(v - 0.1) < 1e-9), JSON.stringify(after));
await page.waitForFunction(() => window.__insydStore?.getState().def, null, { timeout: 30000 });
await page.waitForTimeout(800);
const st = await page.evaluate(() => ({ frame: window.__insydPlayer.getCurrentFrame(), sel: window.__insydStore.getState().selection }));
check("playhead and selection survive the reload", st.frame === 470 && st.sel?.id === "search.card", JSON.stringify(st));

// --- Adding a new sound in code → the scan notices the inventory change and re-runs
const src2 = fs.readFileSync(file, "utf8");
fs.writeFileSync(file, src2.replace('<Sfx id="search.sfx2"', '<Sfx id="search.sfxNew" name="chime" at={T.reply + 8} volume={0.4} />\n      <Sfx id="search.sfx2"'));
await page.waitForFunction(() => window.__insydStore?.getState().scan.sounds.some((s) => s.id === "search.sfxNew"), null, { timeout: 120000 }).catch(() => {});
check("a sound added in code appears in the timeline after an automatic rescan", await page.evaluate(() => window.__insydStore.getState().scan.sounds.some((s) => s.id === "search.sfxNew")));
check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
