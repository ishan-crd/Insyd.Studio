#!/usr/bin/env node
// Usage: node scripts/init-project.mjs /path/to/remotion-project
// Vendors the Insyd Studio SDK into the project and scaffolds src/editor.ts + layout.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.resolve(process.argv[2] ?? ".");
if (!fs.existsSync(path.join(dir, "package.json"))) { console.error("Not a project folder:", dir); process.exit(1); }
fs.mkdirSync(path.join(dir, "src/insyd"), { recursive: true });
fs.copyFileSync(path.join(ROOT, "sdk/index.tsx"), path.join(dir, "src/insyd/index.tsx"));
if (!fs.existsSync(path.join(dir, "layout.json"))) fs.writeFileSync(path.join(dir, "layout.json"), JSON.stringify({ version: 1, elements: {}, copy: {}, scenes: {} }, null, 2) + "\n");
const entry = ["src/editor.tsx", "src/editor.ts"].map((f) => path.join(dir, f)).find((f) => fs.existsSync(f));
if (!entry) fs.copyFileSync(path.join(ROOT, "sdk/editor.template.ts"), path.join(dir, "src/editor.ts"));
console.log(`Insyd Studio SDK installed into ${dir}
  src/insyd/index.tsx   (SDK — update by re-running this script)
  layout.json             (the editor saves here)
  src/editor.ts           (${entry ? "kept" : "scaffolded — fill in the TODOs"})
Next: wrap elements in <Editable id="…">, read copy with useCopy(), scene lengths with useSceneDuration(), then open the folder in Studio by Insyd.`);
