// Deterministic audio for the Roam launch film: a 120 BPM sunny house track and the
// sound-effect kit. 44.1 kHz stereo 16-bit WAV, synthesized from scratch — `npm run audio`.
// 120 BPM at 30 fps = a beat every 15 frames, a bar every 60: every cut in the film sits on this grid.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(join(root, "sfx"), { recursive: true });
mkdirSync(join(root, "music"), { recursive: true });

const wav = (file, L, R = L) => {
  const n = L.length;
  // normalise to -1 dBFS peak
  let peak = 1e-9; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  if (!Number.isFinite(peak) || peak < 1e-4) throw new Error(`${file}: bad signal (peak ${peak})`);
  const g = 0.89 / peak;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
  }
  writeFileSync(join(root, file), buf);
  console.log("wrote", file, (n / SR).toFixed(2) + "s");
};

let seed = 20260927;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed / 4294967296) * 2 - 1; };
const arr = (sec) => new Float64Array(Math.floor(SR * sec));
const env = (t, a, d) => (t < 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) / d));
const TAU = Math.PI * 2;
// state-variable filter (Zavalishin TPT form — stable at any cutoff/Q); cutoff may vary per sample
const svf = (x, cutoff, q = 0.7, mode = "lp") => {
  const y = new Float64Array(x.length); let ic1 = 0, ic2 = 0;
  const k = 1 / q;
  for (let i = 0; i < x.length; i++) {
    const fc = Math.min(SR * 0.45, Math.max(20, typeof cutoff === "function" ? cutoff(i / SR) : cutoff));
    const g = Math.tan(Math.PI * fc / SR);
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x[i] - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    y[i] = mode === "lp" ? v2 : mode === "bp" ? v1 : x[i] - k * v1 - v2;
  }
  return y;
};
const mixInto = (dst, src, at, gain = 1) => { const o = Math.floor(at * SR); for (let i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] += src[i] * gain; };
const tanh = (x) => Math.tanh(x);

// ---------------------------------------------------------------- instruments
const kick = (dur = 0.55) => { const a = arr(dur); let ph = 0; for (let i = 0; i < a.length; i++) { const t = i / SR; const f = 42 + 150 * Math.exp(-t * 32); ph += TAU * f / SR; a[i] = tanh(Math.sin(ph) * 2.2) * env(t, 0.002, 0.2) + rnd() * env(t, 0.0005, 0.004) * 0.3; } return a; };
const hat = (open = false) => { const a = arr(open ? 0.28 : 0.06); for (let i = 0; i < a.length; i++) a[i] = rnd(); return svf(a, 9000, 0.9, "hp").map((v, i) => v * env(i / SR, 0.001, open ? 0.09 : 0.018) * 0.5); };
const clap = () => { const a = arr(0.3); for (let i = 0; i < a.length; i++) { const t = i / SR; const bursts = [0, 0.011, 0.022].reduce((s, o) => s + env(t - o, 0.0008, 0.007), 0) + env(t - 0.03, 0.001, 0.07); a[i] = rnd() * bursts; } return svf(a, 1500, 1.4, "bp").map((v) => v * 0.9); };
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);
const saw = (ph) => 2 * (ph - Math.floor(ph + 0.5));
const bassNote = (m, dur) => { const a = arr(dur); const f = midiHz(m); let p1 = 0, p2 = 0; for (let i = 0; i < a.length; i++) { const t = i / SR; p1 += f / SR; p2 += (f * 1.005) / SR; a[i] = (saw(p1) + saw(p2)) * 0.5 * env(t, 0.004, dur * 0.45) * (t > dur - 0.02 ? (dur - t) / 0.02 : 1); } return svf(a, (t) => 180 + 1400 * Math.exp(-t * 14), 1.1).map((v, i) => tanh(v * 1.6) + Math.sin(TAU * f * 0.5 * (i / SR)) * 0.35 * env(i / SR, 0.004, dur * 0.5)); };
const pluck = (m, dur = 0.32) => { const a = arr(dur); const f = midiHz(m); let p = 0; for (let i = 0; i < a.length; i++) { const t = i / SR; p += f / SR; a[i] = (saw(p) * 0.6 + Math.sin(TAU * p * 2) * 0.2) * env(t, 0.002, 0.09); } return svf(a, (t) => 600 + 5200 * Math.exp(-t * 22), 1.3); };
const padChord = (notes, dur) => { const a = arr(dur); const ph = notes.flatMap(() => [0, 0, 0]); for (let i = 0; i < a.length; i++) { const t = i / SR; let s = 0; notes.forEach((m, k) => { [-0.07, 0, 0.08].forEach((d, j) => { const idx = k * 3 + j; ph[idx] += midiHz(m + d) / SR; s += saw(ph[idx]); }); }); const fade = Math.min(1, t / 0.6, (dur - t) / 0.6); a[i] = (s / (notes.length * 3)) * Math.max(0, fade); } return svf(a, (t) => 900 + 500 * Math.sin(TAU * t * 0.12), 0.8); };

