// Deterministic 16-bit WAV synthesis for the launch video. No downloads.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sfx");
mkdirSync(out, { recursive: true });

const wav = (name, samples) => {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  writeFileSync(join(out, name), buf);
  console.log("wrote", name, (n / SR).toFixed(2) + "s");
};

// seeded noise so renders are reproducible
let seed = 1337;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
const gen = (dur, fn) => Float64Array.from({ length: Math.floor(SR * dur) }, (_, i) => fn(i / SR));

// one-pole lowpass used to shape noise
const lp = (arr, cutoffFn) => {
  let y = 0; const o = new Float64Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    const c = cutoffFn(i / SR); const a = 1 - Math.exp(-2 * Math.PI * c / SR);
    y += a * (arr[i] - y); o[i] = y;
  }
  return o;
};
const hp = (arr, cutoff) => { const l = lp(arr, () => cutoff); return arr.map((v, i) => v - l[i]); };

// whoosh: band-swept noise, 0.45s
{
  const raw = gen(0.45, () => rnd());
  const swept = hp(lp(raw, (t) => 400 + 5000 * Math.sin(Math.PI * Math.min(1, t / 0.45))), 250);
  wav("whoosh.wav", swept.map((v, i) => v * env(i / SR, 0.12, 0.12) * 0.9));
}
// pop: pitch-drop sine with a little click, 0.16s
wav("pop.wav", gen(0.16, (t) => Math.sin(2 * Math.PI * (180 + 520 * Math.exp(-t * 28)) * t) * env(t, 0.003, 0.045) * 0.8));
// soft pop for pills / small chips
wav("pop-soft.wav", gen(0.12, (t) => Math.sin(2 * Math.PI * (260 + 300 * Math.exp(-t * 40)) * t) * env(t, 0.002, 0.03) * 0.5));
// click / key tick
wav("click.wav", gen(0.05, (t) => (rnd() * 0.5 + Math.sin(2 * Math.PI * 2400 * t) * 0.5) * env(t, 0.001, 0.008) * 0.6));
// thump: sub hit on cuts
wav("thump.wav", gen(0.5, (t) => Math.sin(2 * Math.PI * (44 + 60 * Math.exp(-t * 18)) * t) * env(t, 0.004, 0.16) * 0.95));
// chime: success — two partials, major third apart
wav("chime.wav", gen(0.9, (t) => (Math.sin(2 * Math.PI * 1046.5 * t) * 0.55 + Math.sin(2 * Math.PI * 1318.5 * t) * 0.35 + Math.sin(2 * Math.PI * 2093 * t) * 0.1) * env(t, 0.004, 0.22) * 0.55));
// riser: filtered noise swelling over 0.6s
{
  const raw = gen(0.6, () => rnd());
  const f = lp(raw, (t) => 200 + 3000 * (t / 0.6) ** 2);
  wav("riser.wav", f.map((v, i) => v * Math.min(1, (i / SR) / 0.55) ** 2 * 0.7));
}

// Music bed: 100 BPM, 52s. Warm pad (detuned saws through LP) + soft kick + sparse pluck.
{
  const BPM = 100, beat = 60 / BPM, dur = 52;
  const chords = [ // C maj: I – vi – IV – V, in Hz, 2 bars each
    [130.81, 196.0, 261.63, 329.63],
    [110.0, 164.81, 261.63, 329.63],
    [87.31, 174.61, 261.63, 349.23],
    [98.0, 196.0, 293.66, 392.0],
  ];
  const n = Math.floor(SR * dur);
  const padRaw = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const bar = Math.floor(t / (beat * 4));
    const ci = Math.floor(bar / 2) % chords.length;
    const nextCi = Math.floor((bar + 1) / 2) % chords.length;
    // crossfade chords over the last beat of each 2-bar block
    const posInBlock = (t % (beat * 8)) / (beat * 8);
    const xf = posInBlock > 0.9 ? (posInBlock - 0.9) / 0.1 : 0;
    let s = 0;
    for (const [a, b] of [[chords[ci], 1 - xf], [chords[nextCi], xf]]) {
      if (b === 0) continue;
      for (const f of a) {
        const det = 1 + Math.sin(t * 0.7 + f) * 0.0015;
        s += (((t * f * det) % 1) * 2 - 1) * 0.12 * b; // saw
        s += Math.sin(2 * Math.PI * f * 2 * t) * 0.03 * b;
      }
    }
    padRaw[i] = s;
  }
  const pad = lp(padRaw, (t) => 520 + 180 * Math.sin(t * 0.35));
  const mix = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // kick on every beat, accent on 1
    const tb = t % beat; const beatIdx = Math.floor(t / beat) % 4;
    const kick = Math.sin(2 * Math.PI * (48 + 70 * Math.exp(-tb * 22)) * tb) * env(tb, 0.003, 0.11) * (beatIdx === 0 ? 0.55 : 0.32);
    // hat on off-beats, very quiet
    const th = (t + beat / 2) % beat;
    const hat = rnd() * env(th, 0.001, 0.02) * 0.06;
    // pluck arpeggio every half beat, gentle
    const tp = t % (beat / 2); const step = Math.floor(t / (beat / 2)) % 8;
    const bar = Math.floor(t / (beat * 4)); const ch = chords[Math.floor(bar / 2) % chords.length];
    const pf = ch[[1, 2, 3, 2, 1, 3, 2, 3][step]] * 2;
    const pluck = Math.sin(2 * Math.PI * pf * tp) * env(tp, 0.002, 0.09) * 0.10 * (t > 4 ? 1 : 0);
    const fadeIn = Math.min(1, t / 1.5), fadeOut = Math.min(1, (dur - t) / 3);
    mix[i] = (pad[i] * 0.9 + kick + hat + pluck) * fadeIn * fadeOut;
  }
  // gentle limiter
  let peak = 0; for (const v of mix) peak = Math.max(peak, Math.abs(v));
  wav("bed.wav", mix.map((v) => v / peak * 0.85));
}
