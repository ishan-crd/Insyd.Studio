import React from "react";
import { AbsoluteFill } from "remotion";
import { theme } from "../theme";
import { Block, Slam, Rise, Sticker, Mark, useRamp, useSpringIn } from "../components/Kit";
import { Sfx } from "../components/Sfx";
import { Editable, useCopy, edit, useClip } from "../insyd";

const SIZE = { label: "Size", min: 40, max: 420, step: 2, unit: "px" } as const;
const mono: React.CSSProperties = { fontFamily: theme.fonts.mono, textTransform: "uppercase", letterSpacing: "0.14em" };

// ---------------------------------------------------------------- 26–30 s · anywhere
/** one city: its own colour block and a slammed name, on its beat */
const City: React.FC<{ name: string; bg: string; fg: string; size: number; n: number }> = ({ name, bg, fg, size, n }) => (
  <>
    <Block color={bg} />
    <div style={{ position: "absolute", left: 70, top: 200, ...mono, fontSize: 30, color: fg }}>{String(n).padStart(2, "0")} / 08</div>
    <Slam text={name} size={size} color={fg} shake={12} />
  </>
);
export const SceneMontage: React.FC = () => {
  const size = edit("cities.size", 210, SIZE);
  const C = theme.colors;
  return (
    <AbsoluteFill>
      <Editable id="cities.c1" label="City 1" kind="text" display="fill" delay={0} trimOut={14}><City n={1} name={useCopy("cities.c1", "Tokyo.")} bg={C.ink} fg={C.lime} size={size} /></Editable>
      <Editable id="cities.c2" label="City 2" kind="text" display="fill" delay={15} trimOut={14}><City n={2} name={useCopy("cities.c2", "Mexico\nCity.")} bg={C.orange} fg={C.ink} size={size} /></Editable>
      <Editable id="cities.c3" label="City 3" kind="text" display="fill" delay={30} trimOut={14}><City n={3} name={useCopy("cities.c3", "Seoul.")} bg={C.blue} fg={C.pink} size={size} /></Editable>
      <Editable id="cities.c4" label="City 4" kind="text" display="fill" delay={45} trimOut={14}><City n={4} name={useCopy("cities.c4", "Marra-\nkech.")} bg={C.lime} fg={C.blue} size={size} /></Editable>
      <Editable id="cities.c5" label="City 5" kind="text" display="fill" delay={60} trimOut={14}><City n={5} name={useCopy("cities.c5", "Oslo.")} bg={C.pink} fg={C.ink} size={size} /></Editable>
      <Editable id="cities.c6" label="City 6" kind="text" display="fill" delay={75} trimOut={14}><City n={6} name={useCopy("cities.c6", "Bali.")} bg={C.ink} fg={C.orange} size={size} /></Editable>
      <Editable id="cities.c7" label="City 7" kind="text" display="fill" delay={90} trimOut={14}><City n={7} name={useCopy("cities.c7", "Lagos.")} bg={C.cream} fg={C.blue} size={size} /></Editable>
      <Editable id="cities.c8" label="City 8" kind="text" display="fill" delay={105} trimOut={14}><City n={8} name={useCopy("cities.c8", "Any-\nwhere.")} bg={C.orange} fg={C.cream} size={size} /></Editable>
      <Sfx id="cities.sfx.1" name="whip" at={0} volume={0.35} lead={2} />
      <Sfx id="cities.sfx.2" name="whip" at={15} volume={0.35} lead={2} />
      <Sfx id="cities.sfx.3" name="whip" at={30} volume={0.35} lead={2} />
      <Sfx id="cities.sfx.4" name="whip" at={45} volume={0.35} lead={2} />
      <Sfx id="cities.sfx.5" name="whip" at={60} volume={0.35} lead={2} />
      <Sfx id="cities.sfx.6" name="whip" at={75} volume={0.35} lead={2} />
      <Sfx id="cities.sfx.7" name="whip" at={90} volume={0.35} lead={2} />
      <Sfx id="cities.sfx.8" name="slam" at={105} volume={0.6} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 30–35 s · end card
const Lockup: React.FC<{ word: string; size: number }> = ({ word, size }) => {
  const s = useSpringIn(0, theme.spring.slam);
  const { frame } = useClip();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "row", gap: size * 0.12, transform: `scale(${1.5 - 0.5 * s})`, filter: s < 0.97 ? `blur(${(1 - s) * 12}px)` : undefined, opacity: Math.min(1, s * 2) }}>
      <Mark size={size * 0.78} color={theme.colors.ink} fill={theme.colors.lime} spin={frame * 0.6} />
      <span style={{ fontFamily: theme.fonts.display, fontSize: size, lineHeight: 1, color: theme.colors.ink, textTransform: "uppercase" }}>{word}</span>
    </AbsoluteFill>
  );
};
const Cta: React.FC<{ text: string; url: string }> = ({ text, url }) => {
  const s = useSpringIn(0, theme.spring.pop);
  const { frame } = useClip();
  const nudge = Math.max(0, Math.sin(((frame - 20) / 30) * Math.PI * 2)) * 10;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22, background: theme.colors.ink, color: theme.colors.lime, border: `6px solid ${theme.colors.ink}`, boxShadow: `12px 12px 0 ${theme.colors.orange}`, borderRadius: 999, padding: "30px 46px", fontFamily: theme.fonts.body, fontWeight: 800, fontSize: 50, letterSpacing: "-0.03em", transform: `scale(${s})`, whiteSpace: "nowrap" }}>
        {text}<span style={{ display: "inline-block", transform: `translateX(${nudge}px)` }}>→</span><span style={{ color: theme.colors.cream, fontWeight: 600 }}>{url}</span>
      </div>
    </AbsoluteFill>
  );
};
export const SceneEnd: React.FC = () => (
  <AbsoluteFill>
    <Editable id="end.bg" label="Background" display="fill" delay={0} trimOut={149}><Block color={theme.colors.cream} /></Editable>
    <Editable id="end.lockup" label="Logo lockup" kind="text" copyId="end.word" delay={0} trimOut={149} style={{ position: "absolute", left: 40, top: 430, width: 1000, height: 340 }}>
      <Lockup word={useCopy("end.word", "Roam")} size={edit("end.lockup.size", 250, SIZE)} />
    </Editable>
    <Editable id="end.l1" label="Line 1" kind="text" delay={20} trimOut={129} style={{ position: "absolute", left: 90, top: 860, width: 900, height: 170 }}>
      <Rise style={{ fontFamily: theme.fonts.display, textTransform: "uppercase", fontSize: edit("end.l1.size", 150, SIZE), lineHeight: 1, color: theme.colors.ink, textAlign: "center" }}>{useCopy("end.l1", "Plan less.")}</Rise>
    </Editable>
    <Editable id="end.l2" label="Line 2 (serif)" kind="text" delay={30} trimOut={119} style={{ position: "absolute", left: 90, top: 1020, width: 900, height: 190 }}>
      <Rise style={{ fontFamily: theme.fonts.serif, fontStyle: "italic", fontSize: edit("end.l2.size", 170, SIZE), lineHeight: 1, color: theme.colors.orange, textAlign: "center", letterSpacing: "-0.02em" }}>{useCopy("end.l2", "Go more.")}</Rise>
    </Editable>
    <Editable id="end.cta" label="Call to action" kind="text" copyId="end.cta.text" delay={48} trimOut={101} style={{ position: "absolute", left: 40, top: 1300, width: 1000, height: 180 }}>
      <Cta text={useCopy("end.cta.text", "Join the waitlist")} url={useCopy("end.cta.url", "roam.travel")} />
    </Editable>
    <Editable id="end.meta" label="Small print" kind="text" delay={60} trimOut={89} style={{ position: "absolute", left: 90, top: 1560, width: 900, height: 60 }}>
      <Fade><div style={{ ...mono, fontSize: 28, color: theme.colors.ink, textAlign: "center", opacity: 0.7 }}>{useCopy("end.meta", "iOS + Android · Spring 2026")}</div></Fade>
    </Editable>
    <Editable id="end.sticker" label="Sticker" kind="text" delay={72} trimOut={77} style={{ position: "absolute", left: 750, top: 190, width: 260, height: 260 }}>
      <Sticker bg={theme.colors.pink} color={theme.colors.ink} size={56} angle={12} round><span style={{ textAlign: "center", lineHeight: 0.95 }}>{useCopy("end.sticker", "Free\nbeta").split("\n").map((l, i) => <div key={i}>{l}</div>)}</span></Sticker>
    </Editable>
    <Sfx id="end.sfx.hit" name="hit" at={0} volume={1} lead={0} />
    <Sfx id="end.sfx.l1" name="tap" at={20} volume={0.35} />
    <Sfx id="end.sfx.l2" name="shimmer" at={30} volume={0.4} />
    <Sfx id="end.sfx.cta" name="pop" at={48} volume={0.6} />
    <Sfx id="end.sfx.sticker" name="pop" at={72} volume={0.5} />
  </AbsoluteFill>
);

const Fade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const p = useRamp(0, 12);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>{children}</div>;
};
