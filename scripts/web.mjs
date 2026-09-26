// The hosted site (static build + the marketplace MCP), in a browser:
//   node scripts/web.mjs                       → npm run preview:web (http://localhost:4400)
//   node scripts/web.mjs https://studio.insyd.in
import { chromium } from "playwright";
const B = (process.argv[2] || "http://localhost:4400").replace(/\/$/, "");
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; p.on("pageerror", (e) => errors.push(e.message)); p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
let pass = 0, fail = 0;
const check = (c, m, d = "") => { if (c) pass++; else { fail++; console.log("  ✗", m, d); } };
const head = async (r) => { const x = await fetch(B + r); return { s: x.status, t: x.headers.get("content-type") ?? "" }; };
const { templates } = await fetch(B + "/api/templates").then((r) => r.json());
check(templates.length >= 3, `catalogue: ${templates.length} templates`);
for (const [r, type] of [["/", "text/html"], ["/studio", "text/html"], ["/favicon.svg", "image/svg"], ["/og.png", "image/png"], ["/apple-touch-icon.png", "image/png"], ["/robots.txt", "text/plain"], ["/sitemap.xml", "xml"]]) {
  const h = await head(r); check(h.s === 200 && h.t.includes(type), `GET ${r} → ${h.s} ${h.t}`);
}
for (const t of templates) {
  const page = await head(`/templates/${t.slug}`), dl = await head(t.download.url), pv = await head(t.preview), po = await head(t.poster);
  check(page.s === 200 && dl.s === 200 && dl.t.includes("zip") && pv.t.includes("video/mp4") && po.t.includes("image"), `${t.slug}: page, zip, preview, poster`);
}
check((await head("/api/templates/nope")).s === 404, "unknown template → 404");
await p.goto(B + "/", { waitUntil: "load" }); await p.waitForSelector(".mk-card[data-slug]");
check(await p.locator(".mk-card[data-slug]").count() === templates.length, "a card per template");
const og = await p.evaluate(() => ({ img: document.querySelector('meta[property="og:image"]')?.content, card: document.querySelector('meta[name="twitter:card"]')?.content, icon: document.querySelector('link[rel="icon"]')?.href }));
check(og.img?.endsWith("/og.png") && og.card === "summary_large_image" && og.icon?.endsWith("/favicon.svg"), "share + icon tags", JSON.stringify(og));
const slug = templates[1].slug, card = `.mk-card[data-slug="${slug}"]`;
await p.hover(`${card} .mk-media`); await p.waitForTimeout(2500);
check(await p.evaluate((c) => { const v = document.querySelector(`${c} video`); return !!v && !v.paused && v.currentTime > 0.2; }, card), "hover plays the preview in the card");
await p.click(`${card} .mk-media-actions .mk-btn.primary`); await p.waitForSelector(".mk-use");
check(await p.locator(`.mk-use a[href="/downloads/${slug}.zip"]`).count() === 1, "Use this template → download sheet");
await p.click(".mk-modal-bg", { position: { x: 5, y: 5 } });
await p.goto(B + `/templates/${slug}`, { waitUntil: "load" }); await p.waitForSelector(".mk-scene");
check(await p.locator(".mk-scene").count() === templates[1].scenes.length, "template page via deep link");
await p.goto(B + "/studio", { waitUntil: "load" }); await p.waitForSelector(".mk-get");
check(await p.evaluate(() => performance.getEntriesByType("resource").every((e) => !e.name.includes("/assets/App-"))), "/studio is Get Studio; the editor isn't loaded on the web");
await p.setViewportSize({ width: 390, height: 844 }); await p.goto(B + "/", { waitUntil: "load" }); await p.waitForSelector(".mk-card[data-slug]");
check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.getElementById("mk-scroll").scrollWidth <= innerWidth + 1), "phone width: no sideways scroll");
check(errors.length === 0, "no page errors", errors.slice(0, 2).join(" | "));
console.log(`${pass}/${pass + fail} passed (${B})`);
await browser.close();
process.exit(fail ? 1 : 0);
