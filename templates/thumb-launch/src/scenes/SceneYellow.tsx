import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { Paper } from "../components/Layers";
import { Phone } from "../components/Phone";
import { Pill } from "../components/Pill";
import { Sfx } from "../components/Sfx";
import { Ripple } from "../components/Tap";
import { IconWifi } from "../components/Icons";
import { useSpring, useExit, clamp } from "../components/motion";
import { Editable, useCopy, edit, useAnim, TimeScale } from "../insyd";

export const YELLOW_LEN = 150;
const PHONE_W = 350;
const PHONE_X = (1920 - PHONE_W) / 2, PHONE_TOP = (1080 - PHONE_W * 2.165) / 2;
// Beat-aligned at 1×: chips on beats 1, 3, 5, 7 (16f per beat). The scene then runs at SPEED× (see below).
const T = { phone: 0, c1: 16, tap1: 24, c2: 48, scroll: 52, c3: 80, ocr: 84, c4: 112, swap: 116 };

const ROWS = [
  ["Airplane Mode", "#F0912B"], ["Wi-Fi", "#2B7BF3"], ["Bluetooth", "#2B7BF3"], ["Cellular", "#3BB54A"], ["Personal Hotspot", "#3BB54A"],
  ["Battery", "#3BB54A"], ["VPN", "#2B7BF3"], ["General", "#8E8E93"], ["Accessibility", "#2B7BF3"], ["Camera", "#8E8E93"],
  ["Control Centre", "#8E8E93"], ["Display", "#2B7BF3"], ["Home Screen", "#4F5DD9"], ["Search", "#8E8E93"], ["Siri", "#1C1C1E"],
] as const;

