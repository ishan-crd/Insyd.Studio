import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { theme } from "../theme";
import { MiniFrame } from "../components/StudioUI";
import { SIZE, TOP } from "../components/Line";
import { TextClip, At, CursorClip, useExit } from "../components/Elements";
import { Sfx } from "../components/Sfx";
import { clamp, hash } from "../components/motion";
import { Editable, useCopy, useAnimSpec, edit, useClip } from "../insyd";

// 44–48 s · the marketplace: a wall of launch-video templates streaks in; one gets "Edit in Studio".
const TITLES = ["acme", "Shipper", "thumb", "Nova", "Ledger", "Orbit", "Pulse", "Fable", "Kite", "Loop", "Draft", "Arc", "Mono", "Beam", "Relay"];
const TINTS = ["#E14BFF", "#3FD1A0", "#E9573F", "#3D74E8", "#F5B324", "#7B61D9", "#2A9D9F", "#D95F6E"];

// Rows streak in from alternating sides with a motion-blur smear; the picked tile lifts at `hover`
// and shows "Edit in Studio", pressed at `press`. The wall blurs away over the last 16 frames.
const Grid: React.FC<{ pick: number; hover: number; press: number }> = ({ pick, hover: hoverAt, press }) => {
  const { frame: f } = useClip();
  const cols = 5, rows = 3, W = 352, H = 198, GAP = 20;
  const hover = interpolate(f, [hoverAt, hoverAt + 8], [0, 1], { easing: theme.ease.out, ...clamp });
  const down = f >= press && f < press + 5;
  const out = useExit(16);
  return (
    <AbsoluteFill style={{ opacity: 1 - out, filter: out ? `blur(${out * 12}px)` : undefined }}>
      {Array.from({ length: cols * rows }, (_, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const d = r * 4 + hash(i, 2) * 6;
        const p = interpolate(f, [d, d + 22], [0, 1], { easing: theme.ease.out, ...clamp });
        const dir = r % 2 ? -1 : 1;
        const x = 960 + (c - (cols - 1) / 2) * (W + GAP) + dir * (1 - p) * 2400;
        const y = 600 + (r - 1) * (H + GAP);
        const blur = (1 - p) * 40;
        const isPick = i === pick;
        const lift = isPick ? hover : 0;
        return (
          <div key={i} style={{ position: "absolute", left: x - W / 2, top: y - H / 2, width: W, height: H, borderRadius: 10, overflow: "hidden", pointerEvents: "auto",
            transform: `scaleX(${1 + (1 - p) * 0.6}) scale(${1 + lift * 0.06})`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined,
            boxShadow: isPick && lift ? `0 0 0 2px ${theme.colors.accent}, 0 30px 60px -20px rgba(0,0,0,.9)` : "0 0 0 1px rgba(255,255,255,0.08)", opacity: isPick ? 1 : 1 - hover * 0.45 }}>
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
  );
};

// 44–48 s · the marketplace: a wall of launch-video templates streaks in; one gets "Edit in Studio".
export const SceneWall: React.FC = () => (
  <AbsoluteFill style={{ background: "#020303", fontFamily: theme.fonts.body }}>
    <At top={edit("wall.caption.top", 17, TOP)}><Editable id="wall.caption" label="Caption" kind="text" delay={24} trimOut={95}>
      <TextClip text={useCopy("wall.caption", "Hundreds of launch templates")} anim={useAnimSpec("wall.caption.in", { delay: 0, preset: "bezier", duration: 12, easing: "linear" })} outDur={0} style={{ fontSize: edit("wall.caption.size", 58, SIZE) }} />
    </Editable></At>
    <Editable id="wall.grid" label="Template wall" display="fill" delay={0} trimOut={119}>
      <Grid pick={edit("wall.grid.pick", 7, { label: "Highlighted template", min: 0, max: 14, step: 1 })} hover={58} press={80} />
    </Editable>
    <Editable id="wall.cursor" label="Pointer" display="fill" delay={44} trimOut={59}>
      <CursorClip from={[1700, 1000]} to={[1020, 650]} travel={28} press={36} hand />
    </Editable>
    <Sfx id="wall.sfx.whoosh1" name="whoosh" at={0} volume={0.5} />
    <Sfx id="wall.sfx.whoosh2" name="whoosh" at={6} volume={0.35} />
    <Sfx id="wall.sfx.decode" name="decode" at={24} volume={0.3} />
    <Sfx id="wall.sfx.hover" name="pop" at={58} volume={0.4} />
    <Sfx id="wall.sfx.click" name="click" at={80} volume={0.8} lead={0} />
    <Sfx id="wall.sfx.out" name="glitch" at={104} volume={0.4} />
  </AbsoluteFill>
);
