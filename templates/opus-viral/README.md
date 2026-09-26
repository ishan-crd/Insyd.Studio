# Opus Viral on X

One shape, never cut. A black-and-white element morphs — size, radius and colour on springs — through
13 UI states while a cursor drives every change with real clicks and drags: **button → loader → check →
dynamic island → music player (play ▸ pause morph) → scrub → volume slider (stretches past max) → toggle
(flips on the beat) → liquid tab indicator → chart (draws itself, hover tooltip) → ⌘K (type to filter,
enter) → toast → back to the button**. 1440×1440, 60 fps, 7 bars at 120 BPM (840 frames); the last frame
is the first frame, so it loops.

```
npm install
npm run audio      # regenerate the loop + UI sounds (deterministic, royalty-free)
npm run render     # out/opus-viral.mp4 — 4 sub-frame passes averaged in ffmpeg (true motion blur)
npm run render:fast
node scripts/beat-frames.mjs   # one frame per beat as a contact sheet, before a full render
```

**How it moves.** Everything is a pure function of the frame (`src/model.ts`). A value that changes
target many times is the sum of one closed-form spring per change, so it never carries state between
frames. The tab indicator's and the toggle knob's edges ride different springs (the leading edge stretches
ahead). Drags are direct manipulation: while the cursor is held, the playhead and the volume are computed
from its position; the over-drag springs back from wherever it was released. The camera zooms so each
state fills the frame. Motion blur samples around the loop, so frame 0 blurs exactly like frame 839.

**In Studio.** Each state is a scene — trim one and the shape, camera and cursor retime with it. Every
piece of content is its own clip (label, spinner, check, artwork, equalizer, title, progress bar,
controls, volume slider, knob, tab indicator and labels, chart tabs, total, line, tooltip, search
input, command list, toast), with its copy, sizes and numbers editable and written back into the
source. Every sound (clicks, releases, morphs, scrub ticks, keys, the stretch, the loop) is on the audio
tracks. The palette, font, shape spring, camera fill and motion blur are brand tokens / values.

**Swap the music** for a royalty-free ~120 BPM track (e.g. Mixkit): replace `public/music/loop.wav`, or
"Replace" on the music clip in Studio, and keep the downbeat on frame 0.
