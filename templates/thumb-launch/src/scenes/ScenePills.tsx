import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { Paper } from "../components/Layers";
import { Headline, linesFrom } from "../components/Text";
import { Editable, useCopy, edit, useAnimSpec } from "../insyd";
import { Pill } from "../components/Pill";
import { Sfx } from "../components/Sfx";
import { IconCamera, IconChat, IconWifi, IconCode, IconFigma, IconCompass } from "../components/Icons";
import { useExit, clamp } from "../components/motion";

const ITEMS: Array<{ icon: React.ReactNode; label: string }> = [
  { icon: <IconCamera size={34} />, label: "open Instagram" },
  { icon: <IconChat size={34} color="#25A244" />, label: "WhatsApp Mom “landed safe”" },
  { icon: <IconWifi size={34} color={theme.colors.blue} />, label: "scroll to Wi-Fi settings" },
  { icon: <IconCode size={34} />, label: "run the Expo app" },
  { icon: <IconFigma size={34} color={theme.colors.hero} />, label: "match the Figma design" },
  { icon: <IconCompass size={34} />, label: "explore the whole app" },
];
export const SLOT = 26;

// "Ask Claude to [rotating pill]" — the Notion "One AI tool to ..." carousel.
export const ScenePills: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ex = useExit(8);
  const start = 16; // beat 1; then one pill per beat
  const h = useCopy("pills.headline", "Ask Claude to");
  const size = edit("pills.headline.size", 96, { label: "Size", min: 40, max: 180, step: 2, unit: "px" });
  const headAnim = useAnimSpec("pills.headline.in", { delay: 0, stagger: 3, preset: "snappy", from: { y: 34, scale: 0.96, opacity: 0 } });
  const slot = edit("pills.carousel.slot", 24, { label: "Frames per item", min: 8, max: 60, step: 1, unit: "f" });
  const pillBg = edit("pills.carousel.bg", "#E8E5DE", { label: "Pill color" });
  const pillSize = edit("pills.carousel.size", 40, { label: "Pill text", min: 20, max: 64, step: 1, unit: "px" });
  return (
    <AbsoluteFill>
      <Paper />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: ex.opacity, transform: `translateY(${ex.y}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
          <Editable id="pills.headline" x={136.8} label="Headline" kind="text"><Headline lines={linesFrom(h)} anim={headAnim} style={{ fontSize: size }} /></Editable>
          <Editable id="pills.carousel" x={136.8} label="Pill carousel">
          <div style={{ position: "relative", width: 900, height: 120 }}>
            {ITEMS.map((it, k) => {
              const t0 = start + k * slot;
              const pin = spring({ frame: frame - t0, fps, config: theme.spring.smooth });
              const isLast = k === ITEMS.length - 1;
              const pout = isLast ? 0 : interpolate(frame, [t0 + slot - 1, t0 + slot + 9], [0, 1], { easing: theme.ease.in, ...clamp });
              const y = interpolate(pin, [0, 1], [70, 0]) - pout * 70;
              const o = pin * (1 - pout);
              const blur = (1 - pin) * 10 + pout * 10;
              if (o <= 0.001) return null;
              return (
                <div key={k} style={{ position: "absolute", left: 0, top: 18, opacity: o, transform: `translateY(${y}px)`, filter: `blur(${blur}px)` }}>
                  <Pill icon={it.icon} size={pillSize} pop={false} bg={pillBg} style={{ padding: "18px 34px 18px 26px" }}>
                    {it.label}
                  </Pill>
                </div>
              );
            })}
          </div>
          </Editable>
        </div>
      </AbsoluteFill>
      {ITEMS.map((_, k) => (
        <Sfx id={`pills.sfx1.${k}`} key={k} name="pop-soft" at={start + k * slot + 2} volume={0.5} />
      ))}
    </AbsoluteFill>
  );
};
