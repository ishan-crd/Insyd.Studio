import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { theme } from "../theme";
import { Orb } from "../components/Props";
import { InspectorCard, SoundCard, BrandCard, TimingCard, ExportCard, ClaudeCard } from "../components/StudioUI";
import { TextClip, useExit } from "../components/Elements";
import { Sfx } from "../components/Sfx";
import { clamp, breathe } from "../components/motion";
import { Editable, useCopy, useAnimSpec, edit, useClip } from "../insyd";

// 37–44 s · the orb at the centre of a constellation of Studio panels. The constellation is one
// clip that carries the camera: an overview, then a flight panel to panel every `hold` frames.
// Each panel and each caption is its own clip nested inside it.
const POS: Array<[number, number]> = [[0, -430], [-640, -230], [640, -210], [-660, 270], [660, 290], [0, 470]];

const Camera: React.FC<{ overview: number; hold: number; zoom: number; panels: React.ReactNode[]; orb: React.ReactNode }> = ({ overview, hold, zoom, panels, orb }) => {
  const { frame: f } = useClip();
  const keys = [{ t: 0, x: 0, y: 0, s: 0.55 }, { t: overview - 8, x: 0, y: 0, s: 0.62 }, ...POS.map(([x, y], i) => ({ t: overview + i * hold, x, y: y + 20, s: zoom }))];
  const T = keys.map((k) => k.t);
  const at = (fr: number, v: number[]) => interpolate(fr, T, v, { easing: theme.ease.inOut, ...clamp });
  const cam = { x: at(f, keys.map((k) => k.x)), y: at(f, keys.map((k) => k.y)), s: at(f, keys.map((k) => k.s)) };
  // bank the world a little in the direction of travel — reads as a 3D camera move
  const vx = at(f + 1, keys.map((k) => k.x)) - cam.x, vy = at(f + 1, keys.map((k) => k.y)) - cam.y;
  const bankY = Math.max(-14, Math.min(14, vx * 0.35)), bankX = Math.max(-10, Math.min(10, -vy * 0.35));
  const active = f < overview - 4 ? -1 : Math.min(POS.length - 1, Math.floor((f - overview + 10) / hold));
  const intro = interpolate(f, [0, 16], [0, 1], { easing: theme.ease.out, ...clamp });
  const out = useExit(14);
  const orbX = interpolate(f, T.map((t) => t + 6), keys.map((k) => (k.s > 1 ? k.x - 290 : 0)), { easing: theme.ease.inOut, ...clamp });
  const orbY = interpolate(f, T.map((t) => t + 6), keys.map((k) => (k.s > 1 ? k.y + 40 : 0)), { easing: theme.ease.inOut, ...clamp });
  return (
    <AbsoluteFill style={{ transform: `perspective(1600px) rotateY(${bankY}deg) rotateX(${bankX}deg)` }}>
      <AbsoluteFill style={{ transform: `translate(960px, 540px) scale(${cam.s}) translate(${-cam.x}px, ${-cam.y}px)`, transformOrigin: "0 0", opacity: intro * (1 - out), filter: out ? `blur(${out * 10}px)` : undefined }}>
        <svg style={{ position: "absolute", left: -2000, top: -2000, width: 4000, height: 4000, overflow: "visible" }}>
          {POS.map(([x, y], i) => { const g = interpolate(f, [4 + i * 3, 20 + i * 3], [0, 1], clamp); return <line key={i} x1={2000} y1={2000} x2={2000 + x * g} y2={2000 + y * g} stroke="rgba(220,200,255,0.18)" strokeWidth={1.5 / cam.s} />; })}
        </svg>
        {panels.map((panel, i) => {
          const on = i === active || active < 0;
          const cardIn = interpolate(f, [2 + i * 3, 18 + i * 3], [0, 1], { easing: theme.ease.out, ...clamp });
          return (
            <div key={i} style={{ position: "absolute", left: POS[i][0], top: POS[i][1], transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * cardIn})`, opacity: cardIn * (on ? 1 : 0.35), filter: on ? undefined : "blur(3px)", pointerEvents: "auto" }}>{panel}</div>
          );
        })}
        <div style={{ position: "absolute", left: orbX, top: orbY + breathe(f, 6, 40) }}>{orb}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const CAP: React.CSSProperties = { fontSize: 28, fontWeight: 500, whiteSpace: "nowrap" };
/** A caption sits above its panel; its clip decides when it shows. */
const Captioned: React.FC<{ caption: React.ReactNode; children: React.ReactNode }> = ({ caption, children }) => (
  <div style={{ position: "relative" }}>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: "100%", marginBottom: 18, display: "flex", justifyContent: "center" }}>{caption}</div>
    {children}
  </div>
);
const Progress: React.FC<{ children: (p: number) => React.ReactNode; len?: number }> = ({ children, len = 26 }) => {
  const { frame } = useClip();
  return <>{children(interpolate(frame, [0, len], [0, 1], clamp))}</>;
};

export const SceneNetwork: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, #101413, #020303 75%)", overflow: "hidden" }}>
    <Editable id="net.camera" label="Constellation (camera)" display="fill" delay={0} trimOut={209}>
      <Camera overview={edit("net.camera.overview", 36, { label: "Overview length", min: 0, max: 120, step: 1, unit: "f" })}
        hold={edit("net.camera.hold", 29, { label: "Frames per panel", min: 10, max: 90, step: 1, unit: "f" })}
        zoom={edit("net.camera.zoom", 2.05, { label: "Panel zoom", min: 1, max: 3, step: 0.05 })}
        orb={<Editable id="net.orb" label="Orb" delay={0} trimOut={209}><Orb size={edit("net.orb.size", 46, { label: "Size", min: 16, max: 160, step: 1, unit: "px" })} /></Editable>}
        panels={[
          <Captioned caption={<Editable id="net.claude.caption" label="Claude caption" kind="text" delay={30} trimOut={26}><TextClip text={useCopy("net.claude.caption", "Claude edits it live")} anim={useAnimSpec("net.claude.caption.in", { delay: 0, preset: "bezier", duration: 8, easing: "linear" })} outDur={5} seed={5} style={CAP} /></Editable>}>
            <Editable id="net.claude" label="Claude panel" delay={0} trimOut={209}><Progress>{(p) => <ClaudeCard progress={p} />}</Progress></Editable></Captioned>,
          <Captioned caption={<Editable id="net.inspector.caption" label="Inspector caption" kind="text" delay={59} trimOut={26}><TextClip text={useCopy("net.inspector.caption", "Every element, editable")} anim={useAnimSpec("net.inspector.caption.in", { delay: 0, preset: "bezier", duration: 8, easing: "linear" })} outDur={5} seed={6} style={CAP} /></Editable>}>
            <Editable id="net.inspector" label="Inspector panel" delay={0} trimOut={209}><InspectorCard /></Editable></Captioned>,
          <Captioned caption={<Editable id="net.sounds.caption" label="Sounds caption" kind="text" delay={88} trimOut={26}><TextClip text={useCopy("net.sounds.caption", "Every sound, on the timeline")} anim={useAnimSpec("net.sounds.caption.in", { delay: 0, preset: "bezier", duration: 8, easing: "linear" })} outDur={5} seed={7} style={CAP} /></Editable>}>
            <Editable id="net.sounds" label="Sounds panel" delay={0} trimOut={209}><SoundCard /></Editable></Captioned>,
          <Captioned caption={<Editable id="net.brand.caption" label="Brand caption" kind="text" delay={117} trimOut={26}><TextClip text={useCopy("net.brand.caption", "Your brand, everywhere")} anim={useAnimSpec("net.brand.caption.in", { delay: 0, preset: "bezier", duration: 8, easing: "linear" })} outDur={5} seed={8} style={CAP} /></Editable>}>
            <Editable id="net.brand" label="Brand panel" delay={0} trimOut={209}><BrandCard /></Editable></Captioned>,
          <Captioned caption={<Editable id="net.timing.caption" label="Timing caption" kind="text" delay={146} trimOut={26}><TextClip text={useCopy("net.timing.caption", "Speed & timing")} anim={useAnimSpec("net.timing.caption.in", { delay: 0, preset: "bezier", duration: 8, easing: "linear" })} outDur={5} seed={9} style={CAP} /></Editable>}>
            <Editable id="net.timing" label="Timing panel" delay={0} trimOut={209}><TimingCard /></Editable></Captioned>,
          <Captioned caption={<Editable id="net.export.caption" label="Export caption" kind="text" delay={175} trimOut={34}><TextClip text={useCopy("net.export.caption", "Export in 4K")} anim={useAnimSpec("net.export.caption.in", { delay: 0, preset: "bezier", duration: 8, easing: "linear" })} outDur={5} seed={10} style={CAP} /></Editable>}>
            <Editable id="net.export" label="Export panel" delay={0} trimOut={209}><Progress len={30}>{(p) => <ExportCard p={0.08 + 0.9 * p} />}</Progress></Editable></Captioned>,
        ]} />
    </Editable>
    <Sfx id="net.sfx.shimmer" name="shimmer" at={0} volume={0.4} />
    <Sfx id="net.claude.sfx" name="swish" at={26} volume={0.35} />
    <Sfx id="net.claude.sfx.decode" name="blip" at={30} volume={0.3} lead={0} />
    <Sfx id="net.inspector.sfx" name="swish" at={55} volume={0.35} />
    <Sfx id="net.inspector.sfx.decode" name="blip" at={59} volume={0.3} lead={0} />
    <Sfx id="net.sounds.sfx" name="swish" at={84} volume={0.35} />
    <Sfx id="net.sounds.sfx.decode" name="blip" at={88} volume={0.3} lead={0} />
    <Sfx id="net.brand.sfx" name="swish" at={113} volume={0.35} />
    <Sfx id="net.brand.sfx.decode" name="blip" at={117} volume={0.3} lead={0} />
    <Sfx id="net.timing.sfx" name="swish" at={142} volume={0.35} />
    <Sfx id="net.timing.sfx.decode" name="blip" at={146} volume={0.3} lead={0} />
    <Sfx id="net.export.sfx" name="swish" at={171} volume={0.35} />
    <Sfx id="net.export.sfx.decode" name="blip" at={175} volume={0.3} lead={0} />
    <Sfx id="net.sfx.out" name="glitch" at={198} volume={0.4} />
  </AbsoluteFill>
);
