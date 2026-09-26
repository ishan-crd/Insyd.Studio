// Deterministic audio for "Opus Viral on X": a seamless 7-bar loop at 120 BPM (14 s — every tail that
// runs past the end is wrapped onto the start, so the loop point is inaudible) and a soft UI sound kit.
// 44.1 kHz stereo 16-bit WAV, synthesized from scratch — `npm run audio`. Royalty-free by construction.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100, TAU = Math.PI * 2;
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(join(root, "sfx"), { recursive: true }); mkdirSync(join(root, "music"), { recursive: true });
const wav = (file, L, R = L, gainDb = -1) => {
  const n = L.length; let peak = 1e-9;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  if (!Number.isFinite(peak) || peak < 1e-4) throw new Error(`${file}: bad signal`);
  const g = 10 ** (gainDb / 20) / peak, buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4); }
  writeFileSync(join(root, file), buf); console.log("wrote", file, (n / SR).toFixed(2) + "s");
};
let seed = 1440;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed / 4294967296) * 2 - 1; };
const arr = (s) => new Float64Array(Math.floor(SR * s));
const env = (t, a, d) => (t < 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) / d));
const svf = (x, cutoff, q = 0.7, mode = "lp") => { // TPT state-variable filter (stable)
  const y = new Float64Array(x.length); let ic1 = 0, ic2 = 0; const k = 1 / q;
  for (let i = 0; i < x.length; i++) {
    const fc = Math.min(SR * 0.45, Math.max(20, typeof cutoff === "function" ? cutoff(i / SR) : cutoff));
    const g = Math.tan(Math.PI * fc / SR), a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x[i] - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    y[i] = mode === "lp" ? v2 : mode === "bp" ? v1 : x[i] - k * v1 - v2;
  }
  return y;
};
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

// ---------------------------------------------------------------- the loop
{
  const BEAT = 0.5, LEN = 14, TAIL = 3;
  const L = arr(LEN + TAIL), R = arr(LEN + TAIL);
  const add = (src, at, g = 1, pan = 0) => { const o = Math.round(at * SR); for (let i = 0; i < src.length; i++) { const j = o + i; if (j < 0 || j >= L.length) continue; L[j] += src[i] * g * (1 - Math.max(0, pan)); R[j] += src[i] * g * (1 + Math.min(0, pan)); } };
  const kick = () => { const a = arr(0.4); let p = 0; for (let i = 0; i < a.length; i++) { const t = i / SR; p += (48 + 110 * Math.exp(-t * 30)) / SR; a[i] = Math.tanh(Math.sin(TAU * p) * 1.6) * env(t, 0.003, 0.14); } return a; };
  const hat = (open) => svf(arr(open ? 0.22 : 0.05).map(() => rnd()), 8500, 0.8, "hp").map((v, i) => v * env(i / SR, 0.001, open ? 0.07 : 0.015));
  const clap = () => svf(arr(0.25).map((_, i) => { const t = i / SR; return rnd() * ([0, 0.009, 0.018].reduce((s, o) => s + env(t - o, 0.0008, 0.006), 0) + env(t - 0.024, 0.001, 0.05)); }), 1700, 1.3, "bp");
  // electric-piano chord: sine + soft 2nd/3rd partials with a tine attack and gentle tremolo
  const keys = (notes, dur) => { const a = arr(dur); for (let i = 0; i < a.length; i++) { const t = i / SR; let s = 0; for (const m of notes) { const f = hz(m); s += Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * 2 * f * t) * env(t, 0.002, 0.25) + 0.12 * Math.sin(TAU * 3 * f * t) * env(t, 0.001, 0.08); } a[i] = (s / notes.length) * env(t, 0.004, 0.9) * (1 + 0.08 * Math.sin(TAU * 5 * t)) * Math.min(1, (dur - t) / 0.05); } return a; };
  const bass = (m, dur) => { const a = arr(dur); for (let i = 0; i < a.length; i++) { const t = i / SR; a[i] = (Math.sin(TAU * hz(m) * t) + 0.25 * Math.sin(TAU * 2 * hz(m) * t)) * env(t, 0.005, dur * 0.7) * Math.min(1, (dur - t) / 0.02); } return a; };
  // Fmaj9 – Em7 – Dm9 – Cmaj7 (two beats each… a bar each), bar 7 resolves back to the top
  const prog = [[53, 57, 60, 64, 67], [52, 55, 59, 62, 67], [50, 53, 57, 60, 64], [48, 52, 55, 59, 64]];
  const roots = [41, 40, 38, 36];
  for (let bar = 0; bar < 7; bar++) {
    const t0 = bar * 4 * BEAT, c = bar % 4;
    for (let b = 0; b < 4; b++) add(kick(), t0 + b * BEAT, 0.9);
    add(clap(), t0 + BEAT, 0.28, 0.1); add(clap(), t0 + 3 * BEAT, 0.28, 0.1);
    for (let e = 0; e < 8; e++) add(hat(e % 2 === 1), t0 + e * BEAT / 2 + (e % 2 ? 0.012 : 0), e % 2 ? 0.2 : 0.1, e % 2 ? 0.3 : -0.3);
    // chords push on the "and" of 2 and land on 1 — a light house pattern
    add(keys(prog[c], 0.9), t0, 0.32, -0.15); add(keys(prog[c], 0.4), t0 + 1.5 * BEAT, 0.2, 0.15); add(keys(prog[c], 0.6), t0 + 3 * BEAT, 0.22, -0.1);
    for (const [at, d] of [[0, 0.45], [1.5, 0.2], [2, 0.45], [3.5, 0.2]]) add(bass(roots[c], d), t0 + at * BEAT, 0.5);
  }
  // pump everything but the kick a little on each beat (side-chain feel)
  // wrap the tail onto the start so the loop is seamless
  for (let i = 0; i < TAIL * SR; i++) { L[i] += L[LEN * SR + i]; R[i] += R[LEN * SR + i]; }
  const outL = L.slice(0, LEN * SR).map((v) => Math.tanh(v * 1.2)), outR = R.slice(0, LEN * SR).map((v) => Math.tanh(v * 1.2));
  wav("music/loop.wav", outL, outR);
}

