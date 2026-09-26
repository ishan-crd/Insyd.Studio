import React from "react";
import { AbsoluteFill } from "remotion";
import { theme } from "../theme";
import { Paper } from "../components/Layers";
import { Headline, linesFrom } from "../components/Text";
import { Editable, useCopy, edit, useAnim, useAnimSpec } from "../insyd";
import { Sfx } from "../components/Sfx";
import { IconPhone } from "../components/Icons";
import { useExit } from "../components/motion";

export const SceneNo: React.FC = () => {
  const ex = useExit(8);
  const h = useCopy("no.lines", "No jailbreak.|No WebDriverAgent.|No developer profile.");
  const pillText = useCopy("no.pill", "Just iPhone Mirroring.");
  const size = edit("no.lines.size", 84, { label: "Size", min: 40, max: 160, step: 2, unit: "px" });
  const headAnim = useAnimSpec("no.lines.in", { delay: 0, stagger: 4, preset: "snappy", from: { y: 34, scale: 0.96, opacity: 0 } });
  const pillColor = edit("no.pill.color", "#E9573F", { label: "Color" });
  const pillSize = edit("no.pill.size", 66, { label: "Size", min: 30, max: 120, step: 2, unit: "px" });
  const pillIn = useAnim("no.pill.in", { delay: 48, preset: "bouncy", from: { y: 40, scale: 0.85, opacity: 0 } });
  return (
    <AbsoluteFill>
      <Paper />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: ex.opacity, transform: `translateY(${ex.y}px)` }}>
        <Editable id="no.lines" label="Headline" kind="text">
        <Headline
          lines={linesFrom(h)}
          anim={headAnim}
          style={{ fontSize: size, color: theme.colors.inkDim }}
        />
        </Editable>
        <Editable id="no.pill" label="Coral pill" kind="text">
        <div
          style={{
            marginTop: 40, display: "inline-flex", alignItems: "center", gap: 20, padding: "22px 44px", borderRadius: 999, background: pillColor, color: "#fff",
            fontFamily: theme.fonts.display, fontWeight: 700, fontSize: pillSize, letterSpacing: "-0.03em", ...pillIn.style,
            boxShadow: `0 30px 60px -20px ${theme.colors.glow}`,
          }}
        >
          <IconPhone size={pillSize * 0.82} color="#fff" />
          {pillText}
        </div>
        </Editable>
      </AbsoluteFill>
      <Sfx id="no.sfx1" name="pop-soft" at={0} volume={0.5} />
      <Sfx id="no.sfx2" name="pop-soft" at={8} volume={0.5} />
      <Sfx id="no.sfx3" name="pop-soft" at={16} volume={0.5} />
      <Sfx id="no.sfx4" name="pop" at={48} volume={0.7} />
      <Sfx id="no.sfx5" name="thump" at={48} volume={0.85} />
    </AbsoluteFill>
  );
};