// house organ / piano stab: a few decaying harmonics, lightly driven
const stab = (notes, dur = 0.22, bright = 1) => { const a = arr(dur); notes.forEach((m) => { const f = midiHz(m); for (let i = 0; i < a.length; i++) { const t = i / SR; a[i] += (Math.sin(TAU * f * t) + 0.5 * bright * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 18) + 0.3 * bright * Math.sin(TAU * 3 * f * t) * Math.exp(-t * 30) + 0.15 * Math.sin(TAU * 4.01 * f * t) * Math.exp(-t * 45)) * env(t, 0.002, dur * 0.35); } }); return a.map((v) => tanh(v * 0.6)); };
const shaker = () => svf(arr(0.05).map(() => rnd()), 7000, 0.8, "hp").map((v, i) => v * env(i / SR, 0.004, 0.012) * 0.6);

// ---------------------------------------------------------------- the track
// 35 s, bars of 2 s. Hook bars 0–1 (a stab + kick on every slam, each second) · filtered groove bars 2–4
// with a riser into the drop · drop at 10 s (bar 5, ROAM) · montage bars 13–14 build · final hit at 30 s.
{
  const BEAT = 0.5, BAR = 2, LEN = 35;
  const L = arr(LEN), R = arr(LEN);
  const both = (src, at, g = 1, pan = 0) => { mixInto(L, src, at, g * (1 - Math.max(0, pan))); mixInto(R, src, at, g * (1 + Math.min(0, pan))); };
  // Fmaj7 – Am7 – Dm9 – Bbmaj7, one bar each
  const chords = [[53, 57, 60, 64], [55, 57, 60, 64], [53, 57, 60, 62], [53, 57, 58, 62]];
  const roots = [41, 45, 38, 46];
  const chordAt = (t) => Math.floor(t / BAR) % 4;
  // --- hook: 4 slams (0, 1, 2, 3 s): kick + fat stab, ticking shaker between
  for (let k = 0; k < 4; k++) {
    both(kick(0.7), k, 1);
    both(stab(chords[k % 4].map((m) => m + 12).concat([roots[k % 4]]), 0.5, 1.2), k, 0.55);
    for (let s = 1; s < 4; s++) both(shaker(), k + s * 0.25, 0.25, s % 2 ? 0.3 : -0.3);
  }
  // --- groove, filtered: bars 2–4 (4–10 s), the filter opening towards the drop
  const G = arr(6), GR = arr(6);
  const g = (src, at, gain = 1, pan = 0) => { mixInto(G, src, at, gain * (1 - Math.max(0, pan))); mixInto(GR, src, at, gain * (1 + Math.min(0, pan))); };
  for (let q = 0; q < 12; q++) g(kick(), q * BEAT, 0.9);
  for (let s = 0; s < 48; s++) g(shaker(), s * 0.125 + (s % 2 ? 0.02 : 0), s % 4 === 2 ? 0.35 : 0.2, s % 2 ? 0.35 : -0.35);
  for (let b = 0; b < 3; b++) for (const o of [0.75, 1.5, 1.75]) g(stab(chords[(b + 2) % 4], 0.2), b * BAR + o, 0.45);
  for (let b = 0; b < 3; b++) g(padChord(chords[(b + 2) % 4], BAR + 0.2), b * BAR, 0.3);
  const cut = (t) => 350 + 5200 * (t / 6) ** 2.2;
  const gl = svf(G, cut, 1.2), gr = svf(GR, cut, 1.2);
  mixInto(L, gl, 4, 0.55); mixInto(R, gr, 4, 0.55);
  // riser + snare roll into the drop, then a beat of silence
  { const r = arr(2); for (let i = 0; i < r.length; i++) r[i] = rnd(); both(svf(r, (t) => 400 + 9000 * (t / 2) ** 2, 1.4, "bp").map((v, i) => v * ((i / SR) / 2) ** 2), 7.75, 0.6); }
  for (let k = 0; k < 14; k++) both(clap(), 8 + k * (k < 8 ? 0.125 : 0.0625) + (k >= 8 ? 0.5 : 0), 0.1 + 0.35 * (k / 14));
  for (let i = Math.floor(9.62 * SR); i < 10 * SR; i++) { const d = Math.max(0, 1 - (i / SR - 9.62) / 0.05); L[i] *= d; R[i] *= d; }
  // --- drop: bars 5–14 (10–30 s)
  const lead = [72, 74, 76, 79, 76, 74, 72, 69];
  for (let b = 5; b < 15; b++) {
    const t0 = b * BAR, ci = chordAt(t0 - 10 + 0.001);
    for (let q = 0; q < 4; q++) both(kick(), t0 + q * BEAT, 1.05);
    both(clap(), t0 + BEAT, 0.6); both(clap(), t0 + 3 * BEAT, 0.6);
    for (let q = 0; q < 4; q++) both(hat(true), t0 + q * BEAT + 0.25, 0.3, q % 2 ? 0.3 : -0.3);
    for (let s = 0; s < 16; s++) both(shaker(), t0 + s * 0.125 + (s % 2 ? 0.02 : 0), s % 4 === 2 ? 0.32 : 0.18, s % 2 ? 0.4 : -0.4);
    // offbeat bass
    for (let e = 0; e < 8; e++) if (e % 2 === 1) both(bassNote(roots[ci], 0.2), t0 + e * 0.25, 0.6);
    // syncopated stabs
    for (const o of [0, 0.75, 1.25, 1.5]) both(stab(chords[ci], 0.24), t0 + o, 0.5, o === 0.75 ? 0.25 : -0.1);
    // a bright lead from bar 9, doubling in the montage
    if (b >= 9) for (let s = 0; s < 8; s++) if (s !== 3 && s !== 7) both(pluck(lead[s] + (ci === 3 ? -2 : 0), 0.26), t0 + s * 0.25, b >= 13 ? 0.22 : 0.15, s % 2 ? 0.45 : -0.45);
  }
  // pump the whole drop from the kick
  for (let i = 10 * SR; i < 30 * SR; i++) { const t = (i / SR) % BEAT; const d = 0.55 + 0.45 * Math.min(1, t / 0.18); L[i] *= d; R[i] *= d; }
  // montage build: a clap run in the last bar, into the hit
  for (let k = 0; k < 16; k++) both(clap(), 28 + k * 0.125, 0.12 + 0.35 * (k / 16));
  // --- final hit at 30 s: kick, boom, crash, a big chord ringing out, sparkles
  both(kick(1.2), 30, 1.3);
  { const a = arr(4); let p = 0; for (let i = 0; i < a.length; i++) { const t = i / SR; p += (40 + 34 * Math.exp(-t * 6)) / SR; a[i] = Math.sin(TAU * p) * env(t, 0.003, 1.1); } both(a, 30, 0.8); }
  { const a = svf(arr(3).map(() => rnd()), 5000, 0.7, "hp").map((v, i) => v * env(i / SR, 0.002, 0.9)); both(a, 30, 0.35); }
  both(stab([41, 53, 57, 60, 64, 69], 1.6, 1.3), 30, 0.7);
  both(padChord([53, 57, 60, 64, 69], 5), 30, 0.45);
  for (let s = 0; s < 10; s++) both(pluck([84, 88, 91, 93, 96][s % 5], 0.5), 30.5 + s * 0.25, 0.1 * (1 - s / 10), s % 2 ? 0.6 : -0.6);
  for (let i = 0; i < L.length; i++) { L[i] = tanh(L[i] * 1.05); R[i] = tanh(R[i] * 1.05); }
  wav("music/track.wav", L, R);
}

