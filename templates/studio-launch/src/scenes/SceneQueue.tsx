import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Line, SIZE, TOP } from "../components/Line";
import { Decode } from "../components/Decode";
import { Sfx } from "../components/Sfx";
import { ramp, clamp } from "../components/motion";
import { Editable, edit, useCopy } from "../insyd";

// 32–37 s · Claude's edit queue: every task ticks off on the beat, the list scrolls as it goes.
const TASKS: Array<[phase: number, text: string]> = [
  [1, "Swap in your logo"],
  [1, "Rewrite every headline"],
  [1, "Recolour to your brand"],
  [1, "Re-time every scene to the beat"],
  [2, "Level every whoosh to 40%"],
  [2, "Drop in your product screenshots"],
  [2, "Tighten the end card"],
  [3, "Save 38 edits into the code"],
];

export const SceneQueue: React.FC = () => {
  const f = useCurrentFrame();
  const note = useCopy("queue.note", "I've mapped your template: 38 elements, 24 sounds, 6 brand tokens.");
  const sub = useCopy("queue.sub", "Every change lands live in Studio as one undo step. Nothing is baked — tweak anything after.");
  const every = edit("queue.every", 10, { label: "Frames between ticks", min: 4, max: 30, step: 1, unit: "f" });
  const first = 26;
  const panel = interpolate(f, [0, 22], [120, 0], { easing: theme.ease.out, ...clamp });
  const done = (i: number) => f >= first + i * every;
  const scroll = interpolate(f, [first + 3 * every, first + 8 * every], [0, 300], { easing: theme.ease.inOut, ...clamp });
  const out = ramp(f, 112, 124, theme.ease.in);
  let phase = 0;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 30%, #0c1412, #020303 70%)", fontFamily: theme.fonts.body }}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 260, opacity: (1 - out) * ramp(f, 0, 12), transform: `translateY(${panel - scroll}px)`, filter: `blur(${out * 12}px)` }}>
        <Editable id="queue.panel" label="Edit queue" scale={1.3}>
          <div style={{ width: 880, background: "#1a1f1d", border: "1px solid #2b3230", borderRadius: 18, padding: "26px 30px", boxShadow: "0 60px 140px -40px rgba(0,0,0,1)", color: "#e8ecea" }}>
            <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 18 }}>Edit queue</div>
            <div style={{ background: "linear-gradient(90deg, #3a1d52, #2c1a45)", borderRadius: 10, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ fontSize: 19, fontWeight: 500 }}>{note}</div>
              <div style={{ fontSize: 15, color: "#c7b6dc", marginTop: 6 }}>{sub}</div>
            </div>
            {TASKS.map(([ph, text], i) => {
              const head = ph !== phase ? (phase = ph, <div key={"h" + ph} style={{ fontSize: 16, letterSpacing: "0.04em", color: "#aab3af", margin: "14px 0 10px" }}>PHASE {ph}:</div>) : null;
              const d = done(i);
              const pop = d ? interpolate(f - (first + i * every), [0, 6], [1.25, 1], clamp) : 1;
              return (
                <React.Fragment key={i}>
                  {head}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, height: 48, padding: "0 14px", marginBottom: 6, borderRadius: 8, background: "#212725" }}>
                    <span style={{ color: "#4a524f" }}>⋮⋮</span>
                    <span style={{ width: 24, height: 24, borderRadius: 5, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 800, transform: `scale(${pop})`,
                      background: d ? theme.colors.mint : "#2e3633", color: "#04110c" }}>{d ? "✓" : ""}</span>
                    <span style={{ fontSize: 18, color: d ? "#7f8a86" : "#e8ecea", textDecoration: d ? "line-through" : undefined }}>{i + 1}. {text}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </Editable>
      </AbsoluteFill>
      <Line top={edit("queue.after.top", 50, TOP)}><Editable id="queue.after" label="After line" kind="text"><Decode text={useCopy("queue.after", "Claude edits it all, live in Studio...")} start={124} dur={12} style={{ fontSize: edit("queue.after.size", 62, SIZE) }} /></Editable></Line>
      <Sfx id="queue.sfx.in" name="swish" at={0} volume={0.4} />
      <Sfx id="queue.sfx.tick1" name="tick" at={first + 0 * every} volume={0.35} lead={0} />
      <Sfx id="queue.sfx.tick2" name="tick" at={first + 1 * every} volume={0.35} lead={0} />
      <Sfx id="queue.sfx.tick3" name="tick" at={first + 2 * every} volume={0.35} lead={0} />
      <Sfx id="queue.sfx.tick4" name="tick" at={first + 3 * every} volume={0.35} lead={0} />
      <Sfx id="queue.sfx.tick5" name="tick" at={first + 4 * every} volume={0.35} lead={0} />
      <Sfx id="queue.sfx.tick6" name="tick" at={first + 5 * every} volume={0.35} lead={0} />
      <Sfx id="queue.sfx.tick7" name="tick" at={first + 6 * every} volume={0.35} lead={0} />
      <Sfx id="queue.sfx.tick8" name="tick" at={first + 7 * every} volume={0.35} lead={0} />
      <Sfx id="queue.sfx.decode" name="decode" at={124} volume={0.35} />
    </AbsoluteFill>
  );
};
