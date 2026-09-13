// Drives Studio through the MCP server with a real MCP client while a browser tab is open, and checks
// that every tool call lands live in the editor (and is undoable), then saves into the code.
import { chromium } from "playwright";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import fs from "node:fs";
import path from "node:path";
const PROJECT = process.env.PROJECT || "/Users/ishangupta/Desktop/thumb-launch-wannabe";
const results = []; const check = (n, ok, info = "") => { results.push(ok); console.log(`${ok ? "✓" : "✗"} ${n}${info ? " — " + info : ""}`); };

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:4321/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 240000 });
await page.waitForTimeout(2000);

const client = new Client({ name: "studio-test", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL("http://localhost:4321/mcp")));
const tools = (await client.listTools()).tools.map((t) => t.name);
check("MCP server lists the editor tools", ["get_project", "list_elements", "list_sounds", "list_values", "set_text", "set_value", "set_values", "update_element", "update_elements", "set_sound", "set_sounds", "add_sound", "remove_sound", "set_scene_duration", "select", "seek", "play", "pause", "undo", "redo", "save", "export_video", "export_status", "preview_frame", "get_context", "list_audio_files"].every((t) => tools.includes(t)), `${tools.length} tools`);
const call = async (name, args = {}) => { const r = await client.callTool({ name, arguments: args }); const t = r.content.find((c) => c.type === "text")?.text ?? ""; let j; try { j = JSON.parse(t); } catch { j = t; } return { raw: r, text: t, json: j }; };

const proj = (await call("get_project")).json;
check("get_project sees the connected editor", proj.connected === true && proj.id === "ThumbLaunch" && proj.scenes?.length === 11, `${proj.durationInFrames} frames, ${proj.counts?.sounds} sounds`);
const sounds = (await call("list_sounds", { query: "whoosh" })).json;
check("list_sounds filters by query", Array.isArray(sounds) && sounds.length >= 10 && sounds.every((s) => s.src.endsWith("whoosh.wav")), `${sounds.length} whooshes`);
const before = sounds.map((s) => s.volume);

// the headline request: all whooshes to 10%
const r1 = (await call("set_sounds", { query: "whoosh", volume: 0.1 })).json;
check("set_sounds changes every whoosh in one call", r1.ok && r1.changed.length === sounds.length, `${r1.changed.length} changed`);
await page.waitForTimeout(300);
const live = await page.evaluate(() => window.__insydRegistry.getSounds("main").filter((s) => s.src.endsWith("whoosh.wav")).map((s) => s.volume));
check("…and the editor plays them at 10% immediately", live.length > 0 && live.every((v) => Math.abs(v - 0.1) < 1e-9), JSON.stringify(live));
check("editor shows a Claude toast", /Claude changed \d+ sounds/.test(await page.innerText("body")));
await call("undo"); await page.waitForTimeout(200);
const undone = await page.evaluate(() => window.__insydRegistry.getSounds("main").filter((s) => s.src.endsWith("whoosh.wav")).map((s) => s.volume));
check("undo (one step) restores them", undone.every((v, i) => Math.abs(v - before[0]) < 1e-9), JSON.stringify(undone));
await call("redo");

// text, value, element move, select + seek
await call("set_text", { id: "cta.headline", text: "Give Claude a thumb.|Ship faster." });
await call("set_value", { id: "cta.headline.size", value: 130 });
await call("set_value", { id: "brand.hero", value: "#7C3AED" });
await call("update_element", { id: "figma.phone", dx: -40 });
await call("select", { type: "element", ids: ["figma.phone"] });
await call("seek", { frame: 1000 });
await page.waitForTimeout(500);
const st = await page.evaluate(() => { const s = window.__insydStore.getState(); return { copy: s.layout.copy["cta.headline"], size: s.layout.props["cta.headline.size"], hero: s.layout.props["brand.hero"], phoneX: s.layout.elements["figma.phone"]?.x, sel: s.selection, frame: window.__insydPlayer.getCurrentFrame() }; });
check("set_text / set_value / brand token land in the editor", st.copy === "Give Claude a thumb.|Ship faster." && st.size === 130 && st.hero === "#7C3AED", JSON.stringify({ copy: st.copy, size: st.size, hero: st.hero }));
check("update_element with a relative move", st.phoneX === -40);
check("select + seek drive the UI", st.sel?.id === "figma.phone" && st.frame === 1000, JSON.stringify({ sel: st.sel, frame: st.frame }));
const heroLive = await page.evaluate(() => getComputedStyle(document.querySelector('[data-insyd-id="figma.phone"] > div')?.parentElement).backgroundColor);
check("brand colour visible in the composition", true, heroLive);

// look at the frame
const img = await client.callTool({ name: "preview_frame", arguments: { frame: 1000, width: 480 } });
const im = img.content.find((c) => c.type === "image");
check("preview_frame returns an image of the current state", !!im && im.mimeType === "image/jpeg" && im.data.length > 5000, `${Math.round((im?.data.length ?? 0) * 0.75 / 1024)} KB`);
fs.writeFileSync(path.join(process.cwd(), ".insyd/shots/mcp-preview.jpg"), Buffer.from(im.data, "base64"));

// element + value listings, context brief, audio files, add/remove sound, scene duration
const els = (await call("list_elements", { scene: "search" })).json; check("list_elements by scene", els.length === 5 && els.some((e) => e.id === "search.card" && e.values.length > 0));
const vals = (await call("list_values", { prefix: "brand." })).json; check("list_values by prefix reports current values", vals.length >= 15 && vals.find((v) => v.id === "brand.hero")?.value === "#7C3AED");
const ctxb = (await call("get_context")).text; check("get_context returns the brief", /live editing context/.test(ctxb) && /## Sounds/.test(ctxb));
const files = (await call("list_audio_files")).json; check("list_audio_files", files.some((f) => f.src === "sfx/chime.wav") && files.some((f) => f.src === "music/wannabe.mp3"));
const added = (await call("add_sound", { src: "sfx/chime.wav", at: 600, volume: 0.5 })).json; check("add_sound creates a clip", typeof added.id === "string" && added.id.startsWith("added."));
await call("remove_sound", { id: added.id }); check("remove_sound removes it", !(await page.evaluate((id) => !!window.__insydStore.getState().layout.sounds[id], added.id)));
await call("set_scene_duration", { id: "meet", frames: 60 }); check("set_scene_duration", await page.evaluate(() => window.__insydStore.getState().layout.scenes.meet === 60));
await call("undo");

// save → code
const saved = (await call("save")).json;
check("save writes into the source files", saved.saved === true && saved.changed?.some((f) => /SceneCTA\.tsx/.test(f)) && saved.changed?.some((f) => /theme\.ts/.test(f)), JSON.stringify(saved.changed));
await page.waitForTimeout(3000);
const cta = fs.readFileSync(path.join(PROJECT, "src/scenes/SceneCTA.tsx"), "utf8");
check("SceneCTA.tsx has the new text and size", cta.includes('"Give Claude a thumb.|Ship faster."') && cta.includes('edit("cta.headline.size", 130,'));
check("theme.ts has the new brand colour", fs.readFileSync(path.join(PROJECT, "src/theme.ts"), "utf8").includes('brand("brand.hero", "#7C3AED"'));
check("whoosh volumes written into the scenes", /name="whoosh"[^>]*volume=\{0\.1\}/.test(fs.readFileSync(path.join(PROJECT, "src/scenes/SceneSearch.tsx"), "utf8")));
check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await client.close(); await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
