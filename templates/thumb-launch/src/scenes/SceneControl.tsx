import React from "react";
import { AbsoluteFill } from "remotion";
import { theme } from "../theme";
import { Paper } from "../components/Layers";
import { Headline, linesFrom } from "../components/Text";
import { Editable, useCopy, edit, useAnimSpec } from "../insyd";
import { Pill } from "../components/Pill";
import { Sfx } from "../components/Sfx";
import { IconTerminal, IconDesktop, IconPlug } from "../components/Icons";
import { useExit } from "../components/motion";

export const SceneControl: React.FC = () => {
  const ex = useExit(8);
  const h = useCopy("control.headline", "Control your iPhone|from Claude.");
  const size = edit("control.headline.size", 104, { label: "Size", min: 40, max: 200, step: 2, unit: "px" });
  const headAnim = useAnimSpec("control.headline.in", { delay: 0, stagger: 3, preset: "snappy", from: { y: 34, scale: 0.96, opacity: 0 } });
  const pillSize = edit("control.pills.size", 30, { label: "Pill text", min: 18, max: 48, step: 1, unit: "px" });
  return (
    <AbsoluteFill>
      <Paper />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: ex.opacity, transform: `translateY(${ex.y}px)` }}>
        <Editable id="control.headline" label="Headline" kind="text"><Headline lines={linesFrom(h)} anim={headAnim} style={{ fontSize: size }} /></Editable>
        <Editable id="control.pills" label="Client pills">
        <div style={{ display: "flex", gap: 24, marginTop: 50 }}>
          <Pill icon={<IconTerminal size={pillSize} />} size={pillSize} delay={16}>Claude Code</Pill>
          <Pill icon={<IconDesktop size={pillSize} />} size={pillSize} delay={24}>Claude Desktop</Pill>
          <Pill icon={<IconPlug size={pillSize} />} size={pillSize} delay={32}>Any MCP client</Pill>
        </div>
        </Editable>
      </AbsoluteFill>
      <Sfx id="control.sfx1" shift={1} name="whoosh" at={0} volume={0.35} />
      <Sfx id="control.sfx2" name="pop-soft" at={16} volume={0.5} />
      <Sfx id="control.sfx3" name="pop-soft" at={24} volume={0.5} />
      <Sfx id="control.sfx4" name="pop-soft" at={32} volume={0.5} />
    </AbsoluteFill>
  );
};
