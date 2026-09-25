import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { MiniFrame } from "../components/StudioUI";
import { Pointer } from "../components/Props";
import { Line, SIZE, TOP } from "../components/Line";
import { Decode } from "../components/Decode";
import { Sfx } from "../components/Sfx";
import { clamp, ramp, hash } from "../components/motion";
import { Editable, edit, useCopy } from "../insyd";

// 44–48 s · the marketplace: a wall of launch-video templates streaks in; one gets "Edit in Studio".
const TITLES = ["acme", "Shipper", "thumb", "Nova", "Ledger", "Orbit", "Pulse", "Fable", "Kite", "Loop", "Draft", "Arc", "Mono", "Beam", "Relay"];
const TINTS = ["#E14BFF", "#3FD1A0", "#E9573F", "#3D74E8", "#F5B324", "#7B61D9", "#2A9D9F", "#D95F6E"];

export const SceneWall: React.FC = () => {
  const f = useCurrentFrame();
  const cols = 5, rows = 3, W = 352, H = 198, GAP = 20;
  const pick = edit("wall.pick", 7, { label: "Highlighted template", min: 0, max: 14, step: 1 });
  const hover = ramp(f, 58, 66);
  const down = f >= 80 && f < 85;
  const out = ramp(f, 104, 120, theme.ease.in);
  const pc = pick % cols, pr = Math.floor(pick / cols);
  const tx = 960 + (pc - (cols - 1) / 2) * (W + GAP), ty = 600 + (pr - 1) * (H + GAP);
  const px = interpolate(f, [44, 72], [1700, tx + 60], { easing: theme.ease.out, ...clamp });
  const py = interpolate(f, [44, 72], [1000, ty + 50], { easing: theme.ease.out, ...clamp });
  return (
    <AbsoluteFill style={{ background: "#020303", fontFamily: theme.fonts.body }}>
      <Line top={edit("wall.caption.top", 17, TOP)}><Editable id="wall.caption" label="Caption" kind="text"><Decode text={useCopy("wall.caption", "Hundreds of launch templates")} start={24} dur={12} style={{ fontSize: edit("wall.caption.size", 58, SIZE) }} /></Editable></Line>
      <Editable id="wall.grid" label="Template wall" display="fill">
        <AbsoluteFill style={{ opacity: 1 - out, filter: out ? `blur(${out * 12}px)` : undefined }}>
          {Array.from({ length: cols * rows }, (_, i) => {
            const c = i % cols, r = Math.floor(i / cols);
            // each row streaks in from alternating sides with a motion-blur smear
            const d = r * 4 + hash(i, 2) * 6;
            const p = interpolate(f, [d, d + 22], [0, 1], { easing: theme.ease.out, ...clamp });
            const dir = r % 2 ? -1 : 1;
            const x = 960 + (c - (cols - 1) / 2) * (W + GAP) + dir * (1 - p) * 2400;
            const y = 600 + (r - 1) * (H + GAP);
            const blur = (1 - p) * 40;
            const isPick = i === pick;
            const lift = isPick ? hover : 0;
            return (
              <div key={i} style={{ position: "absolute", left: x - W / 2, top: y - H / 2, width: W, height: H, borderRadius: 10, overflow: "hidden",
                transform: `scaleX(${1 + (1 - p) * 0.6}) scale(${1 + lift * 0.06})`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined,
                boxShadow: isPick && lift ? `0 0 0 2px ${theme.colors.accent}, 0 30px 60px -20px rgba(0,0,0,.9)` : "0 0 0 1px rgba(255,255,255,0.08)", opacity: 1 - lift * 0 - (isPick ? 0 : hover * 0.45) }}>
                <div style={{ position: "absolute", inset: 0, transform: `scale(${W / 780})`, transformOrigin: "0 0", width: 780, height: 439 }}><MiniFrame title={TITLES[i]} tint={TINTS[i % TINTS.length]} t={f + i * 7} /></div>
                {isPick && lift > 0 && (
                  <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${0.45 * lift})`, display: "grid", placeItems: "center" }}>
                    <div style={{ opacity: lift, transform: `translateY(${(1 - lift) * 10}px) scale(${down ? 0.94 : 1})`, background: "#F2F2F0", color: "#1A1A19", fontSize: 17, fontWeight: 600, padding: "10px 18px", borderRadius: 8 }}>Edit in Studio →</div>
                  </div>
                )}
              </div>
            );
          })}
        </AbsoluteFill>
      </Editable>
      {f >= 44 && f < 104 && <Pointer x={px} y={py} down={down} hand />}
      <Sfx id="wall.sfx.whoosh1" name="whoosh" at={0} volume={0.5} />
      <Sfx id="wall.sfx.whoosh2" name="whoosh" at={6} volume={0.35} />
      <Sfx id="wall.sfx.decode" name="decode" at={24} volume={0.3} />
      <Sfx id="wall.sfx.hover" name="pop" at={58} volume={0.4} />
      <Sfx id="wall.sfx.click" name="click" at={80} volume={0.8} lead={0} />
      <Sfx id="wall.sfx.out" name="glitch" at={104} volume={0.4} />
    </AbsoluteFill>
  );
};
