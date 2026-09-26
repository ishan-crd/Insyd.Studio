import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { Paper } from "../components/Layers";
import { Phone } from "../components/Phone";
import { AppScreen, Fidelity } from "../components/AppScreen";
import { FigmaCard } from "../components/FigmaCard";
import { Card, CardHeader, UserPrompt, ToolLine, AssistantLine } from "../components/Card";
import { Sfx, KeyTicks } from "../components/Sfx";
import { Ripple, TapThumb } from "../components/Tap";
import { IconArrow } from "../components/Icons";
import { useSpring, useExit, clamp } from "../components/motion";
import { Editable, useCopy, edit, useAnim } from "../insyd";

export const FIGMA_LEN = 342;
// Beat-aligned: screenshot on bar 2, describe on beat 5, each edit lands on a beat, verify on bar 4, reply on bar 5.
const T = {
  wipe: 0, figma: 8, phone: 14, card: 20, prompt: 32,
  shot: 64, shotDone: 80, describe: 80, describeDone: 96, found: 96,
  editColor: 112, editRadius: 128, editSpacing: 144, editType: 160, editButton: 176,
  verify: 192, verifyDone: 208, tap: 224, reply: 256,
};
const CARD_X = 120, CARD_W = 600, FIG_X = 760, FIG_W = 580, FIG_H = 640, TOP = 220;
const PHONE_W = 350, PHONE_X = 1400, PHONE_TOP = (1080 - PHONE_W * 2.165) / 2;
const BTN_Y = PHONE_TOP + PHONE_W * 2.165 - PHONE_W * 0.035 - 40 * (PHONE_W / 360) - 28 * (PHONE_W / 360);

const EDITS: Array<{ at: number; key: keyof Fidelity; label: string; from: string; to: string }> = [
  { at: T.editColor, key: "color", label: "primary", from: "#3B82F6", to: "#E9573F" },
  { at: T.editRadius, key: "radius", label: "radius", from: "6", to: "22" },
  { at: T.editSpacing, key: "spacing", label: "spacing", from: "10", to: "20" },
  { at: T.editType, key: "type", label: "title", from: "Medium 24", to: "Bold 30" },
  { at: T.editButton, key: "button", label: "cta", from: "8 · 62%", to: "pill · full" },
];

const EditRow: React.FC<{ e: (typeof EDITS)[number] }> = ({ e }) => {
  const p = useSpring(e.at, theme.spring.snappy);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: theme.fonts.mono, fontSize: 21, opacity: p, transform: `translateX(${interpolate(p, [0, 1], [-14, 0])}px)` }}>
      <span style={{ color: theme.colors.inkDim, width: 96 }}>{e.label}</span>
      <span style={{ color: theme.colors.inkFaint, textDecoration: "line-through" }}>{e.from}</span>
      <IconArrow size={18} color={theme.colors.inkFaint} />
      <span style={{ color: theme.colors.ink, fontWeight: 600, background: "#FFE9E2", padding: "2px 8px", borderRadius: 6 }}>{e.to}</span>
    </div>
  );
};

