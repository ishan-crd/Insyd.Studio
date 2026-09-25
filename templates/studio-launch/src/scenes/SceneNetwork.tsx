import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Orb } from "../components/Props";
import { InspectorCard, SoundCard, BrandCard, TimingCard, ExportCard, ClaudeCard } from "../components/StudioUI";
import { Decode } from "../components/Decode";
import { Sfx } from "../components/Sfx";
import { clamp, ramp, breathe } from "../components/motion";
import { Editable, useCopy } from "../insyd";

// 37–44 s · the orb at the centre of a constellation of Studio panels. The camera flies panel to
// panel on the beat; each gets its caption. World coordinates are centred on the orb.
type Stop = { x: number; y: number; caption: React.ReactNode; card: React.ReactNode };
const OVERVIEW = 36, HOLD = 29;
const CAP = { fontSize: 28, fontWeight: 500, whiteSpace: "nowrap" } as const;

export const SceneNetwork: React.FC = () => {
  const f = useCurrentFrame();
  const stops: Stop[] = [
    { x: 0, y: -430,
      caption: <Editable id="net.claude.caption" label="Claude panel caption" kind="text"><Decode text={useCopy("net.claude.caption", "Claude edits it live")} start={OVERVIEW + 0 * HOLD - 6} dur={8} out={OVERVIEW + 1 * HOLD - 8} outDur={5} seed={5} style={CAP} /></Editable>,
      card: <Editable id="net.claude" label="Claude panel"><ClaudeCard progress={ramp(f, OVERVIEW, OVERVIEW + 26, (x) => x)} /></Editable> },
    { x: -640, y: -230,
      caption: <Editable id="net.inspector.caption" label="Inspector panel caption" kind="text"><Decode text={useCopy("net.inspector.caption", "Every element, editable")} start={OVERVIEW + 1 * HOLD - 6} dur={8} out={OVERVIEW + 2 * HOLD - 8} outDur={5} seed={6} style={CAP} /></Editable>,
      card: <Editable id="net.inspector" label="Inspector panel"><InspectorCard /></Editable> },
    { x: 640, y: -210,
      caption: <Editable id="net.sounds.caption" label="Sounds panel caption" kind="text"><Decode text={useCopy("net.sounds.caption", "Every sound, on the timeline")} start={OVERVIEW + 2 * HOLD - 6} dur={8} out={OVERVIEW + 3 * HOLD - 8} outDur={5} seed={7} style={CAP} /></Editable>,
      card: <Editable id="net.sounds" label="Sounds panel"><SoundCard /></Editable> },
    { x: -660, y: 270,
      caption: <Editable id="net.brand.caption" label="Brand panel caption" kind="text"><Decode text={useCopy("net.brand.caption", "Your brand, everywhere")} start={OVERVIEW + 3 * HOLD - 6} dur={8} out={OVERVIEW + 4 * HOLD - 8} outDur={5} seed={8} style={CAP} /></Editable>,
      card: <Editable id="net.brand" label="Brand panel"><BrandCard /></Editable> },
    { x: 660, y: 290,
      caption: <Editable id="net.timing.caption" label="Timing panel caption" kind="text"><Decode text={useCopy("net.timing.caption", "Speed & timing")} start={OVERVIEW + 4 * HOLD - 6} dur={8} out={OVERVIEW + 5 * HOLD - 8} outDur={5} seed={9} style={CAP} /></Editable>,
      card: <Editable id="net.timing" label="Timing panel"><TimingCard /></Editable> },
    { x: 0, y: 470,
      caption: <Editable id="net.export.caption" label="Export panel caption" kind="text"><Decode text={useCopy("net.export.caption", "Export in 4K")} start={OVERVIEW + 5 * HOLD - 6} dur={8} out={OVERVIEW + 6 * HOLD - 8} outDur={5} seed={10} style={CAP} /></Editable>,
      card: <Editable id="net.export" label="Export panel"><ExportCard p={ramp(f, OVERVIEW + 5 * HOLD, 210, (x) => x) * 0.9 + 0.08} /></Editable> },
  ];
  // camera keyframes: overview, then each stop
  const keys = [{ t: 0, x: 0, y: 0, s: 0.55 }, { t: OVERVIEW - 8, x: 0, y: 0, s: 0.62 }, ...stops.map((st, i) => ({ t: OVERVIEW + i * HOLD, x: st.x, y: st.y + 20, s: 2.05 }))];
  const T = keys.map((k) => k.t);
  const cam = {
    x: interpolate(f, T, keys.map((k) => k.x), { easing: theme.ease.inOut, ...clamp }),
    y: interpolate(f, T, keys.map((k) => k.y), { easing: theme.ease.inOut, ...clamp }),
    s: interpolate(f, T, keys.map((k) => k.s), { easing: theme.ease.inOut, ...clamp }),
  };
  // bank the world a little in the direction of travel — reads as a 3D camera move
  const at = (fr: number, a: number[]) => interpolate(fr, T, a, { easing: theme.ease.inOut, ...clamp });
  const vx = at(f + 1, keys.map((k) => k.x)) - cam.x, vy = at(f + 1, keys.map((k) => k.y)) - cam.y;
  const bankY = Math.max(-14, Math.min(14, vx * 0.35)), bankX = Math.max(-10, Math.min(10, -vy * 0.35));
  const active = f < OVERVIEW - 4 ? -1 : Math.min(stops.length - 1, Math.floor((f - OVERVIEW + 10) / HOLD));
  const intro = ramp(f, 0, 16);
  const out = ramp(f, 196, 210, theme.ease.in);
  // the orb follows the camera's focus, slightly behind
  const orbX = interpolate(f, T.map((t) => t + 6), keys.map((k) => (k.s > 1 ? k.x - 290 : 0)), { easing: theme.ease.inOut, ...clamp });
  const orbY = interpolate(f, T.map((t) => t + 6), keys.map((k) => (k.s > 1 ? k.y + 40 : 0)), { easing: theme.ease.inOut, ...clamp });
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, #101413, #020303 75%)", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `perspective(1600px) rotateY(${bankY}deg) rotateX(${bankX}deg)` }}>
      <AbsoluteFill style={{ transform: `translate(960px, 540px) scale(${cam.s}) translate(${-cam.x}px, ${-cam.y}px)`, transformOrigin: "0 0", opacity: intro * (1 - out), filter: out ? `blur(${out * 10}px)` : undefined }}>
        <svg style={{ position: "absolute", left: -2000, top: -2000, width: 4000, height: 4000, overflow: "visible" }}>
          {stops.map((st, i) => {
            const grow = ramp(f, 4 + i * 3, 20 + i * 3);
            return <line key={i} x1={2000} y1={2000} x2={2000 + st.x * grow} y2={2000 + st.y * grow} stroke="rgba(220,200,255,0.18)" strokeWidth={1.5 / cam.s} />;
          })}
        </svg>
        {stops.map((st, i) => {
          const on = i === active;
          const cardIn = ramp(f, 2 + i * 3, 18 + i * 3);
          return (
            <div key={i} style={{ position: "absolute", left: st.x, top: st.y, transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * cardIn})`, opacity: cardIn * (on || active < 0 ? 1 : 0.35), filter: on || active < 0 ? undefined : "blur(3px)" }}>
              {on && <div style={{ position: "absolute", left: 0, right: 0, bottom: "100%", marginBottom: 18, display: "flex", justifyContent: "center" }}>{st.caption}</div>}
              {st.card}
            </div>
          );
        })}
        <div style={{ position: "absolute", left: orbX, top: orbY + breathe(f, 6, 40) }}><Editable id="net.orb" label="Orb"><Orb size={46} /></Editable></div>
      </AbsoluteFill>
      </AbsoluteFill>
      <Sfx id="net.sfx.shimmer" name="shimmer" at={0} volume={0.4} />
      <Sfx id="net.claude.sfx" name="swish" at={OVERVIEW + 0 * HOLD - 10} volume={0.35} />
      <Sfx id="net.claude.sfx.decode" name="blip" at={OVERVIEW + 0 * HOLD - 6} volume={0.3} lead={0} />
      <Sfx id="net.inspector.sfx" name="swish" at={OVERVIEW + 1 * HOLD - 10} volume={0.35} />
      <Sfx id="net.inspector.sfx.decode" name="blip" at={OVERVIEW + 1 * HOLD - 6} volume={0.3} lead={0} />
      <Sfx id="net.sounds.sfx" name="swish" at={OVERVIEW + 2 * HOLD - 10} volume={0.35} />
      <Sfx id="net.sounds.sfx.decode" name="blip" at={OVERVIEW + 2 * HOLD - 6} volume={0.3} lead={0} />
      <Sfx id="net.brand.sfx" name="swish" at={OVERVIEW + 3 * HOLD - 10} volume={0.35} />
      <Sfx id="net.brand.sfx.decode" name="blip" at={OVERVIEW + 3 * HOLD - 6} volume={0.3} lead={0} />
      <Sfx id="net.timing.sfx" name="swish" at={OVERVIEW + 4 * HOLD - 10} volume={0.35} />
      <Sfx id="net.timing.sfx.decode" name="blip" at={OVERVIEW + 4 * HOLD - 6} volume={0.3} lead={0} />
      <Sfx id="net.export.sfx" name="swish" at={OVERVIEW + 5 * HOLD - 10} volume={0.35} />
      <Sfx id="net.export.sfx.decode" name="blip" at={OVERVIEW + 5 * HOLD - 6} volume={0.3} lead={0} />
      <Sfx id="net.sfx.out" name="glitch" at={198} volume={0.4} />
    </AbsoluteFill>
  );
};
