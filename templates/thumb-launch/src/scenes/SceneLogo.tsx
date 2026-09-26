import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Paper } from "../components/Layers";
import { PixelThumb } from "../components/PixelThumb";
import { Mascot } from "../components/Mascot";
import { Cursor } from "../components/Cursor";
import { Sfx } from "../components/Sfx";
import { clamp } from "../components/motion";
import { useBeatPulse } from "../music";
import { Editable, edit, useAnim, useAnimSpec } from "../insyd";

// 0–108: the mark assembles pixel by pixel, a cursor clicks it, blue bursts out
// from the click with the mascot — the Notion open, in our clothes.
// The song enters on the downbeat at 3.39 s → frame 102: the click and the blue burst land there.
export const CLICK = 99; // 3 frames before the downbeat, so the burst is on screen when it lands
export const SceneLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const cell = edit("logo.lockup.pixel", 16, { label: "Pixel size", min: 8, max: 28, step: 1, unit: "px" });
  const wordWidth = edit("logo.lockup.wordmarkWidth", 540, { label: "Wordmark width", min: 200, max: 900, step: 10, unit: "px" });
  const burstColor = edit("logo.burstColor", "#2B6BF3", { label: "Burst color", group: "Scene" });
  const mascotSize = edit("logo.mascot.size", 360, { label: "Size", min: 160, max: 640, step: 10, unit: "px" });
  const mascotAnim = useAnimSpec("logo.mascot.in", { delay: 111, preset: "bouncy", from: { scale: 0.6, rotate: -14, opacity: 0 } });
  const pulse = useBeatPulse();
  const word = useAnim("logo.lockup.wordmarkIn", { delay: 46, preset: "bouncy", from: { y: 30, scale: 0.8, opacity: 0 } });
  // cursor glides in from bottom-right and clicks the nail
  const cx = interpolate(frame, [64, CLICK - 2], [1500, 990], { easing: theme.ease.inOut, ...clamp });
  const cy = interpolate(frame, [64, CLICK - 2], [980, 400], { easing: theme.ease.inOut, ...clamp });
  const cursorO = interpolate(frame, [60, 70], [0, 1], clamp) * interpolate(frame, [CLICK + 2, CLICK + 10], [1, 0], clamp);
  const press = interpolate(frame, [CLICK - 2, CLICK, CLICK + 6], [0, 1, 0], { easing: theme.ease.soft, ...clamp });
  // blue burst from the click point
  const burst = interpolate(frame, [CLICK, CLICK + 9], [0, 1], { easing: theme.ease.out, ...clamp }); // fast: mostly covered by the downbeat
  const R = 2400 * burst;
  return (
    <AbsoluteFill>
      <Paper />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Editable id="logo.lockup" label="Logo lockup" kind="image">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${(1 - press * 0.05) * (1 + (frame > 60 ? pulse * 0.02 : 0))})`, transformOrigin: "50% 45%" }}>
          <PixelThumb cell={cell} delay={2} perRow={1.05} jitter={4} />
          <Img
            src={staticFile("wordmark.png")}
            style={{ width: wordWidth, marginTop: 34, imageRendering: "pixelated", ...word.style }}
          />
        </div>
        </Editable>
      </AbsoluteFill>
      <div style={{ opacity: cursorO, position: "absolute", inset: 0 }}>
        <Cursor x={cx} y={cy} pressed={press > 0.5} />
      </div>
      {/* the burst */}
      <div
        style={{
          position: "absolute", left: 990 - R / 2, top: 400 - R / 2, width: R, height: R, borderRadius: "50%",
          background: burstColor,
        }}
      />
      {burst > 0.55 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <Editable id="logo.mascot" label="Mascot" kind="image"><Mascot size={mascotSize} anim={mascotAnim} /></Editable>
        </AbsoluteFill>
      )}
      <Sfx id="logo.sfx1" shift={-10} name="riser" at={CLICK - 36} volume={0.45} lead={0} />
      <Sfx id="logo.sfx2" name="click" at={CLICK} volume={0.8} />
      <Sfx id="logo.sfx3" shift={1} name="whoosh" at={CLICK + 2} volume={0.35} />
      <Sfx id="logo.sfx4" name="thump" at={CLICK + 2} volume={0.85} />
      <Sfx id="logo.sfx5" name="pop" at={CLICK + 10} volume={0.7} />
      <Sfx id="logo.sfx6" name="pop-soft" at={46} volume={0.5} />
    </AbsoluteFill>
  );
};
