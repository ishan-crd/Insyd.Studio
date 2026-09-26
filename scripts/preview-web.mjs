// Serve dist/ the way Vercel will (vercel.json rewrites), to check the static build locally:
//   npm run build && npm run preview:web   →  http://localhost:4400
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
const app = express();
app.use((req, _res, next) => {
  for (const r of cfg.rewrites) {
    const keys = [];
    const re = new RegExp("^" + r.source.replace(/:(\w+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "$");
    const m = req.path.match(re);
    if (m) { let dest = r.destination; keys.forEach((k, i) => (dest = dest.replace(`:${k}`, m[i + 1]))); req.url = dest; break; }
  }
  next();
});
app.use(express.static(DIST));
const port = Number(process.env.PORT || 4400);
app.listen(port, () => console.log(`dist/ as on Vercel → http://localhost:${port}`));
