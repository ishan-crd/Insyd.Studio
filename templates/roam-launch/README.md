# Roam — launch film

A vertical (1080×1920, 30 fps, 35 s) launch film for a made-up AI trip planner, built like a gig poster:
condensed type that slams in, colour blocks that flip on the beat, thick ink outlines with hard offset
shadows, stickers and rubber stamps. Swap the copy and colours and it's your app.

```
npm install
npm run studio     # Remotion Studio
npm run render     # out/roam-launch.mp4
npm run audio      # regenerate the track + sound effects (deterministic, royalty-free)
```

**Scenes** (every cut on a beat of the 120 BPM track, a beat = 15 frames): hook (four slams) · "What if
planning took one sentence?" · the ask, typed · ROAM on the drop · itinerary cards · the route map · the
budget (price rolls down, UNDER BUDGET) · the boarding pass (BOOKED.) · eight cities · end card.

**In Studio.** Every element is its own clip, timed to the clip itself: colour blocks, words, cards, the
map, route, stops and counter, the price, stamps, the pass, each city, the lockup and CTA. Move a clip and
its whole animation moves; trim it and its exit moves. All copy, sizes and timings (typing speed, stop
spacing, price roll, letters stagger) are editable values; the palette and fonts are brand tokens.
Every slam, whip, key, pop, stamp, cha-ching, plane and the final hit is on the audio tracks.

**Swap the music** for any ~120 BPM track: replace `public/music/track.wav`, or "Replace" on the music clip
in Studio, keeping its first downbeat on frame 0 (the drop lands at 10 s).
