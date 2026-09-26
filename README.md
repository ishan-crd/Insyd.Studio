<h1 align="center">Studio</h1>
<p align="center"><sub><b>BY INSYD</b></sub></p>

<p align="center">A desktop-grade video editor for <b>Remotion</b> projects, with Claude built in.</p>

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

**On a phone** (any window under 760px wide) the same editor becomes one column: the canvas on top, a transport
row (undo · redo · previous scene · play · next scene · timecode), the timeline scrolling sideways under your
finger, and a panel switched by a bottom dock — Layers (Scenes · Elements · Sounds), Inspect, Brand, and More,
where Save, Open in Claude Code, Copy prompt, Rescan, Split / Duplicate / Lock / Hide / Delete and timeline zoom
live. Dialogs open as bottom sheets. To use it from a phone, start Studio listening on your network —
`INSYD_HOST=0.0.0.0 npm start` — and open `http://<your-mac>.local:4321` on the same Wi-Fi.

## Routes

`/` is the **template marketplace** — cards play their preview on hover, `/templates/<slug>` has the full
preview, scenes, palette and facts, and **Edit in Studio** copies the template into
`~/Documents/Studio Projects/` and opens it. `/studio` is the editor. See [`templates/`](templates).

## Deploying the web version (Vercel)

The repo builds a static site — the template marketplace — with `npm run build` → `dist/`. The editor
itself runs locally (it edits project files and renders with your machine), so on the web `/studio`
explains how to run it, and each template can be downloaded as a zip.

- Import the repo in Vercel with the **root directory** set to the repo root. `vercel.json` sets
  everything: install `npm ci`, build `npm run build`, output `dist`, framework *Other*, and the routes
  (`/api/templates` → the prebuilt catalogue, everything else → the app). No environment variables.
- Node 20+ (`engines`). The build takes a few seconds; it only reads `templates/*/.studio/`, so process
  a template (`node scripts/package-template.mjs <slug>`, locally) before pushing it.
- `npm run build && npm run preview:web` serves `dist/` exactly as Vercel will, at http://localhost:4400.
- Custom domain: add it in Vercel → Project → Domains, then create the CNAME it shows at your DNS host.

## What you can do

| | |
|---|---|
| **Preview** | Click to select (innermost element wins), drag to move, corner handles to scale, `⇧` constrains, snapping to the canvas centre and to other elements with guides, `⇧`/`⌘`-click and box-select for groups. |
| **Inspector** | Text · position / scale / rotation / opacity / visibility · timing (shift, visible window) · **speed** (0.25×–4× on elements, sounds and whole scenes: an element's clock runs faster or slower so its animations re-time; a sound plays at that rate and its clip shortens; a scene plays everything inside at that rate and its length follows) · every `edit()` property (sliders, colour pickers, toggles, enums) · animation editor (delay, spring presets or physics or bezier, from-values, curve preview) · lock. With several items selected, only shared fields show; edits apply to all. |
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

- **Open in Claude Code** (top bar) opens a dialog — nothing runs until you press a button: connection
  status; step 1, the one-liner that registers the MCP with Claude Code
  (`claude mcp add --transport http insyd-studio http://localhost:4321/mcp`); step 2, **Open Terminal**,
  which refreshes the project's `CLAUDE.md` with the full brief and starts `claude` in the project with
  the MCP attached and a kickoff prompt. **Copy prompt** (also the copy icon next to the button) gives a
  self-contained prompt with the whole inventory for any Claude without the MCP — Studio reloads the
  preview live as files change. Claude Desktop (`mcp-remote`) setup and the tool list are under "Show".
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
<Sequence durationInFrames={sceneDuration(layout, "intro", 90)}><SceneFrame id="intro"><Intro /></SceneFrame></Sequence>   //    SceneFrame lets the editor change the scene's speed
```

**Timing like a real editor.** Give every element its own clip: `delay` is where it starts on the
timeline and `trimOut` its last frame (in its own frames). Inside, time the content with `useClip()`
— `frame` is 0 at the clip's first frame and `end` is its last — so entrances run from 0 and exits run
into `end`. Then dragging a clip moves its whole animation, and trimming its edge moves its exit.

```tsx
<Editable id="hook.title" label="Title" kind="text" delay={62} trimOut={37}>   // on screen f62–f99
  <Title text={useCopy("hook.title", "Launch day happens once.")} anim={useAnimSpec("hook.title.in", { preset: "bezier", duration: 14 })} />
</Editable>
const Title = ({ text, anim }) => { const { frame, end } = useClip(); /* entrance from 0, exit into end */ };
```

Rules: defaults are **literals** in the source (that is what Save rewrites); ids are dotted
`scene.element.prop` (a prop whose id starts with an element id belongs to that element; `brand.*` is
global); the composition takes `{ layout }` and wraps its tree in `<LayoutProvider layout={layout}>`;
`src/editor.ts` exports `defineProject({...})`. [`templates/studio-launch`](templates/studio-launch)
is a complete example: every text, texture, pointer, panel and sound is its own clip.

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
node scripts/speed.mjs         element time remap + sound playback rate, saved to code (17)
node scripts/marketplace.mjs  routes, hover previews, template page, Edit in Studio end to end (25)
node scripts/cliptiming.mjs   every clip's timeline bounds = the frames it is on screen
node scripts/drafts.mjs       unsaved drafts vs. code that changed under them, Discard (10)
node scripts/package-template.mjs <slug>   process a template (.studio/: scan, thumbs, preview, poster, manifest)
node scripts/mobile.mjs       the phone layout at 390px with a touch screen (39)
node scripts/playpause.mjs · multiselect · marquee · groupedit · clips · elclips · audio · snap · shortcuts · thumbs · preview
node scripts/perf.mjs        main-thread ms/frame during playback
```
Tests use Playwright's Chromium (`CHROME=/path/to/chromium` to override). They run against whatever project Studio
has open (`PROJECT=/dir` to override); the suites with hard-coded frames expect the `thumb-mcp-video` cut. Suites that
save snapshot the project's `src/` and `layout.json` first and put them back on exit.
