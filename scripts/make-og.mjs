// The share card (public/og.png, 1200×630) and the touch icon (public/apple-touch-icon.png), rendered
// from the templates' posters:   node scripts/make-og.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const order = (s) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, "templates", s, ".studio", "manifest.json"), "utf8")).order ?? 99; } catch { return 99; } };
const posters = fs.readdirSync(path.join(ROOT, "templates")).sort((a, b) => order(a) - order(b)).map((s) => path.join(ROOT, "templates", s, ".studio", "poster.jpg")).filter((f) => fs.existsSync(f))
  .map((f) => `data:image/jpeg;base64,${fs.readFileSync(f).toString("base64")}`);
const html = `<html><head><link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&display=swap" rel="stylesheet"><style>
*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;background:#ECEBE7;font-family:Inter,system-ui;color:#0A0A0A;padding:64px 72px;position:relative;overflow:hidden}
.dots{position:absolute;inset:0;background:radial-gradient(circle at 1px 1px,rgba(10,10,10,.12) 1px,transparent 1.4px) 0 0/22px 22px}
.glow{position:absolute;right:-120px;top:-120px;width:620px;height:520px;background:radial-gradient(closest-side,rgba(225,75,255,.22),transparent)}
.w{position:relative;display:flex;align-items:baseline;gap:8px}.w b{font-size:26px;font-weight:600;letter-spacing:-.01em}.w span{font-size:20px;color:#706F6A}
h1{position:relative;margin-top:30px;font-size:66px;line-height:1.02;font-weight:700;letter-spacing:-.045em;max-width:620px}
.row{position:absolute;left:72px;right:72px;bottom:56px;display:flex;gap:18px}
.row img{flex:1;min-width:0;aspect-ratio:16/9;object-fit:cover;border-radius:14px;box-shadow:0 20px 40px -22px rgba(0,0,0,.5),0 0 0 1px rgba(0,0,0,.06)}
.url{position:absolute;right:72px;top:70px;font-size:20px;color:#706F6A}</style></head><body><div class="dots"></div><div class="glow"></div>
<div class="w"><b>Studio</b><span>by Insyd</span></div><div class="url">studio.insyd.in</div><h1>Launch videos, ready to make yours.</h1>
<div class="row">${posters.map((p) => `<img src="${p}">`).join("")}</div></body></html>`;
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(html, { waitUntil: "networkidle" });
await p.screenshot({ path: path.join(ROOT, "public", "og.png") });
await p.setViewportSize({ width: 180, height: 180 });
await p.setContent(`<body style="margin:0;background:#0A0A0A;display:grid;place-items:center;width:180px;height:180px">${fs.readFileSync(path.join(ROOT, "public", "favicon.svg"), "utf8").replace("<svg ", '<svg width="180" height="180" ')}</body>`);
await p.screenshot({ path: path.join(ROOT, "public", "apple-touch-icon.png") });
await b.close();
console.log("public/og.png, public/apple-touch-icon.png");
