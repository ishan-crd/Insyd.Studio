import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { AsciiField } from "../components/Ascii";
import { Logo } from "../components/Props";
import { Line, SIZE, TOP } from "../components/Line";
import { Decode } from "../components/Decode";
import { Sfx } from "../components/Sfx";
import { clamp, ramp } from "../components/motion";
import { Editable, edit, useCopy } from "../insyd";

// 48–58 s · "You pick a template. / Claude makes it yours." → the lockup lands on the final hit.
export const SceneEnd: React.FC = () => {
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const HIT = edit("end.hit", 60, { label: "Logo hit frame", min: 30, max: 120, step: 1, unit: "f" });
  const word = useCopy("end.word", "Studio");
  const by = useCopy("end.by", "by Insyd");
  const url = useCopy("end.url", "insyd.studio");
  const tag = useCopy("end.tag", "Launch videos, edited by Claude.");
  const tile = spring({ frame: f - HIT, fps, config: { damping: 11, stiffness: 190, mass: 0.7 } });
  const wipe = ramp(f, HIT + 10, HIT + 26, theme.ease.expo);
  const fadeOut = interpolate(f, [durationInFrames - 24, durationInFrames - 2], [1, 0], clamp);
  const flash = f < HIT ? 0 : interpolate(f, [HIT, HIT + 8], [0.45, 0], clamp);
  return (
    <AbsoluteFill style={{ background: theme.colors.bg, opacity: fadeOut }}>
      <Editable id="end.bg" label="Haze texture" display="fill"><AsciiField mode="haze" amount={ramp(f, 0, 30) * 0.9} /></Editable>
      <Line top={edit("end.l1.top", 50, TOP)}><Editable id="end.l1" label="Line 1" kind="text"><Decode text={useCopy("end.l1", "You pick a template.")} start={2} dur={10} out={26} outDur={6} style={{ fontSize: edit("end.l1.size", 56, SIZE) }} /></Editable></Line>
      <Line top={edit("end.l2.top", 50, TOP)}><Editable id="end.l2" label="Line 2" kind="text"><Decode text={useCopy("end.l2", "Claude makes it yours.")} start={30} dur={10} out={HIT - 4} outDur={4} seed={2} style={{ fontSize: edit("end.l2.size", 56, SIZE) }} /></Editable></Line>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {f >= HIT && (
          <Editable id="end.logo" label="Logo lockup" kind="text" copyId="end.word">
            <div style={{ transform: `scale(${0.6 + 0.4 * tile})`, opacity: Math.min(1, tile * 1.5) }}>
              <Logo word={word} by={by} showWord={wipe} size={170} />
            </div>
          </Editable>
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 230 }}>
        <Editable id="end.tag" label="Tagline" kind="text"><Decode text={tag} start={HIT + 30} dur={14} style={{ fontSize: 38, color: theme.colors.inkDim }} /></Editable>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 160 }}>
        <Editable id="end.url" label="URL" kind="text"><Decode text={url} start={HIT + 44} dur={12} style={{ fontFamily: theme.fonts.mono, fontSize: 36, letterSpacing: "0.06em" }} seed={4} /></Editable>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff", opacity: flash, pointerEvents: "none" }} />
      <Sfx id="end.sfx.d1" name="decode" at={2} volume={0.3} />
      <Sfx id="end.sfx.d2" name="decode" at={30} volume={0.3} />
      <Sfx id="end.sfx.riser" name="riser" at={HIT - 45} volume={0.3} lead={0} />
      <Sfx id="end.sfx.impact" name="impact" at={HIT} volume={0.8} />
      <Sfx id="end.sfx.wipe" name="swish" at={HIT + 10} volume={0.35} />
      <Sfx id="end.sfx.tag" name="decode" at={HIT + 30} volume={0.25} />
      <Sfx id="end.sfx.url" name="blip" at={HIT + 44} volume={0.35} />
    </AbsoluteFill>
  );
};
