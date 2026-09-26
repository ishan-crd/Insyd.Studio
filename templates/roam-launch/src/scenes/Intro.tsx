import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { theme } from "../theme";
import { Block, Slam, Rise, Sticker, Mark, clamp, useRamp, useSpringIn, useExit } from "../components/Kit";
import { Sfx, KeyTicks } from "../components/Sfx";
import { Editable, useCopy, edit, useClip } from "../insyd";

const SIZE = { label: "Size", min: 60, max: 420, step: 2, unit: "px" } as const;
const mono: React.CSSProperties = { fontFamily: theme.fonts.mono, textTransform: "uppercase", letterSpacing: "0.14em" };

// 0–4 s · the problem, one slam every two beats, the colour flipping under each word
export const SceneHook: React.FC = () => (
  <AbsoluteFill>
    <Editable id="hook.bg1" label="Colour block 1" display="fill" delay={0} trimOut={29}><Block color={theme.colors.blue} /></Editable>
    <Editable id="hook.bg2" label="Colour block 2" display="fill" delay={30} trimOut={29}><Block color={theme.colors.orange} /></Editable>
    <Editable id="hook.bg3" label="Colour block 3" display="fill" delay={60} trimOut={29}><Block color={theme.colors.pink} /></Editable>
    <Editable id="hook.bg4" label="Colour block 4" display="fill" delay={90} trimOut={29}><Block color={theme.colors.lime} /></Editable>
    <Editable id="hook.w1" label="Word 1" kind="text" delay={0} trimOut={29} style={{ position: "absolute", left: 40, top: 560, width: 1000, height: 800 }}>
      <Slam text={useCopy("hook.w1", "38 tabs\nopen.")} size={edit("hook.w1.size", 270, SIZE)} color={theme.colors.lime} />
    </Editable>
    <Editable id="hook.w2" label="Word 2" kind="text" delay={30} trimOut={29} style={{ position: "absolute", left: 40, top: 560, width: 1000, height: 800 }}>
      <Slam text={useCopy("hook.w2", "12 group\nchats.")} size={edit("hook.w2.size", 250, SIZE)} color={theme.colors.ink} />
    </Editable>
    <Editable id="hook.w3" label="Word 3" kind="text" delay={60} trimOut={29} style={{ position: "absolute", left: 40, top: 560, width: 1000, height: 800 }}>
      <Slam text={useCopy("hook.w3", "4 spread-\nsheets.")} size={edit("hook.w3.size", 250, SIZE)} color={theme.colors.blue} />
    </Editable>
    <Editable id="hook.w4" label="Word 4" kind="text" delay={90} trimOut={29} style={{ position: "absolute", left: 40, top: 560, width: 1000, height: 800 }}>
      <Slam text={useCopy("hook.w4", "0 trips\nbooked.")} size={edit("hook.w4.size", 270, SIZE)} color={theme.colors.ink} />
    </Editable>
    <Editable id="hook.label" label="Kicker" kind="text" delay={0} trimOut={119} style={{ position: "absolute", left: 0, top: 190, width: 1080, height: 60 }}>
      <Kicker text={useCopy("hook.label", "Planning a trip in 2026")} />
    </Editable>
    <Sfx id="hook.sfx.s1" name="slam" at={0} volume={0.7} lead={0} />
    <Sfx id="hook.sfx.s2" name="slam" at={30} volume={0.7} />
    <Sfx id="hook.sfx.s3" name="slam" at={60} volume={0.7} />
    <Sfx id="hook.sfx.s4" name="slam" at={90} volume={0.8} />
    <Sfx id="hook.sfx.w2" name="whip" at={29} volume={0.35} lead={2} />
    <Sfx id="hook.sfx.w3" name="whip" at={59} volume={0.35} lead={2} />
    <Sfx id="hook.sfx.w4" name="whip" at={89} volume={0.35} lead={2} />
  </AbsoluteFill>
);

/** a mono kicker between two rules, the colour flipping to stay readable on every block */
const Kicker: React.FC<{ text: string }> = ({ text }) => {
  const { frame } = useClip();
  const color = [theme.colors.lime, theme.colors.ink, theme.colors.blue, theme.colors.ink][Math.min(3, Math.floor(frame / 30))];
  const p = useRamp(0, 14);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 22, color, fontSize: 30, ...mono }}>
      <i style={{ width: 90 * p, height: 3, background: color }} />
      <span style={{ opacity: p }}>{text}</span>
      <i style={{ width: 90 * p, height: 3, background: color }} />
    </AbsoluteFill>
  );
};

