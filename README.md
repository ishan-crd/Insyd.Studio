<h1 align="center">Studio</h1>
<p align="center"><sub><b>BY INSYD</b></sub></p>

# Studio by Insyd

A desktop-grade video editor for **Remotion** projects, with Claude built in.

Open a Remotion project, see every scene, element and sound on a timeline, and edit text, colours,
sizes, backgrounds, positions, timing, animations and audio by hand — or ask Claude. **Save writes the
changes back into the project's source files**, so the video stays real code and renders identically
everywhere.

```
npm install
npm run dev          # → http://localhost:4321
```
Then **Browse…** to a project folder and **Open project**. Requires macOS, Node 18+, and a Remotion
project prepared for Studio (see *Making a project editable*).

## Look

Quiet neutrals, one blue for selection, black for the primary action. Light by default; the moon/sun button in the
top bar switches to dark (remembered per browser). Layout: library (Scenes · Elements · Sounds · Brand) on the
left, the canvas with a floating size/zoom chip and a transport bar in the middle, the inspector (Element ·
Animation, or Sound / Scene / Brand / Group) on the right, and the timeline below with Split · Duplicate · Lock,
zoom and Fit.

## What you can do

| | |
|---|---|
| **Preview** | Click to select (innermost element wins), drag to move, corner handles to scale, `⇧` constrains, snapping to the canvas centre and to other elements with guides, `⇧`/`⌘`-click and box-select for groups. |
| **Inspector** | Text · position / scale / rotation / opacity / visibility · timing (shift, visible window) · every `edit()` property (sliders, colour pickers, toggles, enums) · animation editor (delay, spring presets or physics or bezier, from-values, curve preview) · lock. With several items selected, only shared fields show; edits apply to all. |
| **Brand** | Global tokens (`brand()`): palette, backgrounds, fonts — change once, every scene follows. |
| **Sounds** | Every `<Sound>` on the timeline with its waveform (effects in lanes over the music). Click the waveform in the inspector to listen. Volume, mute, trim, start, replace file (from `public/` or upload), `+ Sound` at the playhead. |
| **Timeline** | Scenes track with filmstrip thumbnails and trimmable scenes · a clip per element with its entrance bar · audio lanes · drag, trim, split at playhead, duplicate (linked copies), copy/cut/paste at playhead, lock, hide/mute, delete · snapping to clips, cuts and the playhead · box selection · context menus · zoom, resize. |
| **Save / Export** | `⌘S` rewrites the literals in the source (`edit`, `brand`, `useCopy`, `useAnim`, `<Editable>` attributes, `<Sound>` attributes, scene durations); anything without a code literal is kept in `layout.json`. **Export** renders an MP4 with progress. Unsaved edits survive reloads as a draft; full undo/redo. `?` lists every shortcut. |

## Claude

Studio runs an **MCP server** at `http://localhost:4321/mcp`. A connected Claude gets 28 tools to read the
project (`get_project`, `list_elements`, `list_sounds`, `list_values`, `get_context`), change it
(`set_text`, `set_value(s)`, `update_element(s)`, `set_sound(s)` with bulk filters, `add_sound`,
`set_scene_duration`), steer the UI (`select`, `seek`, `play`, `undo`), **see the result**
(`preview_frame` returns an image), and finish (`save`, `export_video`). Calls run inside the open
editor tab, so they are live, undoable, and announced with a toast. *"Set every whoosh to 10%"* is one
`set_sounds({ query: "whoosh", volume: 0.1 })`.

- **Open in Claude Code** (top bar) writes the full brief into the project's `CLAUDE.md`, opens Terminal
  in the project and starts `claude` with the MCP attached and a kickoff prompt. If the CLI is missing,
  the dialog shows the install command.
- **Claude & Studio dialog** (plug icon) shows the connection status and the one-liners for a permanent
  Claude Code setup (`claude mcp add --transport http insyd-studio http://localhost:4321/mcp`) and for
  Claude Desktop (`mcp-remote`).
- Edits Claude makes directly to files also show up: the preview reloads within a second, keeps your
  playhead and selection, and the timeline rescans itself if elements or sounds were added.

The server binds to `127.0.0.1` (the MCP endpoint can edit your files); set `INSYD_HOST=0.0.0.0` to expose it.

## Making a Remotion project editable

Studio edits what a project *declares*. The contract is one file copied into the project
(`src/insyd/index.tsx`) plus a few conventions:

```bash
node scripts/init-project.mjs /path/to/project   # or "Install SDK into project" in the Open dialog
```

```tsx
import { Editable, edit, brand, useCopy, useAnim, useAnimSpec, Sound, LayoutSounds, sceneDuration } from "./insyd";

<Editable id="hero.card" label="Hero card" x={0} y={0}>            // 1. movable / scalable / hideable / re-timeable
  <Card width={edit("hero.card.width", 880, { min: 600, max: 1100, step: 10, unit: "px" })} />   // 3. any literal
</Editable>
const title = useCopy("hero.title", "Meet the|new thing");          // 2. text
const card = useAnim("hero.card.in", { delay: 6, preset: "smooth", from: { x: -1000 } });   // 4. entrances
get hero() { return brand("brand.hero", "#E9573F", { label: "Hero", group: "Colors" }); }   // 5. brand tokens (theme getters)
<Sound id="hero.whoosh" src="sfx/whoosh.wav" at={12} volume={0.7} label="Whoosh" />            // 6. sounds
<LayoutSounds />                                                     //    once in the root: sounds added in the editor
export const SCENES = [{ id: "intro", label: "Intro", component: Intro, duration: 90 }, …];      // 7. scene table (literal durations)
<Sequence durationInFrames={sceneDuration(layout, "intro", 90)}>…</Sequence>
```

Rules: defaults are **literals** in the source (that is what Save rewrites); ids are dotted
`scene.element.prop` (a prop whose id starts with an element id belongs to that element; `brand.*` is
global); the composition takes `{ layout }` and wraps its tree in `<LayoutProvider layout={layout}>`;
`src/editor.ts` exports `defineProject({...})`. `~/Desktop/thumb-launch-wannabe` and
`~/superconductor/projects/thumb-mcp/video` are complete examples.

## How it works

- The editor hosts the project's composition in `@remotion/player` (one React/Remotion via Vite
  `dedupe`, production React build) and passes overrides as `inputProps`, so edits are live.
- `<Editable>`/`<Sound>` register with a registry; hit-testing uses the DOM; on open, a hidden second
  player steps through the video once to learn when everything is on screen (cached; rescans when the
  code's inventory changes). Filmstrips come from one background `renderFrames` pass, cached.
- `server/codemod.mjs` indexes every editable literal with Babel and rewrites them in place;
  `server/mcp.mjs` + `server/bridge.mjs` expose the editor over MCP through a WebSocket bridge to the tab;
  `server/context.mjs` writes the Claude brief.

## Scripts

```
npm run dev / start          start Studio
npm run init <dir>           install the SDK into a project
node scripts/e2e.mjs         edit → save → source diff → reload (33 checks)
node scripts/mcp.mjs         a real MCP client drives the editor (24)
node scripts/claude.mjs      Claude Code hand-off + live reload of external edits (12)
node scripts/playpause.mjs · multiselect · marquee · groupedit · clips · elclips · audio · snap · shortcuts · thumbs · preview
node scripts/perf.mjs        main-thread ms/frame during playback
```
Tests use Playwright's Chromium (`CHROME=/path/to/chromium` to override).