// ---------------------------------------------------------------- UI sounds (soft, short, no reverb tails)
const mono = (f, a, db) => wav(`sfx/${f}`, a, a, db);
// tap: a crisp trackpad click
mono("tap.wav", arr(0.06).map((_, i) => { const t = i / SR; return (Math.sin(TAU * 2200 * t) * 0.5 + rnd() * 0.4) * env(t, 0.0004, 0.005) + Math.sin(TAU * 140 * t) * env(t, 0.001, 0.012) * 0.6; }), -3);
// release: a lighter click on mouse-up
mono("release.wav", arr(0.04).map((_, i) => { const t = i / SR; return (Math.sin(TAU * 3000 * t) * 0.5 + rnd() * 0.3) * env(t, 0.0003, 0.003); }), -9);
// morph: a short airy swell under shape changes
mono("morph.wav", svf(arr(0.32).map(() => rnd()), (t) => 900 + 3500 * Math.sin(Math.PI * Math.min(1, t / 0.32)), 1.4, "bp").map((v, i) => v * Math.sin(Math.PI * (i / SR) / 0.32) ** 2), -6);
// done: two soft sine notes (check / toast)
mono("done.wav", arr(0.5).map((_, i) => { const t = i / SR; return Math.sin(TAU * 1318.5 * t) * env(t, 0.002, 0.09) + Math.sin(TAU * 1975.5 * t) * env(t - 0.07, 0.002, 0.14) * 0.8; }), -4);
// toggle: a woody tick
mono("toggle.wav", arr(0.08).map((_, i) => { const t = i / SR; return Math.sin(TAU * (900 - 300 * t / 0.08) * t) * env(t, 0.0005, 0.012) + rnd() * env(t, 0.0003, 0.002) * 0.3; }), -4);
// key: a keyboard tick
mono("key.wav", svf(arr(0.035).map(() => rnd()), 4200, 1.6, "bp").map((v, i) => v * env(i / SR, 0.0004, 0.006) + Math.sin(TAU * 220 * i / SR) * env(i / SR, 0.0008, 0.008) * 0.25), -6);
// scrub: fine ratchet (repeat it while dragging)
mono("scrub.wav", arr(0.03).map((_, i) => { const t = i / SR; return Math.sin(TAU * 5200 * t) * env(t, 0.0002, 0.0025) * 0.7; }), -12);
// stretch: a rubbery low glide for the over-drag
mono("stretch.wav", arr(0.35).map((_, i) => { const t = i / SR; return Math.sin(TAU * (180 + 220 * t) * t) * Math.sin(Math.PI * t / 0.35) ** 2; }), -8);
