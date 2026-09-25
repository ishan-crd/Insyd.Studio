import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Orb, Pointer } from "../components/Props";
import { Sfx, KeyTicks } from "../components/Sfx";
import { ramp, typed, clamp } from "../components/motion";
import { Editable, useCopy } from "../insyd";

const Tab: React.FC<{ on?: boolean; icon: string; children: React.ReactNode }> = ({ on, icon, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 16px", borderRadius: 20, fontSize: 19, color: on ? theme.colors.mint : "#9aa39f",
    border: on ? `1px solid ${theme.colors.mint}66` : "1px solid transparent", background: on ? `${theme.colors.mint}14` : "transparent" }}><span>{icon}</span>{children}</div>
);
const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ height: 38, padding: "0 16px", borderRadius: 10, background: "#1a201e", border: "1px solid #2a312e", color: "#c7cfcb", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>{children}</div>
);

// 28–32 s · the prompt: "make it mine". Starts close on the text, pulls back, send is clicked.
export const ScenePrompt: React.FC = () => {
  const f = useCurrentFrame();
  const prompt = useCopy("prompt.text", "Make this launch video mine — our logo, colours and copy. Make it slap.");
  const shown = typed(prompt, 4, f, 1.25);
  const zoom = interpolate(f, [0, 60], [1.55, 1], { easing: theme.ease.inOut, ...clamp });
  const panX = interpolate(f, [0, 60], [260, 0], { easing: theme.ease.inOut, ...clamp });
  const down = f >= 86 && f < 91;
  const sent = ramp(f, 88, 96);
  const collapse = ramp(f, 100, 118, theme.ease.in);
  const px = interpolate(f, [60, 84], [1640, 1456], { easing: theme.ease.out, ...clamp });
  const py = interpolate(f, [60, 84], [860, 594], { easing: theme.ease.out, ...clamp });
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #0d1513, #020303 70%)", fontFamily: theme.fonts.body }}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translateX(${panX}px) scale(${zoom * (1 - collapse * 0.1)})`, opacity: 1 - collapse, filter: `blur(${collapse * 10}px)` }}>
        <Editable id="prompt.box" label="Prompt box" kind="text" copyId="prompt.text">
          <div style={{ width: 1100 }}>
            <div style={{ display: "flex", gap: 6, padding: 8, background: "#131816", border: "1px solid #29302d", borderBottom: 0, borderRadius: "20px 20px 0 0", width: "fit-content" }}>
              <Tab on icon="▦">Template</Tab><Tab icon="↻">Remix</Tab><Tab icon="✦">From scratch</Tab>
            </div>
            <div style={{ position: "relative", height: 230, borderRadius: "0 20px 20px 20px", background: "linear-gradient(180deg, #111715, #0c100f)", border: "1px solid #29302d", padding: "26px 30px",
              boxShadow: "0 40px 120px -40px rgba(0,0,0,1), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 30, color: "#e9eeeb", lineHeight: 1.4 }}>{shown}<span style={{ display: "inline-block", width: 2, height: 32, background: "#e9eeeb", marginLeft: 2, verticalAlign: -5, opacity: Math.floor(f / 8) % 2 ? 0 : 1 }} /></div>
              <div style={{ position: "absolute", left: 26, bottom: 22, display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ position: "relative", width: 72, height: 38, borderRadius: 19, background: "#1b2220", border: "1px solid #2c3431" }}><div style={{ position: "absolute", left: 52, top: 19 }}><Orb size={22} glow={0.6} /></div></div>
                <div style={{ width: 38, height: 38, borderRadius: 19, background: "#1b2220", border: "1px solid #2c3431", display: "grid", placeItems: "center", color: "#aab3af", fontSize: 22 }}>+</div>
              </div>
              <div style={{ position: "absolute", right: 24, bottom: 22, width: 46, height: 46, borderRadius: 23, background: sent > 0 ? theme.colors.mint : "#2b3431", display: "grid", placeItems: "center",
                transform: `scale(${down ? 0.9 : 1})`, boxShadow: sent > 0 ? `0 0 30px ${theme.colors.mint}88` : undefined, color: "#04110c", fontSize: 24, fontWeight: 700 }}>↑</div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "center" }}>
              <Chip>▤ Product launch</Chip><Chip>✦ Feature drop</Chip><Chip>◷ Changelog</Chip><Chip>$ Fundraise</Chip><Chip>⌄ More templates</Chip>
            </div>
          </div>
        </Editable>
      </AbsoluteFill>
      {f >= 60 && f < 104 && <Pointer x={px} y={py} down={down} hand />}
      <Sfx id="prompt.sfx.in" name="swish" at={0} volume={0.4} />
      <KeyTicks id="prompt.sfx.keys" from={4} count={36} every={2} volume={0.2} />
      <Sfx id="prompt.sfx.click" name="click" at={86} volume={0.8} lead={0} />
      <Sfx id="prompt.sfx.send" name="blip" at={88} volume={0.6} />
      <Sfx id="prompt.sfx.out" name="whoosh" at={100} volume={0.4} />
    </AbsoluteFill>
  );
};
