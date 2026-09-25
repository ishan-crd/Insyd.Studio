import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { SearchBar, Pointer } from "../components/Props";
import { AsciiField } from "../components/Ascii";
import { Sfx, KeyTicks } from "../components/Sfx";
import { ramp, typed, clamp } from "../components/motion";
import { Editable, useCopy, useAnim } from "../insyd";

// 12–16 s · the question gets typed into a glass search bar; the pointer clicks search.
export const SceneSearch: React.FC = () => {
  const f = useCurrentFrame();
  const q = useCopy("search.query", "how to make a launch video without a designer?");
  const bar = useAnim("search.bar.in", { delay: 0, preset: "smooth", from: { x: 260, opacity: 0, blur: 12 } });
  const shown = typed(q, 8, f, 0.75);
  const px = interpolate(f, [40, 82], [1500, 1446], { easing: theme.ease.out, ...clamp });
  const py = interpolate(f, [40, 82], [760, 548], { easing: theme.ease.out, ...clamp });
  const down = f >= 84 && f < 89;
  const out = ramp(f, 100, 118, theme.ease.in);
  return (
    <AbsoluteFill style={{ background: theme.colors.bg }}>
      <Editable id="search.bg" label="Ripple texture" display="fill"><AsciiField mode="ripple" amount={0.25 * (1 - out)} color={theme.colors.inkDim} /></Editable>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - out, filter: `blur(${out * 14}px)`, transform: `scaleX(${1 + out * 0.3})` }}>
        <Editable id="search.bar" label="Search bar" kind="text" copyId="search.query">
          <div style={{ ...bar.style, transform: `${bar.style.transform ?? ""} scale(${down ? 0.985 : 1})` }}>
            <SearchBar text={shown} caret={Math.floor(f / 8) % 2 === 0 || f < 70} />
          </div>
        </Editable>
      </AbsoluteFill>
      {f >= 40 && f < 108 && <Pointer x={px} y={py} down={down} />}
      <Sfx id="search.sfx.in" name="whoosh" at={0} volume={0.4} />
      <KeyTicks id="search.sfx.keys" from={8} count={28} every={2} volume={0.2} />
      <Sfx id="search.sfx.click" name="click" at={84} volume={0.8} lead={0} />
      <Sfx id="search.sfx.out" name="glitch" at={100} volume={0.4} />
      <Sfx id="search.sfx.riser" name="riser" at={75} volume={0.35} lead={0} />
    </AbsoluteFill>
  );
};
