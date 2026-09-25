import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Room, Orb } from "../components/Props";
import { StudioUI } from "../components/StudioUI";
import { Decode } from "../components/Decode";
import { Sfx } from "../components/Sfx";
import { ramp, clamp, breathe } from "../components/motion";
import { Editable, useCopy, edit } from "../insyd";

// 16–24 s · the studio room. The orb drifts in, the monitor hums on, and on the drop the screen
// reads INTRODUCING… — then Studio itself appears and the camera flies into the display.
export const SceneIntro: React.FC = () => {
  const f = useCurrentFrame();
  const intro = useCopy("intro.word", "INTRODUCING...");
  const project = useCopy("intro.project", "Acme — launch video");
  const DROP = edit("intro.drop", 120, { label: "Drop frame (INTRODUCING)", min: 60, max: 200, step: 1, unit: "f" });
  const fadeIn = ramp(f, 0, 24);
  const power = ramp(f, DROP - 22, DROP - 4);
  // orb: sweeps in from the right on an arc, parks by the monitor, then dives into the screen
  const ox = interpolate(f, [30, 100, DROP + 40, 214], [2150, 1560, 1520, 960], { easing: theme.ease.inOut, ...clamp });
  const oy = interpolate(f, [30, 100, DROP + 40, 214], [260, 330, 300 + breathe(f, 12, 50), 440], { easing: theme.ease.inOut, ...clamp });
  const orbScale = interpolate(f, [190, 214], [1, 0.2], clamp);
  // camera: slow push, then fly into the screen
  const push = interpolate(f, [0, 180], [1.08, 1], { easing: theme.ease.out, ...clamp });
  const p = ramp(f, 186, 236, theme.ease.expo);
  const s = push * (1 + p * 0.975);
  const ty = 440 + 100 * p;
  const tx = 960 - 960 * s, tyy = ty - 440 * s;
  const ui = ramp(f, DROP + 42, DROP + 50);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ opacity: fadeIn, transformOrigin: "0 0", transform: `translate(${tx}px, ${tyy}px) scale(${s})` }}>
        <Editable id="intro.room" label="Studio room" display="fill">
          <Room power={power} screen={
            <>
              <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - ui }}>
                <Editable id="intro.word" label="INTRODUCING" kind="text">
                  <Decode text={intro} start={DROP} dur={16} style={{ fontFamily: theme.fonts.mono, fontSize: 64, letterSpacing: "0.12em", color: "#d8d8d8" }} />
                </Editable>
              </AbsoluteFill>
              <div style={{ position: "absolute", left: 0, top: 0, width: 1600, height: 900, transformOrigin: "0 0", transform: `scale(${972 / 1600})`, opacity: ui }}>
                <Editable id="intro.ui" label="Studio UI" display="fill"><StudioUI project={project} playhead={0.1 + 0.3 * ramp(f, DROP + 50, 240, (x) => x)} /></Editable>
              </div>
            </>
          } />
        </Editable>
        {f >= 30 && f < 214 && <div style={{ position: "absolute", left: ox, top: oy, transform: `scale(${orbScale})` }}><Editable id="intro.orb" label="Orb"><Orb size={70} /></Editable></div>}
      </AbsoluteFill>
      <Sfx id="intro.sfx.shimmer" name="shimmer" at={32} volume={0.45} />
      <Sfx id="intro.sfx.whoosh" name="whoosh" at={40} volume={0.35} />
      <Sfx id="intro.sfx.hum" name="hum" at={DROP - 22} volume={0.35} lead={0} />
      <Sfx id="intro.sfx.impact" name="impact" at={DROP} volume={0.7} />
      <Sfx id="intro.sfx.decode" name="decode" at={DROP} volume={0.4} />
      <Sfx id="intro.sfx.ui" name="glitch" at={DROP + 42} volume={0.35} />
      <Sfx id="intro.sfx.dive" name="whoosh" at={186} volume={0.55} />
    </AbsoluteFill>
  );
};
