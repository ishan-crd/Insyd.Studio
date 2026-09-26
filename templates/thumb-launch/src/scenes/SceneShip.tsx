import React from "react";
import { AbsoluteFill } from "remotion";
import { Paper } from "../components/Layers";
import { Headline, linesFrom } from "../components/Text";
import { Editable, useCopy, edit, useAnimSpec } from "../insyd";
import { Sfx } from "../components/Sfx";
import { useExit } from "../components/motion";

export const SceneShip: React.FC = () => {
  const ex = useExit(8);
  const h = useCopy("ship.headline", "Build your app faster,|with a Claude that sees your phone.");
  const size = edit("ship.headline.size", 92, { label: "Size", min: 40, max: 180, step: 2, unit: "px" });
  const headAnim = useAnimSpec("ship.headline.in", { delay: 0, stagger: 3, preset: "snappy", from: { y: 34, scale: 0.96, opacity: 0 } });
  return (
    <AbsoluteFill>
      <Paper />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: ex.opacity, transform: `translateY(${ex.y}px)` }}>
        <Editable id="ship.headline" label="Headline" kind="text"><Headline lines={linesFrom(h)} anim={headAnim} style={{ fontSize: size }} /></Editable>
      </AbsoluteFill>
      <Sfx id="ship.sfx1" name="whoosh" at={0} volume={0.35} />
    </AbsoluteFill>
  );
};
