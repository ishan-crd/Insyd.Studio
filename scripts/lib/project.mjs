// Suites that press Save write into the test project's source. Snapshot src/ + layout.json on start
// and put every byte back when the process exits, so runs are repeatable and never leave test
// artefacts (durations, locks, added sounds) behind in the project.
import fs from "node:fs";
import path from "node:path";

// The project Studio currently has open (what the browser is editing) unless PROJECT overrides it.
const openProject = () => { try { return JSON.parse(fs.readFileSync(new URL("../../.insyd/project.json", import.meta.url), "utf8")).path; } catch { return null; } };
export const PROJECT = process.env.PROJECT || openProject() || "/Users/ishangupta/Desktop/thumb-mcp-video";

const walk = (dir, out = []) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out); else out.push(p); } return out; };

export const snapshotProject = (dir = PROJECT) => {
  const files = [...walk(path.join(dir, "src")), path.join(dir, "layout.json")].filter((f) => fs.existsSync(f));
  const before = new Map(files.map((f) => [f, fs.readFileSync(f)]));
  const restore = () => {
    for (const [f, buf] of before) { if (!fs.existsSync(f) || !fs.readFileSync(f).equals(buf)) fs.writeFileSync(f, buf); }
    for (const f of walk(path.join(dir, "src"))) if (!before.has(f)) fs.unlinkSync(f); // files a save created
  };
  process.on("exit", restore);
  return restore;
};

/** End a suite: give the server a moment to finish any save it is still writing, restore, exit. */
export const finish = async (code) => { await new Promise((r) => setTimeout(r, 1500)); process.exit(code); };