// 4–7 s · "What if planning took one sentence?", the serif words underlined by hand
const Scribble: React.FC<{ color: string }> = ({ color }) => {
  const p = useRamp(0, 14, theme.ease.inOut);
  const out = useExit(6);
  return (
    <svg viewBox="0 0 700 60" width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: "visible", opacity: 1 - out }}>
      <path d="M8 38 C 120 18, 260 50, 380 30 S 600 18, 692 36" fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
    </svg>
  );
};
export const SceneQuestion: React.FC = () => {
  const display: React.CSSProperties = { fontFamily: theme.fonts.display, textTransform: "uppercase", color: theme.colors.ink, lineHeight: 0.95, letterSpacing: "-0.01em" };
  return (
    <AbsoluteFill>
      <Editable id="q.bg" label="Background" display="fill" delay={0} trimOut={89}><Block color={theme.colors.cream} enter="wipe-up" /></Editable>
      <Editable id="q.l1" label="Line 1" kind="text" delay={4} trimOut={85} style={{ position: "absolute", left: 90, top: 470, width: 900, height: 250 }}>
        <Rise style={{ ...display, fontSize: edit("q.l1.size", 230, SIZE) }}>{useCopy("q.l1", "What if")}</Rise>
      </Editable>
      <Editable id="q.l2" label="Line 2" kind="text" delay={9} trimOut={80} style={{ position: "absolute", left: 90, top: 700, width: 900, height: 250 }}>
        <Rise style={{ ...display, fontSize: edit("q.l2.size", 230, SIZE) }}>{useCopy("q.l2", "planning")}</Rise>
      </Editable>
      <Editable id="q.l3" label="Line 3" kind="text" delay={14} trimOut={75} style={{ position: "absolute", left: 90, top: 930, width: 900, height: 250 }}>
        <Rise style={{ ...display, fontSize: edit("q.l3.size", 230, SIZE) }}>{useCopy("q.l3", "took")}</Rise>
      </Editable>
      <Editable id="q.l4" label="Serif line" kind="text" delay={30} trimOut={59} style={{ position: "absolute", left: 80, top: 1150, width: 940, height: 240 }}>
        <Rise style={{ fontFamily: theme.fonts.serif, fontStyle: "italic", color: theme.colors.orange, fontSize: edit("q.l4.size", 190, SIZE), lineHeight: 1.05, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{useCopy("q.l4", "one sentence?")}</Rise>
      </Editable>
      <Editable id="q.scribble" label="Scribble underline" delay={44} trimOut={45} style={{ position: "absolute", left: 90, top: 1370, width: 880, height: 70 }}>
        <Scribble color={theme.colors.ink} />
      </Editable>
      <Sfx id="q.sfx.wipe" name="swoosh" at={0} volume={0.45} lead={2} />
      <Sfx id="q.sfx.l1" name="tap" at={4} volume={0.3} />
      <Sfx id="q.sfx.l2" name="tap" at={9} volume={0.3} />
      <Sfx id="q.sfx.l3" name="tap" at={14} volume={0.3} />
      <Sfx id="q.sfx.serif" name="shimmer" at={30} volume={0.4} />
      <Sfx id="q.sfx.scribble" name="scribble" at={44} volume={0.5} />
    </AbsoluteFill>
  );
};

// 7–10 s · the ask, typed into the app; send is pressed on the downbeat before the drop
const Phone: React.FC = () => {
  const s = useSpringIn(0, theme.spring.smooth);
  const out = useExit(6);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - s) * 1400 + out * -60}px) rotate(${(1 - s) * 8}deg)`, opacity: 1 - out }}>
      <div style={{ position: "absolute", inset: 0, background: theme.colors.cream, borderRadius: 96, border: `10px solid ${theme.colors.ink}`, boxShadow: `22px 22px 0 ${theme.colors.lime}` }} />
      <div style={{ position: "absolute", left: "50%", top: 30, width: 230, height: 62, marginLeft: -115, borderRadius: 40, background: theme.colors.ink }} />
      <div style={{ position: "absolute", left: 70, right: 70, top: 150, display: "flex", alignItems: "center", gap: 18 }}>
        <Mark size={62} color={theme.colors.ink} fill={theme.colors.lime} />
        <span style={{ fontFamily: theme.fonts.display, fontSize: 56, textTransform: "uppercase", color: theme.colors.ink }}>Roam</span>
        <span style={{ marginLeft: "auto", width: 62, height: 62, borderRadius: 31, background: theme.colors.pink, border: `5px solid ${theme.colors.ink}` }} />
      </div>
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 70, height: 110, borderRadius: 55, border: `5px solid ${theme.colors.ink}`, background: theme.colors.white }} />
    </div>
  );
};
const Typed: React.FC<{ text: string; cps: number }> = ({ text, cps }) => {
  const { frame } = useClip();
  const n = Math.max(0, Math.floor(frame * cps));
  const caret = frame % 16 < 9 || n < text.length;
  return (
    <div style={{ fontFamily: theme.fonts.body, fontWeight: 600, fontSize: 70, lineHeight: 1.12, letterSpacing: "-0.025em", color: theme.colors.ink }}>
      {text.slice(0, n)}<span style={{ display: "inline-block", width: 7, height: 70, marginLeft: 4, verticalAlign: -10, background: theme.colors.orange, opacity: caret ? 1 : 0 }} />
    </div>
  );
};
const Send: React.FC<{ press: number }> = ({ press }) => {
  const s = useSpringIn(0, theme.spring.pop);
  const { frame } = useClip();
  const down = frame >= press && frame < press + 5;
  const ring = interpolate(frame, [press, press + 14], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {frame >= press && <div style={{ position: "absolute", width: 110, height: 110, borderRadius: "50%", border: `6px solid ${theme.colors.orange}`, transform: `scale(${1 + ring * 1.4})`, opacity: 1 - ring }} />}
      <div style={{ width: 110, height: 110, borderRadius: "50%", background: theme.colors.orange, border: `6px solid ${theme.colors.ink}`, display: "grid", placeItems: "center", transform: `scale(${s * (down ? 0.86 : 1)})` }}>
        <svg width="50" height="50" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" stroke={theme.colors.ink} strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
    </AbsoluteFill>
  );
};
/** after send: a pill that says it's working, three dots bouncing on the beat */
const Thinking: React.FC<{ text: string }> = ({ text }) => {
  const s = useSpringIn(0, theme.spring.pop);
  const { frame } = useClip();
  return (
    <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, background: theme.colors.ink, color: theme.colors.lime, borderRadius: 999, padding: "22px 34px", fontFamily: theme.fonts.body, fontWeight: 700, fontSize: 42, letterSpacing: "-0.02em", transform: `scale(${s})`, transformOrigin: "0 50%", whiteSpace: "nowrap" }}>
        {text}
        <span style={{ display: "flex", gap: 8 }}>{[0, 1, 2].map((i) => <i key={i} style={{ width: 12, height: 12, borderRadius: 6, background: theme.colors.lime, transform: `translateY(${-Math.max(0, Math.sin(((frame - i * 4) / 15) * Math.PI)) * 12}px)` }} />)}</span>
      </div>
    </AbsoluteFill>
  );
};
export const ScenePrompt: React.FC = () => (
  <AbsoluteFill>
    <Editable id="prompt.bg" label="Background" display="fill" delay={0} trimOut={89}><Block color={theme.colors.blue} /></Editable>
    <Editable id="prompt.phone" label="Phone" delay={0} trimOut={89} style={{ position: "absolute", left: 110, top: 300, width: 860, height: 1320 }}><Phone /></Editable>
    <Editable id="prompt.hi" label="Greeting" kind="text" delay={8} trimOut={81} style={{ position: "absolute", left: 180, top: 560, width: 720, height: 90 }}>
      <Rise style={{ fontFamily: theme.fonts.serif, fontStyle: "italic", fontSize: edit("prompt.hi.size", 84, SIZE), color: theme.colors.ink, whiteSpace: "nowrap", lineHeight: 1 }}>{useCopy("prompt.hi", "Where to, Maya?")}</Rise>
    </Editable>
    <Editable id="prompt.ask" label="The ask (typed)" kind="text" delay={16} trimOut={73} style={{ position: "absolute", left: 180, top: 700, width: 720, height: 560 }}>
      <Typed text={useCopy("prompt.ask", "4 days in Lisbon. Under $900. Great food, zero museums.")} cps={edit("prompt.ask.cps", 1.05, { label: "Letters per frame", min: 0.3, max: 4, step: 0.05 })} />
    </Editable>
    <Editable id="prompt.send" label="Send button" delay={10} trimOut={79} style={{ position: "absolute", left: 800, top: 1432, width: 130, height: 130 }}>
      <Send press={edit("prompt.send.press", 66, { label: "Press at (frame)", min: 0, max: 80, step: 1, unit: "f" })} />
    </Editable>
    <Editable id="prompt.thinking" label="Planning pill" kind="text" delay={70} trimOut={19} style={{ position: "absolute", left: 180, top: 1250, width: 720, height: 120 }}>
      <Thinking text={useCopy("prompt.thinking", "Planning your trip")} />
    </Editable>
    <Sfx id="prompt.sfx.in" name="swoosh" at={0} volume={0.5} lead={0} />
    <KeyTicks id="prompt.sfx.keys" from={16} count={26} every={2} volume={0.2} />
    <Sfx id="prompt.sfx.send" name="tap" at={76} volume={0.7} />
    <Sfx id="prompt.sfx.thinking" name="pop" at={70} volume={0.45} />
    <Sfx id="prompt.sfx.riser" name="riser" at={30} volume={0.4} lead={0} />
  </AbsoluteFill>
);

// 10–12 s · the drop: an orange iris, the mark spins in, ROAM lands letter by letter
const Letters: React.FC<{ text: string; size: number; color: string; every: number }> = ({ text, size, color, every }) => {
  const { frame } = useClip();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "row" }}>
      {text.split("").map((ch, i) => <Letter key={i} ch={ch} at={i * every} size={size} color={color} frame={frame} />)}
    </AbsoluteFill>
  );
};
const Letter: React.FC<{ ch: string; at: number; size: number; color: string; frame: number }> = ({ ch, at, size, color, frame }) => {
  const s = useSpringIn(at, theme.spring.slam);
  if (frame < at) return <span style={{ fontFamily: theme.fonts.display, fontSize: size, visibility: "hidden" }}>{ch}</span>;
  return <span style={{ display: "inline-block", fontFamily: theme.fonts.display, fontSize: size, lineHeight: 1, color, transform: `translateY(${(1 - s) * -220}px) scale(${1.3 - 0.3 * s})`, filter: s < 0.97 ? `blur(${(1 - s) * 10}px)` : undefined }}>{ch}</span>;
};
const SpinMark: React.FC<{ size: number }> = ({ size }) => {
  const s = useSpringIn(0, theme.spring.pop);
  const { frame } = useClip();
  return <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}><div style={{ transform: `scale(${s})` }}><Mark size={size} color={theme.colors.ink} fill={theme.colors.lime} spin={(1 - s) * -180 + frame * 1.5} /></div></AbsoluteFill>;
};
export const SceneLogo: React.FC = () => (
  <AbsoluteFill>
    <Editable id="logo.bg" label="Background" display="fill" delay={0} trimOut={59}><Block color={theme.colors.orange} enter="iris" /></Editable>
    <Editable id="logo.mark" label="Mark" delay={2} trimOut={57} style={{ position: "absolute", left: 390, top: 430, width: 300, height: 300 }}>
      <SpinMark size={edit("logo.mark.size", 300, { label: "Size", min: 100, max: 600, step: 2, unit: "px" })} />
    </Editable>
    <Editable id="logo.word" label="Wordmark" kind="text" delay={6} trimOut={53} style={{ position: "absolute", left: 40, top: 780, width: 1000, height: 460 }}>
      <Letters text={useCopy("logo.word", "ROAM")} size={edit("logo.word.size", 400, SIZE)} color={theme.colors.cream} every={edit("logo.word.every", 3, { label: "Frames between letters", min: 0, max: 10, step: 1, unit: "f" })} />
    </Editable>
    <Editable id="logo.sticker" label="Sticker" kind="text" delay={22} trimOut={37} style={{ position: "absolute", left: 190, top: 1290, width: 700, height: 150 }}>
      <Sticker bg={theme.colors.lime} color={theme.colors.ink} size={56} angle={-5}>{useCopy("logo.sticker", "your AI trip planner")}</Sticker>
    </Editable>
    <Sfx id="logo.sfx.hit" name="hit" at={0} volume={0.9} lead={0} />
    <Sfx id="logo.sfx.letters" name="slam" at={6} volume={0.45} />
    <Sfx id="logo.sfx.sticker" name="pop" at={22} volume={0.6} />
  </AbsoluteFill>
);
