# thumb MCP — launch film

The launch film for [thumb](https://github.com/ishan-crd/thumb-mcp), the open-source iPhone MCP for
Claude: a pixel thumb mascot, a pill carousel of things to ask, search / Figma / settings demos on a
phone and the install command — every scene cut on a downbeat of the track.

```
npm install
npm run render     # out/thumb-launch.mp4
npm run studio     # Remotion Studio
```

Or open it from the Studio marketplace ("Edit in Studio") to change anything — copy, logo, colours,
timing, every sound — with every edit written back into this source.

**Music.** `public/music/wannabe.mp3` is a licensed commercial track, used for the original launch cut.
Replace it (the `music.bed` sound in `src/Root.tsx`, or "Replace" on the music clip in Studio) before
publishing a video made from this template.

**Sync.** `src/music.ts` holds the track's beat grid (112.3 BPM; a beat ≈ 16 frames, a bar ≈ 64). Every
scene starts 3 frames before a downbeat so its entrance is already moving when the beat lands; sound
effects lead their visual by 2 frames for the same reason.
