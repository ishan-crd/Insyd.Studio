# Templates

Launch-video templates, shown in the marketplace at `/` and opened with **Edit in Studio** (which makes
your own copy in `~/Documents/Studio Projects/` and opens it in the editor at `/studio`).

| Template | Length | Look |
|---|---|---|
| [`studio-launch`](studio-launch) | 0:58 · 10 scenes | Dark, glyph-rendered type, decode captions, a monitor reveal, a feature constellation — the Studio by Insyd launch film |
| [`thumb-launch`](thumb-launch) | 0:51 · 11 scenes | Warm, playful and beat-cut: a pixel mascot, a pill carousel, on-device demos — the thumb MCP launch film |
| [`opus-viral`](opus-viral) | 0:14 · 12 states · loops | One shape, never cut: a button morphs through 13 UI states on a 120 BPM loop, driven by a cursor (1:1, 60 fps) |
| [`roam-launch`](roam-launch) | 0:35 · 10 scenes · 9:16 | Poster-bold and loud: slammed type, colour blocks flipping on the beat, stamps, stickers, a route map and a boarding pass — an AI trip planner's launch |

Each template is a standalone Remotion project (Studio SDK in `src/insyd/`) plus:

- `template.json` — title, tagline, description, category, tags, music note, poster frame (hand-written)
- `.studio/` — processed files, made by `node scripts/package-template.mjs <slug>` with Studio running:
  `manifest.json` (template.json + size, scenes, clip / sound / value counts, palette, fonts),
  `preview.mp4` (the hover and detail-page preview), `poster.jpg`, `scan.json` (every clip's timing and
  every sound, so Studio opens it without an analysis pass) and `thumbs/` (the timeline filmstrip).
  All keyed by a content hash of `src/`, `public/` and `layout.json`: any edit makes Studio refresh them.

Add a template: put the project in `templates/<slug>/`, write `template.json`, run the packager.
`--poster` re-renders just the poster after changing `posterFrame`.