const SettingsScreen: React.FC<{ width: number }> = ({ width }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = width / 360;
  const rowH = 46 * u;
  const scroll = interpolate(spring({ frame: frame - T.scroll, fps, config: theme.spring.smooth }), [0, 1], [0, -rowH * 5.2]);
  const swap = spring({ frame: frame - T.swap, fps, config: theme.spring.smooth });
  const hi = (name: string, at: number) =>
    interpolate(frame, [at, at + 3, at + 30, at + 40], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#F2F2F7", fontFamily: theme.fonts.body, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${-swap * width}px)` }}>
        <div style={{ padding: `${width * 0.17}px ${16 * u}px 0`, background: "#F2F2F7", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 30 * u, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 12 * u }}>Settings</div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: width * 0.17 + 56 * u, bottom: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 16 * u, right: 16 * u, top: 0, transform: `translateY(${scroll}px)` }}>
          <div style={{ background: "#fff", borderRadius: 12 * u, overflow: "hidden" }}>
            {ROWS.map(([name, color], i) => {
              const h = name === "Wi-Fi" ? hi(name, T.tap1) : name === "General" ? hi(name, T.scroll + 22) : 0;
              const ocr = interpolate(frame, [T.ocr + i * 1.2, T.ocr + i * 1.2 + 6], [0, 1], clamp) * interpolate(frame, [T.swap - 6, T.swap], [1, 0], clamp);
              return (
                <div key={name} style={{ position: "relative", height: rowH, display: "flex", alignItems: "center", gap: 12 * u, padding: `0 ${14 * u}px`, background: `rgba(43,107,243,${h * 0.14})`, borderBottom: "1px solid #E5E5EA" }}>
                  <div style={{ width: 28 * u, height: 28 * u, borderRadius: 7 * u, background: color }} />
                  <div style={{ fontSize: 16 * u, fontWeight: 500, flex: 1 }}>{name}</div>
                  <div style={{ width: 8 * u, height: 8 * u, borderTop: "2px solid #C7C7CC", borderRight: "2px solid #C7C7CC", transform: "rotate(45deg)" }} />
                  {/* describe_screen() overlay: coordinates + box */}
                  <div style={{ position: "absolute", left: 50 * u, top: 6 * u, bottom: 6 * u, width: 120 * u, border: `${1.6 * u}px dashed ${theme.colors.hero}`, borderRadius: 4 * u, opacity: ocr, transform: `scale(${interpolate(ocr, [0, 1], [0.9, 1])})` }} />
                  <div style={{ position: "absolute", right: 30 * u, fontFamily: theme.fonts.mono, fontSize: 10.5 * u, fontWeight: 600, color: "#fff", opacity: ocr, background: theme.colors.hero, padding: `${1.5 * u}px ${5 * u}px`, borderRadius: 4 * u, transform: `scale(${interpolate(ocr, [0, 1], [0.8, 1])})` }}>({Math.round(112 * u)}, {Math.round((178 + i * 46) )})</div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </div>
      {/* Wi-Fi page slides in after run_skill */}
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${(1 - swap) * width}px)`, background: "#F2F2F7", paddingTop: width * 0.17 }}>
        <div style={{ padding: `0 ${16 * u}px` }}>
          <div style={{ fontSize: 13 * u, color: theme.colors.blue, fontWeight: 500 }}>‹ Settings</div>
          <div style={{ fontSize: 30 * u, fontWeight: 700, letterSpacing: "-0.02em", margin: `10px 0 ${12 * u}px` }}>Wi-Fi</div>
          <div style={{ background: "#fff", borderRadius: 12 * u, overflow: "hidden" }}>
            <div style={{ height: rowH, display: "flex", alignItems: "center", padding: `0 ${14 * u}px`, justifyContent: "space-between", borderBottom: "1px solid #E5E5EA" }}>
              <span style={{ fontSize: 16 * u, fontWeight: 500 }}>Wi-Fi</span>
              <div style={{ width: 44 * u, height: 26 * u, borderRadius: 999, background: "#34C759", position: "relative" }}><div style={{ position: "absolute", right: 2 * u, top: 2 * u, width: 22 * u, height: 22 * u, borderRadius: "50%", background: "#fff" }} /></div>
            </div>
            <div style={{ height: rowH, display: "flex", alignItems: "center", gap: 10 * u, padding: `0 ${14 * u}px` }}>
              <IconWifi size={18 * u} color={theme.colors.blue} /><span style={{ fontSize: 16 * u, fontWeight: 600, color: theme.colors.blue, flex: 1 }}>thumb-5G</span>
              <span style={{ fontSize: 13 * u, color: "#8E8E93" }}>connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// The whole scene plays SPEED× faster: visuals through <TimeScale> (every spring, ramp and useAnim
// below it sees a remapped clock), sounds by dividing their cue frames with s().
export const SPEED = 1.5;
const s = (f: number) => Math.round(f / SPEED);

const CHIP_IDS = ["yellow.chip1", "yellow.chip2", "yellow.chip3", "yellow.chip4"] as const;
const CHIP_AT = [T.c1, T.c2, T.c3, T.c4];

// Everything that animates in scene time (runs under TimeScale).
const Stage: React.FC<{ exit: { opacity: number; y: number } }> = ({ exit }) => {
  const frame = useCurrentFrame();
  const panelColor = edit("yellow.panel.color", "#F5B324", { label: "Color", group: "Panel" });
  const wipe = interpolate(frame, [0, 14], [0, 1], { easing: theme.ease.inOut, ...clamp });
  const phoneIn = useAnim("yellow.phone.in", { delay: 0, preset: "smooth", from: { y: 1000 } });
  const chipSize = edit("yellow.chips.size", 30, { label: "Chip text", min: 18, max: 48, step: 1, unit: "px", group: "Chips" });
  const chipBg = edit("yellow.chips.bg", "#FFFFFF", { label: "Chip color", group: "Chips" });
  const chips: Array<{ id: string; at: number; text: string; side: "l" | "r"; y: number }> = [
    { id: CHIP_IDS[0], at: T.c1, text: useCopy(CHIP_IDS[0], 'tap_text("Wi-Fi")'), side: "l", y: 300 },
    { id: CHIP_IDS[1], at: T.c2, text: useCopy(CHIP_IDS[1], 'scroll_to("General")'), side: "r", y: 420 },
    { id: CHIP_IDS[2], at: T.c3, text: useCopy(CHIP_IDS[2], "describe_screen()"), side: "l", y: 560 },
    { id: CHIP_IDS[3], at: T.c4, text: useCopy(CHIP_IDS[3], 'run_skill("open-wifi")'), side: "r", y: 690 },
  ];
  const u = PHONE_W / 360;
  const wifiRowY = PHONE_TOP + PHONE_W * 0.035 + PHONE_W * 0.17 + 56 * u + 46 * u * 1.5;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: panelColor, transform: `scaleY(${wipe})`, transformOrigin: "50% 100%" }} />
      <AbsoluteFill style={{ opacity: exit.opacity, transform: `translateY(${exit.y}px)` }}>
        <div style={{ position: "absolute", left: PHONE_X, top: PHONE_TOP, transform: `translateY(${phoneIn.y}px)` }}>
          <Editable id="yellow.phone" label="iPhone" kind="image">
          <Phone width={PHONE_W}>
            <SettingsScreen width={PHONE_W} />
          </Phone>
          </Editable>
        </div>
        <Ripple x={PHONE_X + PHONE_W * 0.4} y={wifiRowY} at={T.tap1} color={theme.colors.blue} size={130} />
        {chips.map((c) => (
          <div key={c.id} style={{ position: "absolute", top: c.y, left: c.side === "l" ? undefined : PHONE_X + PHONE_W + 70, right: c.side === "l" ? 1920 - PHONE_X + 70 : undefined }}>
            <Editable id={c.id} label={`Chip · ${c.text}`} kind="text">
              <Pill mono size={chipSize} delay={c.at} bg={chipBg} style={{ padding: "18px 30px" }}>{c.text}</Pill>
            </Editable>
          </div>
        ))}
      </AbsoluteFill>
    </>
  );
};

export const SceneYellow: React.FC = () => {
  const { durationInFrames: dur } = useVideoConfig();
  // the exit is measured against the real scene length, so it stays outside TimeScale
  const ex = useExit(s(10));
  return (
    <AbsoluteFill>
      <Paper />
      <TimeScale speed={SPEED}>
        <Stage exit={ex} />
      </TimeScale>
      <Sfx id="yellow.sfx1" name="whoosh" at={0} volume={0.35} />
      <Sfx id="yellow.sfx2" name="thump" at={s(4)} volume={0.85} />
      <Sfx id="yellow.sfx3" name="whoosh" at={s(T.phone)} volume={0.35} />
      {CHIP_IDS.map((id, i) => <Sfx id={`yellow.sfx4.${id}`} key={id} name="pop" at={s(CHIP_AT[i])} volume={0.7} />)}
      <Sfx id="yellow.sfx5" name="click" at={s(T.tap1)} volume={0.8} />
      <Sfx id="yellow.sfx6" name="whoosh" at={s(T.scroll)} volume={0.35} />
      {Array.from({ length: 5 }).map((_, i) => <Sfx id={`yellow.sfx7.${i}`} key={i} name="click" at={s(T.ocr + i * 3)} volume={0.8} />)}
      <Sfx id="yellow.sfx8" name="whoosh" at={s(T.swap)} volume={0.35} />
      <Sfx id="yellow.sfx9" name="chime" at={s(T.swap + 8)} volume={0.7} />
      <Sfx id="yellow.sfx10" name="whoosh" at={dur - s(12)} volume={0.35} />
    </AbsoluteFill>
  );
};
