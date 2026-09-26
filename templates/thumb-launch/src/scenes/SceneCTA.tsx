import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Paper } from "../components/Layers";
import { Headline, Sub, linesFrom } from "../components/Text";
import { Editable, useCopy, edit, useAnim, useAnimSpec } from "../insyd";
import { Sfx, KeyTicks } from "../components/Sfx";
import { useExit, typed } from "../components/motion";

export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const ex = useExit(8);
  const h = useCopy("cta.headline", "Give Claude a thumb.");
  const size = edit("cta.headline.size", 108, { label: "Size", min: 40, max: 200, step: 2, unit: "px" });
  const headAnim = useAnimSpec("cta.headline.in", { delay: 0, stagger: 3, preset: "snappy", from: { y: 34, scale: 0.96, opacity: 0 } });
  const boxBg = edit("cta.command.bg", "#16151A", { label: "Background" });
  const boxSize = edit("cta.command.size", 36, { label: "Text size", min: 20, max: 64, step: 1, unit: "px" });
  const box = useAnim("cta.command.in", { delay: 16, preset: "smooth", from: { y: 30, scale: 0.95, opacity: 0 } });
  const CMD = useCopy("cta.command", "claude mcp add thumb -- uvx thumb-mcp");
  const url = useCopy("cta.url", "github.com/ishan-crd/thumb-mcp");
  const shown = typed(CMD, 20, frame, 1.7);
  return (
    <AbsoluteFill>
      <Paper />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: ex.opacity, transform: `translateY(${ex.y}px)` }}>
        <Editable id="cta.headline" label="Headline" kind="text"><Headline lines={linesFrom(h)} anim={headAnim} style={{ fontSize: size }} /></Editable>
        <Editable id="cta.command" label="Install command" kind="text">
        <div
          style={{
            marginTop: 44, background: boxBg, color: theme.colors.cream, fontFamily: theme.fonts.mono, fontSize: boxSize, fontWeight: 500,
            padding: "26px 44px", borderRadius: 20, display: "flex", alignItems: "center", gap: 18, ...box.style,
            boxShadow: "0 40px 80px -30px rgba(22,21,26,0.6)",
          }}
        >
          <span style={{ color: theme.colors.hero }}>$</span>
          <span>{shown}<span style={{ opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0, color: theme.colors.hero }}>▍</span></span>
        </div>
        </Editable>
        <Editable id="cta.url" label="URL" kind="text"><Sub delay={48} style={{ marginTop: 34, fontSize: 30 }}>{url}</Sub></Editable>
      </AbsoluteFill>
      <Sfx id="cta.sfx1" name="whoosh" at={0} volume={0.35} />
      <Sfx id="cta.sfx2" name="pop" at={16} volume={0.7} />
      <KeyTicks id="cta.sfx3" from={20} count={12} every={2} volume={0.22} />
      <Sfx id="cta.sfx4" name="pop-soft" at={48} volume={0.5} />
    </AbsoluteFill>
  );
};
