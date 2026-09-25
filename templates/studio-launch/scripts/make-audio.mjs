// Deterministic audio for the Studio by Insyd launch film: a 120 BPM dark-electronic score and the
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

let seed = 20260926;
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

// ---------------------------------------------------------------- the score
// Structure (bars of 2 s): 0–7 dark intro (pad, sub pulse, ticks) · 8–9 build (riser, snare roll)
// · 10–22 drop (kick, bass, arp, claps) · 23–24 break (wall of templates → end) · 25 final hit + tail.
{
  const BEAT = 0.5, BAR = 2, LEN = 58;
  const L = arr(LEN), R = arr(LEN);
  const both = (src, at, g = 1, pan = 0) => { mixInto(L, src, at, g * (1 - Math.max(0, pan))); mixInto(R, src, at, g * (1 + Math.min(0, pan))); };
  // A minor: Am – F – C – G (roots), two bars each in the intro, one bar each in the drop
  const prog = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]];
  const roots = [33, 29, 36, 31];
  // pad everywhere except the final tail
  for (let b = 0; b < 26; b += 2) { const c = prog[(b / 2) % 4]; both(padChord(c, BAR * 2 + 0.3), b * BAR, b < 10 ? 0.45 : 0.2); }
  // intro: sub pulse on beat 1 + ticking hats (quiet), glass pings
  for (let b = 0; b < 10; b++) {
    both(kick(0.8).map((v) => v * 0.55), b * BAR, 0.8);
    for (let s = 0; s < 8; s++) both(hat(), b * BAR + s * 0.25, s % 2 ? 0.2 : 0.3, s % 2 ? 0.3 : -0.3);
    if (b % 2 === 1) both(pluck(76, 0.8), b * BAR + 1.5, 0.12, 0.4);
  }
  // build: snare roll + rising noise, bars 8–9
  { const r = arr(4); for (let i = 0; i < r.length; i++) r[i] = rnd(); const rs = svf(r, (t) => 300 + 7000 * (t / 4) ** 2, 1.2, "bp").map((v, i) => v * ((i / SR) / 4) ** 2 * 1.4); both(rs, 8 * BAR, 0.5); }
  for (let k = 0; k < 16; k++) { const t = 8 * BAR + 2 + k * 0.125; both(clap(), t, 0.1 + 0.4 * (k / 16)); }
  // drop: bars 10–22
  const arpPat = [0, 7, 12, 15, 12, 7, 3, 7];
  for (let b = 10; b < 23; b++) {
    const ci = (b - 10) % 4; const t0 = b * BAR;
    for (let q = 0; q < 4; q++) both(kick(), t0 + q * BEAT, 1);
    both(clap(), t0 + BEAT, 0.55); both(clap(), t0 + 3 * BEAT, 0.55);
    for (let s = 0; s < 8; s++) both(hat(s % 2 === 1), t0 + s * 0.25, s % 2 ? 0.28 : 0.16, s % 2 ? 0.25 : -0.25);
    // offbeat bass (8ths, rests on the kick) — the "pumping" feel
    for (let e = 0; e < 8; e++) if (e % 2 === 1) both(bassNote(roots[ci] + 12, 0.22), t0 + e * 0.25, 0.55);
    // arp 16ths
    for (let s = 0; s < 16; s++) both(pluck(roots[ci] + 36 + arpPat[s % 8], 0.2), t0 + s * 0.125, 0.16, s % 2 ? 0.45 : -0.45);
  }
  // sidechain-ish duck of the pad on every drop beat
  for (let i = 10 * BAR * SR; i < 23 * BAR * SR; i++) { const t = (i / SR) % BEAT; const d = 0.45 + 0.55 * Math.min(1, t / 0.2); L[i] *= d; R[i] *= d; }
  // break: bars 23–24 — kick out, filtered pad + reverse swell into the final hit at bar 25 (50 s)
  { const r = arr(3.5); for (let i = 0; i < r.length; i++) r[i] = rnd(); both(svf(r, (t) => 200 + 5000 * (t / 3.5) ** 3, 1, "bp").map((v, i) => v * ((i / SR) / 3.5) ** 3), 23 * BAR + 0.5, 0.6); }
  for (let s = 0; s < 16; s++) both(pluck(69 + arpPat[s % 8], 0.3), 23 * BAR + s * 0.25, 0.1, s % 2 ? 0.5 : -0.5);
  // final hit: kick + low boom + chord swell, then tail
  both(kick(1.2), 25 * BAR, 1.2);
  { const a = arr(4); let p = 0; for (let i = 0; i < a.length; i++) { const t = i / SR; p += (38 + 30 * Math.exp(-t * 6)) / SR; a[i] = Math.sin(TAU * p) * env(t, 0.003, 1.2); } both(a, 25 * BAR, 0.9); }
  both(padChord([57, 64, 69, 72, 76], 7.5), 25 * BAR, 0.4);
  // gentle master glue
  for (let i = 0; i < L.length; i++) { L[i] = tanh(L[i] * 1.1); R[i] = tanh(R[i] * 1.1); }
  wav("music/score.wav", L, R);
}

