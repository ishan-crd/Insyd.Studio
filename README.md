<h1 align="center">Studio</h1>
<p align="center"><sub><b>BY INSYD</b></sub></p>

# Studio by Insyd

An iMovie-style editor for **Remotion** projects. Open a Remotion project folder, see every scene and
every element on a timeline, edit text, colours, sizes, backgrounds, positions and animations by hand,
and export an MP4. **Save writes your changes back into the project's source files** — the code stays
the single source of truth, so the same edits show up in Remotion Studio and `npx remotion render`.

```
npm install
npm run dev        # → http://localhost:4321 (opens automatically)
```

Then **Browse…** to a project folder (or paste its path) and **Open project**.

## What you can edit

| Where | What |
|---|---|
| **Preview** | Click any element to select it (innermost wins). Drag to move; corner handles scale; `⇧`-drag constrains; elements snap to the centre lines. `⇧`/`⌘`-click adds elements to the selection; dragging, arrow-nudging and `⌫` then act on the whole group. Double-click text to jump to its text box. |
| **Inspector → Text** | The element's copy (`useCopy`). `\|` = line break where the template supports it. |
| **Inspector → Transform / Timing** | X / Y, scale, rotation, opacity, visibility, and *Shift* (frames earlier/later). |
| **Inspector → Properties** | Every `edit()` value the template declares for that element: sizes with sliders, colours with a picker, toggles, enums. |
| **Clips (elements & sounds)** | Right-click any clip in the timeline or any element on the canvas: **Cut / Copy / Paste at playhead** (relative offsets kept), **Duplicate**, **Split at playhead**, **Hide / Mute**, **Lock**, **Delete** — also `⌘X/C/V/D/K/L`, `H`, `M`, `⌫`. Drag a clip's edges to trim. Elements are code, so copies are **linked instances** that render the original's content with their own position/timing (stored in `layout.json`, kept inside the source's scene); deleting a code-declared element hides it. Split works through a visibility window (`trimIn`/`trimOut`) written back to the `<Editable>`. |
| **Inspector (multi-selection)** | With several items selected, only the fields they all share are shown — volume / mute / move / replace-file for sounds; move / scale / rotation / opacity / visibility / shift plus any property they all declare (e.g. *Size* across headlines) for elements. Values that differ are marked *Mixed*; every change applies to all of them as one undo step. |
| **Inspector → Animation** | Every `useAnim()` entrance: delay, motion (spring presets / custom physics / bezier), and the *from* values (x, y, scale, opacity, rotation, blur), with a live curve preview. |
| **Scene** (click a scene block or "Scene settings") | Duration, plus scene-level properties such as panel colours and wipe lengths. |
| **Brand** tab | Global tokens declared with `brand()`: palette, backgrounds, fonts. Change one and every scene follows. |
| **Audio** (bottom of the timeline) | Every `<Sound>` as a clip with its waveform: sound effects packed into lanes above the **Music** lane. Drag a clip to re-time it (`⇧`-click to move several together), click it to edit **volume**, **mute**, **start**, or **Replace…** the file with any audio in `public/` or an upload. **+ Sound** drops a new file at the playhead. Right-click any sound clip (or use `⌘C/⌘X/⌘V/⌘D/⌘K/⌘L`, `M`, `⌫`) to copy, cut, paste at the playhead (relative offsets kept), duplicate, split at the playhead, mute, lock or delete; drag a clip's edges to trim it. Saved as `shift` / `volume` / `muted` / `src` props on the `<Sound>` in code; added sounds live in `layout.json` and play everywhere via `<LayoutSounds/>`. |
| **Timeline** | *Scenes* track pinned under the ruler: drag a scene's right edge to trim it. One clip per element: drag to shift it in time; drag the bright bar inside a clip to re-time that element's entrance. **`⇧`-click clips to select several (`⌘`-click toggles), or drag a selection box on empty track space like on the desktop (`⇧` adds), then drag any of them to slide the whole group.** Ruler scrubs; zoom; resizable. |

`⌘S` **saves into the source**: literals are rewritten in place (`edit("id", 108)` → `edit("id", 140)`,
`useCopy(...)` text, `brand(...)` tokens, `useAnim(...)` specs, `<Editable x={…} y={…}>` attributes, scene
`duration:` numbers), the editor reloads, and the composition now renders those values from code with
nothing pending. Anything without a literal in the code is kept in `layout.json` (marked *json* in the
Inspector). Unsaved edits survive reloads (restored as a draft) and `⌘Z` / `⇧⌘Z` undo/redo everything.
**Export** renders exactly what you see to your Desktop with progress, then *Reveal in Finder*.
`?` (key or top-bar button) opens the full shortcuts reference; `⌘A` selects every element (or every sound when a sound is selected); `⌘+` / `⌘−` / `⌘0` zoom the timeline; the lock icon on a scene header or on the Sound effects / Music lane locks everything on that track.

## Making a Remotion project editable

Insyd Studio edits what a project *declares*. The contract is one file copied into the project
(`src/insyd/index.tsx`) plus a few conventions:

```bash
node scripts/init-project.mjs /path/to/project   # or "Install SDK into project" in the Open dialog
```

```tsx
import { Editable, edit, brand, useCopy, useAnim, useAnimSpec, sceneDuration } from "./insyd";

// 1. Wrap what people may move / scale / hide / re-time. Transform props are the saved defaults.
<Editable id="hero.card" label="Hero card" x={0} y={0}>
  <Card width={edit("hero.card.width", 880, { min: 600, max: 1100, step: 10, unit: "px" })} />
</Editable>

// 2. Text
const title = useCopy("hero.title", "Meet the|new thing");

// 3. Any literal: number, colour, string, boolean, enum
const panel = edit("hero.panel.color", "#2B6BF3", { label: "Panel" });

// 4. Entrances (returns progress + offsets/style at the current frame)
const card = useAnim("hero.card.in", { delay: 6, preset: "smooth", from: { x: -1000 } });
<div style={{ transform: `translateX(${card.x}px)` }} />
// staggered children: const spec = useAnimSpec("hero.title.in", { stagger: 3, preset: "snappy", from: { y: 34, opacity: 0 } }); animAt(spec, frame - i * spec.stagger, fps).style

// 5. Brand tokens — usable outside components (e.g. theme getters)
get hero() { return brand("brand.hero", "#E9573F", { label: "Hero", group: "Colors" }); }

// 6. Sounds — every sound effect / music bed is a <Sound> so it shows on the audio tracks
<Sound id="hero.whoosh" src="sfx/whoosh.wav" at={12} volume={0.7} label="Whoosh" />
<Sound id="music.bed" src="music/bed.mp3" at={0} volume={0.25} kind="music" label="Music bed" />
<LayoutSounds />   // once, in the root: plays sounds people add in the editor

// 7. Scene lengths in a literal table the editor can rewrite
export const SCENES = [{ id: "intro", label: "Intro", component: Intro, duration: 90 }, …];
<Sequence durationInFrames={sceneDuration(layout, "intro", 90)}>…</Sequence>
```

Rules that make the round-trip work:
- The **default must be a literal** in the source (a number, string, boolean or object of literals); that literal is what Save rewrites.
- Ids are dotted: `scene.element.prop`. A prop whose id starts with an element's id belongs to that element in the Inspector; otherwise it shows under the scene named by its first segment; `brand.*` goes to the Brand tab.
- The composition takes `{ layout }` as a prop and wraps its tree in `<LayoutProvider layout={layout}>`; `src/editor.ts` exports `defineProject({...})` (id, name, component, size, fps, scenes, entryPoint, `registerBrand` to pre-register tokens).

See `~/superconductor/projects/thumb-mcp/video` for a complete example (the thumb MCP launch video:
30 elements, 80+ editable values, 20 animations, 17 brand tokens, 91 sounds).

## How it works

- The editor hosts the project's composition in `@remotion/player` (same React and Remotion via Vite
  `dedupe`; production React build for smooth playback) and passes the overrides as `inputProps`, so
  every edit is live.
