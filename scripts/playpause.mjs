import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, headless: !process.env.HEADED });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
await page.goto("http://localhost:4321/studio", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__insydStore?.getState().scan.status === "done", null, { timeout: 180000 });
await page.waitForTimeout(500);
const state = () => page.evaluate(() => ({ frame: window.__insydPlayer.getCurrentFrame(), playing: window.__insydPlayer.isPlaying(), ui: window.__insydPlayback ? window.__insydPlayback.getState() : null, icon: document.querySelector(".transport .btn.icon:nth-child(3) svg path")?.getAttribute("d")?.slice(0, 6) }));
const wait = (ms) => page.waitForTimeout(ms);
const results = []; const check = (n, ok, info = "") => { results.push(ok); console.log(`${ok ? "✓" : "✗"} ${n}${info ? " — " + info : ""}`); };

// 1) click Play button
const playBtn = page.locator(".transport .btn.icon").nth(2);
await playBtn.click(); await wait(1500);
let a = await state(); check("Play button starts playback", a.playing && a.frame > 10, JSON.stringify(a));
// 2) click again → pause, frame stops
await playBtn.click(); await wait(300); let b = await state(); await wait(700); let c = await state();
check("Play button again pauses", !b.playing && b.frame === c.frame, `f${b.frame}→f${c.frame}`);
// 3) Space right after clicking the button (button still focused)
await page.keyboard.press("Space"); await wait(1000); a = await state();
check("Space after clicking the button resumes (no double toggle)", a.playing && a.frame > c.frame, JSON.stringify(a));
await page.keyboard.press("Space"); await wait(300); b = await state(); await wait(600); c = await state();
check("Space pauses", !b.playing && b.frame === c.frame, `f${b.frame}`);
// 4) Space with focus on body
await page.mouse.click(1400, 600); await wait(200); // click inspector area (no input)
await page.keyboard.press("Space"); await wait(800); a = await state();
check("Space with body focus plays", a.playing, JSON.stringify(a));
await page.keyboard.press("Space"); await wait(200);
// 5) Space while typing in an input must NOT toggle
await page.evaluate(() => window.__insydStore.getState().select({ type: "element", id: "cta.headline" })); await wait(400);
await page.focus("#insp-text"); await page.keyboard.press("Space"); await wait(300); a = await state();
check("Space inside a text field does not toggle playback", !a.playing);
await page.keyboard.press("Escape"); await page.mouse.click(1400, 600);
// 6) play through a scene boundary and audio-heavy scene without stalling
await page.evaluate(() => window.__insydPlayer.seekTo(400)); await wait(300);
await playBtn.click(); await wait(3000); a = await state();
check("Plays across a scene cut without stalling", a.playing && a.frame > 470, `f${a.frame}`);
await playBtn.click(); await wait(200);
// 7) end of video: play from near the end, should stop at the end; play again restarts
await page.evaluate(() => window.__insydPlayer.seekTo(window.__insydStore.getState().duration() - 20)); await wait(300);
await playBtn.click(); await wait(1500); a = await state();
check("Stops at the end (Remotion rewinds to 0 when it ends)", !a.playing && (a.frame >= (await page.evaluate(() => window.__insydStore.getState().duration())) - 10 || a.frame === 0), JSON.stringify(a));
await playBtn.click(); await wait(1000); b = await state();
check("Play at the end restarts from the beginning", b.playing && b.frame < 100 && b.frame > 0, JSON.stringify(b));
await playBtn.click();
// 8) UI icon reflects state
const icon = await page.evaluate(() => document.querySelectorAll(".transport .btn.icon")[2].innerHTML.includes("M7 4.5v15l12-7.5z"));
check("Transport shows the Play icon when paused", icon);
// 9) timecode updates while playing
const t0 = await page.innerText(".transport .tc"); await playBtn.click(); await wait(1000); const t1 = await page.innerText(".transport .tc"); await playBtn.click();
check("Timecode updates while playing", t0 !== t1, `${t0.split("\n")[0]} → ${t1.split("\n")[0]}`);
check("no page/console errors", errors.length === 0, errors.slice(0, 3).join(" | "));
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
