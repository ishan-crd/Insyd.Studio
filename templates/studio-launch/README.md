# Studio by Insyd — launch film

A 58-second launch film for Studio by Insyd, built in Remotion and wired for Studio itself: open this
folder in Studio and every piece of it — 10 scenes, 53 clips, 71 sounds, ~90 values and 12 brand
tokens — is selectable, editable and saved back into this source.

```
npm install
npm run audio      # regenerate the score + sound-effect kit (deterministic, no downloads)
npm run studio     # Remotion Studio
npm run render     # out/studio-launch.mp4 (1080p, H.264)
```

**Look.** Everything is drawn from glyphs: `AsciiField` renders procedural textures (terrain, knit,
tiles, ripples, haze) on a character grid and `AsciiWord` builds giant words from glyphs with a
cylindrical bulge and chromatic fringing. Text decodes out of braille noise (`Decode`). A magenta orb
is the recurring "AI"; a dark studio room reveals the product; the camera flies through a
constellation of Studio panels; a wall of templates is the marketplace.

**Sound.** `scripts/make-audio.mjs` synthesizes a 120 BPM score (a beat every 15 frames, a bar every
60): dark intro → build → drop at 20 s on "INTRODUCING…" → break → final hit at 50 s on the logo, plus
13 effects. Every cut sits on a bar or half-bar.

**Every piece is a clip.** Each text line, glyph word, texture, pointer, panel, the room camera and
the film grain is an `<Editable delay={start} trimOut={last}>` and times itself with `useClip()`, so
its bar in Studio's timeline starts and ends exactly where it is on screen. Drag a clip and its whole
animation moves with it; trim an edge and its exit follows; entrances are `useAnimSpec("….in")`
specs that show as bars on the clip and are editable in the Animation tab. Nested clips (the
INTRODUCING… text, the Studio UI and the orb inside the room; the six panels and their captions
inside the constellation) move with their parent.

**Editing contract.** Copy is `useCopy`, numbers/colours are `edit`, the palette and fonts are
`brand` tokens in `src/theme.ts`, movable things are `<Editable>`, every sound is an `<Sfx>` /
`<KeyTicks>` / `<Sound>` with a literal id, scene lengths live in the `SCENES` table in
`src/Root.tsx`. Use it as a template: swap the logo, copy and colours in Studio and export.