export const SceneFigma: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames: dur } = useVideoConfig();
  const ex = useExit(12);
  const prompt = useCopy("figma.prompt", "Make the app match the Figma design");
  const panelColor = edit("figma.panel.color", "#E9573F", { label: "Color", group: "Panel" });
  const wipeLen = edit("figma.panel.wipe", 16, { label: "Wipe frames", min: 4, max: 40, step: 1, unit: "f", group: "Panel" });
  const wipe = interpolate(frame, [T.wipe, T.wipe + wipeLen], [0, 1], { easing: theme.ease.inOut, ...clamp });
  const figIn = useAnim("figma.window.in", { delay: 8, preset: "smooth", from: { y: 900 } });
  const phoneIn = useAnim("figma.phone.in", { delay: 14, preset: "smooth", from: { y: 1000 } });
  const cardIn = useAnim("figma.claude.in", { delay: 20, preset: "smooth", from: { x: -900 } });
  const f: Fidelity = {
    color: useSpring(T.editColor + 2, theme.spring.smooth),
    radius: useSpring(T.editRadius + 2, theme.spring.smooth),
    spacing: useSpring(T.editSpacing + 2, theme.spring.smooth),
    type: useSpring(T.editType + 2, theme.spring.smooth),
    button: useSpring(T.editButton + 2, theme.spring.smooth),
  };
  const pressed = interpolate(frame, [T.tap - 2, T.tap + 1, T.tap + 8], [0, 1, 0], clamp);
  // a soft flash on the phone when the screenshot tools fire
  const flash = Math.max(
    interpolate(frame, [T.shot, T.shot + 3, T.shot + 14], [0, 0.55, 0], clamp),
    interpolate(frame, [T.verify, T.verify + 3, T.verify + 14], [0, 0.55, 0], clamp),
  );
  return (
    <AbsoluteFill>
      <Paper />
      {/* coral panel wipes in from the left, full bleed */}
      <div style={{ position: "absolute", inset: 0, background: panelColor, transform: `scaleX(${wipe})`, transformOrigin: "0% 50%" }} />
      <AbsoluteFill style={{ opacity: ex.opacity, transform: `translateY(${ex.y}px)` }}>
        {/* Claude card */}
        <div style={{ position: "absolute", left: CARD_X, top: TOP, transform: `translateX(${cardIn.x}px)` }}>
          <Editable id="figma.claude" label="Claude Code card">
          <Card width={CARD_W} pad={28} style={{ height: FIG_H, display: "flex", flexDirection: "column" }}>
            <CardHeader title="Claude Code  ·  thumb-mcp" />
            <Editable id="figma.prompt" label="Prompt" kind="text" display="block"><UserPrompt text={prompt} start={T.prompt} size={25} cpf={1.15} /></Editable>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 22, paddingLeft: 0 }}>
              <ToolLine call="screenshot()" start={T.shot} doneAt={T.shotDone} size={20} />
              <ToolLine call="describe_screen()" start={T.describe} doneAt={T.describeDone} result="5 diffs" size={20} />
            </div>
            <div style={{ marginTop: 18 }}>
              <AssistantLine text="Fixing the theme to match:" start={T.found} size={22} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 14, paddingLeft: 34 }}>
              {EDITS.map((e) => <EditRow key={e.key} e={e} />)}
            </div>
            <div style={{ marginTop: 16 }}>
              <ToolLine call="screenshot()" start={T.verify} doneAt={T.verifyDone} result="matches" size={20} />
            </div>
            <div style={{ marginTop: "auto" }}>
              <AssistantLine text="Done — pixel-matched to the design." start={T.reply} size={22} />
            </div>
          </Card>
          </Editable>
        </div>
        {/* Figma window */}
        <div style={{ position: "absolute", left: FIG_X, top: TOP, transform: `translateY(${figIn.y}px)` }}>
          <Editable id="figma.window" x={-0.6} label="Figma window"><FigmaCard width={FIG_W} height={FIG_H} /></Editable>
        </div>
        {/* the phone */}
        <div style={{ position: "absolute", left: PHONE_X, top: PHONE_TOP, transform: `translateY(${phoneIn.y}px)` }}>
          <Editable id="figma.phone" delay={1} label="iPhone" kind="image">
          <Phone width={PHONE_W}>
            <AppScreen width={PHONE_W} f={f} pressed={pressed} />
            <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash, pointerEvents: "none" }} />
          </Phone>
          </Editable>
        </div>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <TapThumb x={PHONE_X + PHONE_W / 2} y={BTN_Y} at={T.tap} cell={7} containerHeight={1080} />
          <Ripple x={PHONE_X + PHONE_W / 2} y={BTN_Y} at={T.tap} color="#fff" size={150} />
        </div>
      </AbsoluteFill>
      <Sfx id="figma.sfx1" name="whoosh" at={T.wipe} volume={0.35} />
      <Sfx id="figma.sfx2" name="thump" at={T.wipe + 6} volume={0.85} />
      <Sfx id="figma.sfx3" name="whoosh" at={T.figma} volume={0.35} />
      <Sfx id="figma.sfx4" name="whoosh" at={T.phone} volume={0.35} />
      <KeyTicks id="figma.sfx5" volume={0.22} from={T.prompt} count={16} every={2} />
      <Sfx id="figma.sfx6" shift={-1} name="pop-soft" at={T.shot} volume={0.5} />
      <Sfx id="figma.sfx7" name="click" at={T.shot + 1} volume={0.8} />
      <Sfx id="figma.sfx8" name="pop-soft" at={T.describe} volume={0.5} />
      <Sfx id="figma.sfx9" name="pop" at={T.found} volume={0.7} />
      {EDITS.map((e) => <Sfx id={`figma.sfx10.${e.key}`} key={e.key} name="pop" at={e.at + 2} volume={0.7} />)}
      <Sfx id="figma.sfx11" name="click" at={T.verify + 1} volume={0.8} />
      <Sfx id="figma.sfx12" name="click" at={T.tap} volume={0.8} />
      <Sfx id="figma.sfx13" name="chime" at={T.reply} volume={0.7} />
      <Sfx id="figma.sfx14" name="whoosh" at={dur - 14} volume={0.35} />
    </AbsoluteFill>
  );
};