// ---------------------------------------------------------------- sound effects
const mono = (file, a) => wav(`sfx/${file}`, a);
const noise = (sec) => arr(sec).map(() => rnd());
// slam: punchy low thump + a paper smack
{ const a = arr(0.7); let p = 0; for (let i = 0; i < a.length; i++) { const t = i / SR; p += (55 + 160 * Math.exp(-t * 40)) / SR; a[i] = tanh(Math.sin(TAU * p) * 2.5) * env(t, 0.001, 0.16); } mixInto(a, svf(noise(0.12), 2400, 0.9, "bp").map((v, i) => v * env(i / SR, 0.0005, 0.02) * 1.4), 0); mono("slam.wav", a); }
// whip: a fast bright pass
mono("whip.wav", svf(noise(0.2), (t) => 1500 + 9000 * (t / 0.2), 2.2, "bp").map((v, i) => v * Math.sin(Math.PI * (i / SR) / 0.2) ** 3));
// swoosh: wider, softer
mono("swoosh.wav", svf(noise(0.5), (t) => 400 + 4800 * Math.sin(Math.PI * Math.min(1, t / 0.5)), 1.4, "bp").map((v, i) => v * env(i / SR, 0.18, 0.12)));
// pop: bubbly UI appear
mono("pop.wav", arr(0.14).map((_, i) => { const t = i / SR; return Math.sin(TAU * (300 + 900 * Math.exp(-t * 40)) * t) * env(t, 0.001, 0.035); }));
// key: a soft keyboard tick
mono("key.wav", svf(noise(0.04), 4200, 1.5, "bp").map((v, i) => v * env(i / SR, 0.0005, 0.008) + Math.sin(TAU * 200 * i / SR) * env(i / SR, 0.001, 0.01) * 0.3));
// tap: a finger on glass
mono("tap.wav", arr(0.08).map((_, i) => { const t = i / SR; return (Math.sin(TAU * 1100 * t) * 0.5 + rnd() * 0.3) * env(t, 0.0005, 0.012); }));
// tick: a counter digit
mono("tick.wav", arr(0.06).map((_, i) => { const t = i / SR; return (Math.sin(TAU * 2400 * t) * 0.6 + rnd() * 0.2) * env(t, 0.0005, 0.01); }));
// stamp: heavy wooden thud + rubber squish
{ const a = arr(0.5); let p = 0; for (let i = 0; i < a.length; i++) { const t = i / SR; p += (90 + 120 * Math.exp(-t * 60)) / SR; a[i] = Math.sin(TAU * p) * env(t, 0.001, 0.07) * 1.2; } mixInto(a, svf(noise(0.18), 900, 1.2, "bp").map((v, i) => v * env(i / SR, 0.002, 0.05)), 0.004); mono("stamp.wav", a); }
// ding: a bright two-note bell
{ const a = arr(1.2); for (const [f, o] of [[1318.5, 0], [1760, 0.09]]) for (let i = 0; i < a.length; i++) { const t = i / SR - o; if (t >= 0) a[i] += (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t * 6)) * env(t, 0.001, 0.35); } mono("ding.wav", a); }
// cash: register cha-ching (noise rattle + bells)
{ const a = arr(1); mixInto(a, svf(noise(0.12), 5000, 1.5, "bp").map((v, i) => v * env(i / SR, 0.001, 0.03)), 0); for (const [f, o] of [[2093, 0.08], [2637, 0.14], [3136, 0.14]]) for (let i = 0; i < a.length; i++) { const t = i / SR - o; if (t >= 0) a[i] += Math.sin(TAU * f * t) * env(t, 0.001, 0.25) * 0.5; } mono("cash.wav", a); }
// shimmer: rising sparkle partials
{ const a = arr(1); const fs = [1046.5, 1318.5, 1568, 2093, 2637]; for (let i = 0; i < a.length; i++) { const t = i / SR; a[i] = fs.reduce((s, f, k) => s + Math.sin(TAU * f * t + k) * env(t - k * 0.05, 0.02, 0.22) / (k + 1), 0); } mono("shimmer.wav", a); }
// riser: 1.5 s up-sweep
{ const a = arr(1.5); let p = 0; for (let i = 0; i < a.length; i++) { const t = i / SR; p += (220 + 1600 * (t / 1.5) ** 2) / SR; a[i] = (saw(p) * 0.25 + rnd() * 0.5) * (t / 1.5) ** 2; } mono("riser.wav", svf(a, (t) => 500 + 9000 * (t / 1.5) ** 2, 1.1)); }
// plane: a doppler fly-by
{ const a = arr(2.2); let p = 0; for (let i = 0; i < a.length; i++) { const t = i / SR; const x = (t - 1.1) / 0.5; p += (170 - 40 * Math.tanh(x)) / SR; const lvl = 1 / (1 + x * x); a[i] = (saw(p) * 0.3 + rnd() * 0.7) * lvl; } mono("plane.wav", svf(a, (t) => 900 + 2600 / (1 + ((t - 1.1) / 0.5) ** 2), 0.8)); }
// scribble: a marker squeak across paper
mono("scribble.wav", svf(noise(0.45), (t) => 2500 + 1800 * Math.sin(TAU * t * 7), 3, "bp").map((v, i) => v * Math.sin(Math.PI * (i / SR) / 0.45) * (0.6 + 0.4 * Math.sin(TAU * (i / SR) * 11))));
// hit: the logo / end-card impact (boom + crash + chord)
{ const a = arr(2.4); let p = 0; for (let i = 0; i < a.length; i++) { const t = i / SR; p += (38 + 110 * Math.exp(-t * 16)) / SR; a[i] = tanh(Math.sin(TAU * p) * 2.2) * env(t, 0.002, 0.5); } mixInto(a, svf(noise(2), 6000, 0.7, "hp").map((v, i) => v * env(i / SR, 0.002, 0.5) * 0.5), 0); mixInto(a, stab([65, 69, 72, 76], 1.8, 1.2), 0, 0.35); mono("hit.wav", a); }
