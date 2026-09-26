import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { theme } from "../theme";
import { Paper } from "../components/Layers";
import { Headline, linesFrom } from "../components/Text";
import { Editable, useCopy, edit, useAnim, useAnimSpec } from "../insyd";
import { Sfx } from "../components/Sfx";
import { useExit } from "../components/motion";

// "Meet the [thumb] MCP"
export const SceneMeet: React.FC = () => {
  const ex = useExit(8);
  const h = useCopy("meet.headline", "Meet the");
  const size = edit("meet.headline.size", 104, { label: "Size", min: 40, max: 200, step: 2, unit: "px" });
  const headAnim = useAnimSpec("meet.headline.in", { delay: 0, stagger: 3, preset: "snappy", from: { y: 34, scale: 0.96, opacity: 0 } });
  const width = edit("meet.wordmark.width", 600, { label: "Width", min: 240, max: 1000, step: 10, unit: "px" });
  const word = useAnim("meet.wordmark.in", { delay: 16, preset: "bouncy", from: { y: 40, scale: 0.85, opacity: 0 } });
  const mcp = useAnim("meet.wordmark.mcpIn", { delay: 32, preset: "snappy", from: { y: 24, opacity: 0 } });
  return (
    <AbsoluteFill>
      <Paper />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: ex.opacity, transform: `translateY(${ex.y}px)` }}>
        <Editable id="meet.headline" label="Headline" kind="text"><Headline lines={linesFrom(h)} anim={headAnim} style={{ fontSize: size }} /></Editable>
        <Editable id="meet.wordmark" label="Wordmark" kind="image">
        <div style={{ display: "flex", alignItems: "flex-end", gap: 34, marginTop: 26 }}>
          <Img
            src={staticFile("wordmark.png")}
            style={{ width, imageRendering: "pixelated", ...word.style, transformOrigin: "50% 100%" }}
          />
          <Img
            src={staticFile("mcp.png")}
            style={{ width: width * 0.367, marginBottom: 8, imageRendering: "pixelated", ...mcp.style }}
          />
        </div>
        </Editable>
      </AbsoluteFill>
      <Sfx id="meet.sfx1" name="whoosh" at={0} volume={0.35} />
      <Sfx id="meet.sfx2" name="pop" at={16} volume={0.7} />
      <Sfx id="meet.sfx3" name="pop-soft" at={32} volume={0.5} />
    </AbsoluteFill>
  );
};
