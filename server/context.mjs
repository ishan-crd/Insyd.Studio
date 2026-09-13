// Builds the live-editing brief handed to Claude Code, from the code index (server) plus the
// editor's scan and current layout (client). Written into <project>/CLAUDE.md between markers.
import fs from "node:fs";
import path from "node:path";

const START = "<!-- insyd-studio:start -->", END = "<!-- insyd-studio:end -->";
const rel = (dir, f) => (f ? path.relative(dir, f) : "");
const fmtVal = (v) => (typeof v === "string" ? JSON.stringify(v) : typeof v === "object" ? JSON.stringify(v) : String(v));

export const buildBrief = ({ dir, def, scan, layout, index, port }) => {
  const fps = def.fps;
  const tc = (f) => `${(f / fps).toFixed(2)}s`;
  const loc = (k) => index.byLocator.get(k);
  let at = 0;
  const scenes = def.scenes.map((s) => { const d = layout.scenes?.[s.id] ?? s.durationInFrames; const row = { ...s, from: at, duration: d }; at += d; return row; });
  const total = at;
  const els = (scan?.elements ?? []).map((e) => {
    const l = loc(`jsx:${e.id}`);
    const o = layout.elements?.[e.id];
    return `| \`${e.id}\` | ${e.label} | ${e.kind} | ${e.sceneId} | ${e.first}–${e.last} | ${l ? rel(dir, l.file) : o?.cloneOf ? `layout.json (linked copy of ${o.cloneOf})` : "layout.json"} |`;
  });
  const sounds = (scan?.sounds ?? []).map((s) => {
    const l = loc(`sound:${s.id}`);
    const o = layout.sounds?.[s.id] ?? {};
    const start = s.natural + (o.shift ?? s.defaults.shift ?? 0);
    const vol = o.volume ?? s.defaults.volume;
    const src = o.src ?? s.defaults.src;
    return `| \`${s.id}\` | ${s.label} | ${src} | f${start} (${tc(start)}) | ${Math.round(vol * 100)}% | ${(o.muted ?? s.defaults.muted) ? "muted" : ""} | ${l ? rel(dir, l.file) : "layout.json"} |`;
  });
  const added = Object.entries(layout.sounds ?? {}).filter(([, o]) => o.added).map(([id, o]) => `| \`${id}\` | ${o.label ?? ""} | ${o.src} | f${o.at} (${tc(o.at ?? 0)}) | ${Math.round((o.volume ?? 0.8) * 100)}% | ${o.muted ? "muted" : ""} | layout.json |`);
  const props = (scan?.props ?? []).map((p) => {
    const l = loc(`call:${p.id}`);
    const cur = layout.props?.[p.id];
    return `| \`${p.id}\` | ${p.kind} | ${fmtVal(cur !== undefined ? cur : p.value)}${cur !== undefined ? " (override in layout.json)" : ""} | ${l ? rel(dir, l.file) : "—"} |`;
  });
  const copy = (scan?.copy ?? []).map((c) => { const l = loc(`call:${c.id}`); return `| \`${c.id}\` | ${fmtVal(layout.copy?.[c.id] ?? c.value)} | ${l ? rel(dir, l.file) : "—"} |`; });
  const hasMusic = fs.existsSync(path.join(dir, "src/music.ts"));

  return `${START}
# Studio by Insyd — live editing context (auto-generated, do not edit by hand)

This Remotion project is open in **Studio by Insyd** at http://localhost:${port}. A person is watching the
editor while you work. **Every file you save under \`src/\` or \`public/\` reloads the preview within a
second**, so make changes directly in the source and they appear immediately. Do not start dev servers
or renders unless asked, and do not commit — the person reviews in the editor first.

Composition \`${def.id}\` · ${def.width}×${def.height} @ ${fps} fps · ${total} frames (${tc(total)}) · project root: \`${dir}\`

## Preferred: the insyd-studio MCP tools
If the \`insyd-studio\` MCP server is available (it is when Studio launched you, or after \`claude mcp add --transport http insyd-studio http://localhost:${port}/mcp\`), **use its tools instead of editing files**: \`get_project\`, \`list_elements\`, \`list_sounds\`, \`list_values\`, \`set_text\`, \`set_value(s)\`, \`update_element(s)\`, \`set_sound(s)\` (bulk by query, e.g. all whooshes), \`add_sound\`, \`set_scene_duration\`, \`select\`/\`seek\`/\`play\`, \`undo\`, \`preview_frame\` (see the picture), \`save\` (write into the code), \`export_video\`. Every tool call applies live in the editor and is one undo step for the person. Edit source files directly only for structural changes the tools cannot express (new elements, new animation logic).

## How the template is wired (the editing contract)
Every editable value is a **literal in the code**, addressed by a string id. Change the literal; nothing else.
- **Text** → \`useCopy("id", "text")\` — \`|\` is a line break where the template supports it.
- **Numbers / colours / toggles / enums** → \`edit("id", literal, { label, min, max, … })\`.
- **Brand tokens** (palette, fonts, backgrounds) → \`brand("brand.…", literal)\` in \`src/theme.ts\`; used across every scene.
- **Entrance animations** → \`useAnim("id", { delay, preset, from: { x, y, scale, opacity, rotate, blur } })\` (presets: snappy, smooth, bouncy, pixel, heavy, gentle; or \`preset: "custom"\` with damping/stiffness/mass, or \`"bezier"\` with duration/easing). \`useAnimSpec\` is the same with \`stagger\` for word-by-word text.
- **Elements** → \`<Editable id="…" x y scale rotate opacity hidden delay trimIn trimOut locked>\` wrap what people can move; the attributes are the saved transform (delay shifts the element in frames; trimIn/trimOut is a visibility window in the element's own frames).
- **Sounds** → \`<Sound id src at volume muted shift trimStart duration>\`. In this project \`<Sfx id name="whoosh" at volume lead>\` and \`<KeyTicks>\` are thin wrappers: \`name\` maps to \`public/sfx/<name>.wav\`; \`src="…"\` overrides the file; \`at\` may be an expression (use \`shift={n}\` to move it n frames).
- **Scenes** → the \`SCENES\` table in \`src/Root.tsx\` (\`duration\` in frames). ${hasMusic ? "This cut is synced to music: see `src/music.ts` (beat/bar grid) and keep scene starts and key hits on beats." : ""}
- **\`layout.json\`** holds overrides that have no code literal (sounds added in the editor, linked copies, values from \`.map()\` loops). The composition reads it as default props. **Overrides in layout.json win over code for the same id** — if an id you are changing appears there, update or remove it there too.
- Assets live in \`public/\` (\`staticFile\`). New audio goes in \`public/sfx/\` or \`public/music/\`.

Typical requests → edits:
- "Reduce the volume of all whoosh clips to 10%" → every \`<Sfx … name="whoosh" … volume={…}>\` in \`src/scenes/*.tsx\` gets \`volume={0.1}\` (and any \`layout.json\` sounds entry for those ids).
- "Make the headline bigger" → the \`edit("<scene>.headline.size", 104, …)\` literal.
- "Move the phone 40px left" → \`x={-40}\` on that \`<Editable id="…phone">\`.
- "Make the mascot bounce in later" → \`delay\` in its \`useAnimSpec("….mascot.in", …)\`.
- "Change the brand colour to purple" → \`brand("brand.hero", "#…")\` in \`src/theme.ts\`.

## Scenes
| id | label | starts | frames |
|---|---|---|---|
${scenes.map((s) => `| \`${s.id}\` | ${s.label} | f${s.from} (${tc(s.from)}) | ${s.duration} |`).join("\n")}

## Elements
| id | label | kind | scene | on screen (frames) | where |
|---|---|---|---|---|---|
${els.join("\n") || "| — | | | | | |"}

## Sounds
| id | label | file | starts | volume | | where |
|---|---|---|---|---|---|---|
${[...sounds, ...added].join("\n") || "| — | | | | | | |"}

## Text
| id | current | where |
|---|---|---|
${copy.join("\n") || "| — | | |"}

## Editable values (edit / brand / animations)
| id | kind | current | where |
|---|---|---|---|
${props.join("\n") || "| — | | | |"}
${END}`;
};

/** Write/replace the Studio section in <dir>/CLAUDE.md. */
export const writeClaudeMd = (dir, brief) => {
  const file = path.join(dir, "CLAUDE.md");
  let existing = "";
  try { existing = fs.readFileSync(file, "utf8"); } catch {}
  let out;
  if (existing.includes(START) && existing.includes(END)) {
    out = existing.slice(0, existing.indexOf(START)) + brief + existing.slice(existing.indexOf(END) + END.length);
  } else {
    out = existing ? existing.trimEnd() + "\n\n" + brief + "\n" : brief + "\n";
  }
  fs.writeFileSync(file, out);
  return file;
};