- `<Editable>` registers its DOM node with a registry; hit-testing uses `elementsFromPoint`, and only
  the hovered/selected element is measured per frame. On open, Insyd Studio steps through the video once to
  learn when every element is on screen (cached; **Rescan** refreshes it).
- `server/codemod.mjs` parses the project with Babel, indexes every locator (`call:`, `jsx:`,
  `scene:`) and rewrites literals with magic-string, preserving formatting. `server/index.mjs` serves
  the app and the project's `public/`, runs saves and `@remotion/renderer` exports.

## Scripts

```
npm run dev              start the editor
npm run init <dir>       install the SDK into a project
node scripts/e2e.mjs     browser end-to-end test (33 checks incl. save → source diff → reload)
node scripts/multiselect.mjs  multi-select + group move (timeline and canvas)
node scripts/marquee.mjs      rubber-band selection in the timeline
node scripts/groupedit.mjs    group inspector: shared fields, edits applied to every selected item
node scripts/clips.mjs        sound clip vocabulary: menu, split, trim, copy/paste, duplicate, delete, lock
node scripts/elclips.mjs      element clip vocabulary: linked copies, split/trim windows, delete/hide, lock
node scripts/shortcuts.mjs    ⌘A, zoom shortcuts, shortcuts modal, track locks
node scripts/audio.mjs        audio tracks: drag/replace/volume/mute/add, save → code
node scripts/playpause.mjs    play/pause through the real UI controls
node scripts/perf.mjs    main-thread ms/frame during playback
node scripts/profile.mjs CPU profile of playback
```
Set `CHROME=/path/to/chromium` if Playwright's bundled browser is not installed.
