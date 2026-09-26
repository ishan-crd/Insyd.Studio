import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Paper } from "../components/Layers";
import { Headline, Sub, linesFrom } from "../components/Text";
import { Editable, useCopy, edit, useAnim, useAnimSpec } from "../insyd";
import { PixelThumb } from "../components/PixelThumb";
import { Sfx } from "../components/Sfx";
import { clamp } from "../components/motion";
import { useBeatPulse } from "../music";

export const END_LEN = 236;
// Scene starts on the biggest hit of the song (42.66 s); the logo lands on the next downbeat.
const LOGO_AT = 65; // build starts 3f before the downbeat after the hit
export const SceneEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const tagOut = interpolate(frame, [LOGO_AT - 12, LOGO_AT - 2], [0, 1], { easing: theme.ease.in, ...clamp });
  const pulse = useBeatPulse();
  const breathe = (1 + Math.sin(frame / 24) * 0.008) * (1 + (frame > LOGO_AT + 40 ? pulse * 0.02 : 0));
  const outro = interpolate(frame, [END_LEN - 14, END_LEN - 1], [1, 0], { easing: theme.ease.in, ...clamp });
  const tag = useCopy("end.tagline", "Think it. Tap it.");
  const size = edit("end.tagline.size", 112, { label: "Size", min: 40, max: 200, step: 2, unit: "px" });
  const tagAnim = useAnimSpec("end.tagline.in", { delay: 0, stagger: 3, preset: "snappy", from: { y: 34, scale: 0.96, opacity: 0 } });
  const cell = edit("end.logo.pixel", 11, { label: "Pixel size", min: 6, max: 20, step: 1, unit: "px" });
  const word = useAnim("end.logo.wordmarkIn", { delay: 97, preset: "bouncy", from: { y: 24, scale: 0.85, opacity: 0 } });
  const mcp = useAnim("end.logo.mcpIn", { delay: 113, preset: "snappy", from: { y: 14, opacity: 0 } });
  const url = useCopy("end.url", "github.com/ishan-crd/thumb-mcp");
  return (
    <AbsoluteFill>
      <Paper />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - tagOut, transform: `translateY(${-tagOut * 40}px)` }}>
        <Editable id="end.tagline" label="Tagline" kind="text"><Headline lines={linesFrom(tag)} anim={tagAnim} style={{ fontSize: size }} /></Editable>
      </AbsoluteFill>
      {frame >= LOGO_AT - 2 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: outro }}>
          <Editable id="end.logo" label="Logo lockup" kind="image">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${breathe})` }}>
            <PixelThumb cell={cell} delay={LOGO_AT} perRow={0.7} jitter={3} />
            <Img src={staticFile("wordmark.png")} style={{ width: cell * 34.5, marginTop: 24, imageRendering: "pixelated", ...word.style }} />
            <Img src={staticFile("mcp.png")} style={{ width: cell * 13.6, marginTop: 14, imageRendering: "pixelated", ...mcp.style }} />
          </div>
          </Editable>
          <Editable id="end.url" label="URL" kind="text"><Sub delay={LOGO_AT + 64} style={{ marginTop: 44, fontSize: 28 }}>{url}</Sub></Editable>
        </AbsoluteFill>
      )}
      <Sfx id="end.sfx1" name="whoosh" at={0} volume={0.35} />
      <Sfx id="end.sfx2" name="whoosh" at={LOGO_AT - 10} volume={0.35} />
      <Sfx id="end.sfx3" name="riser" at={LOGO_AT - 4} volume={0.45} lead={0} />
      <Sfx id="end.sfx4" name="pop" at={LOGO_AT + 32} volume={0.7} />
      <Sfx id="end.sfx5" name="pop-soft" at={LOGO_AT + 48} volume={0.5} />
      <Sfx id="end.sfx6" name="chime" at={LOGO_AT + 32} volume={0.7} />
      <Sfx id="end.sfx7" name="pop-soft" at={LOGO_AT + 64} volume={0.5} />
    </AbsoluteFill>
  );
};