// ---------------------------------------------------------------- sound effects
const mono = (file, a) => wav(`sfx/${file}`, a);
const noise = (sec) => arr(sec).map(() => rnd());
// whoosh: band sweep up and down
mono("whoosh.wav", svf(noise(0.55), (t) => 300 + 5200 * Math.sin(Math.PI * Math.min(1, t / 0.55)), 1.6, "bp").map((v, i) => v * env(i / SR, 0.2, 0.1)));
// swish: short airy pass for panels
mono("swish.wav", svf(noise(0.3), (t) => 2500 + 6000 * (t / 0.3), 2, "bp").map((v, i) => v * Math.sin(Math.PI * (i / SR) / 0.3) ** 2));
// glitch: bit-crushed stutter
{ const a = arr(0.28); let hold = 0, v = 0; for (let i = 0; i < a.length; i++) { const t = i / SR; if (hold-- <= 0) { v = rnd() * (Math.floor(t * 40) % 2 ? 1 : 0.3); hold = 40 + Math.floor(Math.abs(rnd()) * 300); } a[i] = (Math.sign(Math.sin(TAU * (220 + 900 * Math.abs(v)) * t)) * 0.4 + v) * env(t, 0.002, 0.12); } mono("glitch.wav", a); }
// decode: data chatter (short tonal blips), 0.6 s
{ const a = arr(0.6); for (let k = 0; k < 18; k++) { const t0 = k * 0.032; const f = 1200 + Math.abs(rnd()) * 3200; for (let i = 0; i < 0.02 * SR; i++) { const idx = Math.floor(t0 * SR) + i; if (idx < a.length) a[idx] += Math.sign(Math.sin(TAU * f * i / SR)) * env(i / SR, 0.001, 0.006) * 0.35; } } mono("decode.wav", a); }
// impact: sub boom + noise crack
{ const a = arr(1.6); let p = 0; for (let i = 0; i < a.length; i++) { const t = i / SR; p += (34 + 90 * Math.exp(-t * 14)) / SR; a[i] = tanh(Math.sin(TAU * p) * 2) * env(t, 0.002, 0.45) + rnd() * env(t, 0.001, 0.05) * 0.6; } mono("impact.wav", a); }
// click: mouse click
mono("click.wav", arr(0.05).map((_, i) => { const t = i / SR; return (rnd() * 0.6 + Math.sin(TAU * 3200 * t) * 0.6) * env(t, 0.0005, 0.006); }));
// key: one soft keyboard tick
mono("key.wav", svf(noise(0.04), 3800, 1.5, "bp").map((v, i) => v * env(i / SR, 0.0005, 0.008) + Math.sin(TAU * 180 * i / SR) * env(i / SR, 0.001, 0.01) * 0.3));
// pop: UI appear
mono("pop.wav", arr(0.14).map((_, i) => { const t = i / SR; return Math.sin(TAU * (240 + 700 * Math.exp(-t * 35)) * t) * env(t, 0.002, 0.04); }));
// tick: checkbox tick (bright)
mono("tick.wav", arr(0.12).map((_, i) => { const t = i / SR; return (Math.sin(TAU * 1760 * t) * 0.6 + Math.sin(TAU * 2640 * t) * 0.3) * env(t, 0.001, 0.035); }));
// shimmer: glassy rising partials (orb)
{ const a = arr(1.4); const fs = [880, 1320, 1760, 2217, 2637]; for (let i = 0; i < a.length; i++) { const t = i / SR; a[i] = fs.reduce((s, f, k) => s + Math.sin(TAU * f * (1 + 0.02 * t) * t + k) * env(t - k * 0.06, 0.08, 0.35) / (k + 1), 0); } mono("shimmer.wav", a); }
// riser: 1.5 s noise + pitch rise
{ const a = arr(1.5); let p = 0; for (let i = 0; i < a.length; i++) { const t = i / SR; p += (200 + 1400 * (t / 1.5) ** 2) / SR; a[i] = (Math.sin(TAU * p) * 0.4 + rnd() * 0.5) * (t / 1.5) ** 2; } mono("riser.wav", svf(a, (t) => 400 + 8000 * (t / 1.5) ** 2, 1)); }
// hum: monitor power-on (low hum + CRT whine)
mono("hum.wav", arr(1.2).map((_, i) => { const t = i / SR; return (Math.sin(TAU * 60 * t) * 0.5 + Math.sin(TAU * 120 * t) * 0.3 + Math.sin(TAU * 7800 * t) * 0.05) * Math.min(1, t / 0.05) * env(t, 0.05, 0.5); }));
// blip: tiny UI confirmation
mono("blip.wav", arr(0.1).map((_, i) => { const t = i / SR; return Math.sin(TAU * (t < 0.04 ? 1320 : 1760) * t) * env(t, 0.001, 0.03); }));
