import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { theme } from "../theme";
import { SIZE, TOP } from "../components/Line";
import { TextClip, At, useExit } from "../components/Elements";
import { Sfx } from "../components/Sfx";
import { clamp } from "../components/motion";
import { Editable, useCopy, useAnimSpec, edit, useClip } from "../insyd";

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

// The panel rises in, ticks one task every `every` frames from `first`, scrolls as it goes and
// blurs away over the last 12 frames of its clip.
const Panel: React.FC<{ note: string; sub: string; first: number; every: number }> = ({ note, sub, first, every }) => {
  const { frame: f } = useClip();
  const panel = interpolate(f, [0, 22], [120, 0], { easing: theme.ease.out, ...clamp });
  const done = (i: number) => f >= first + i * every;
  const scroll = interpolate(f, [first + 3 * every, first + 8 * every], [0, 300], { easing: theme.ease.inOut, ...clamp });
  const out = useExit(12);
  let phase = 0;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 260, opacity: (1 - out) * interpolate(f, [0, 12], [0, 1], { easing: theme.ease.out, ...clamp }), transform: `translateY(${panel - scroll}px)`, filter: out ? `blur(${out * 12}px)` : undefined }}>
      <div style={{ width: 880, transform: "scale(1.3)", transformOrigin: "50% 50%", background: "#1a1f1d", border: "1px solid #2b3230", borderRadius: 18, padding: "26px 30px", boxShadow: "0 60px 140px -40px rgba(0,0,0,1)", color: "#e8ecea", pointerEvents: "auto" }}>
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
                <span style={{ width: 24, height: 24, borderRadius: 5, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 800, transform: `scale(${pop})`, background: d ? theme.colors.mint : "#2e3633", color: "#04110c" }}>{d ? "✓" : ""}</span>
                <span style={{ fontSize: 18, color: d ? "#7f8a86" : "#e8ecea", textDecoration: d ? "line-through" : undefined }}>{i + 1}. {text}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// 32–37 s · Claude's edit queue: every task ticks off on the beat, the list scrolls as it goes.
export const SceneQueue: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 30%, #0c1412, #020303 70%)", fontFamily: theme.fonts.body }}>
    <Editable id="queue.panel" label="Edit queue" display="fill" delay={0} trimOut={123}>
      <Panel note={useCopy("queue.panel.note", "I've mapped your template: 38 elements, 24 sounds, 6 brand tokens.")}
        sub={useCopy("queue.panel.sub", "Every change lands live in Studio as one undo step. Nothing is baked — tweak anything after.")}
        first={edit("queue.panel.first", 26, { label: "First tick (frame)", min: 0, max: 120, step: 1, unit: "f" })}
        every={edit("queue.panel.every", 10, { label: "Frames between ticks", min: 4, max: 30, step: 1, unit: "f" })} />
    </Editable>
    <At top={edit("queue.after.top", 50, TOP)}><Editable id="queue.after" label="After line" kind="text" delay={124} trimOut={25}>
      <TextClip text={useCopy("queue.after", "Claude edits it all, live in Studio...")} anim={useAnimSpec("queue.after.in", { delay: 0, preset: "bezier", duration: 12, easing: "linear" })} outDur={0} style={{ fontSize: edit("queue.after.size", 62, SIZE) }} />
    </Editable></At>
    <Sfx id="queue.sfx.in" name="swish" at={0} volume={0.4} />
    <Sfx id="queue.sfx.tick1" name="tick" at={26} volume={0.35} lead={0} />
    <Sfx id="queue.sfx.tick2" name="tick" at={36} volume={0.35} lead={0} />
    <Sfx id="queue.sfx.tick3" name="tick" at={46} volume={0.35} lead={0} />
    <Sfx id="queue.sfx.tick4" name="tick" at={56} volume={0.35} lead={0} />
    <Sfx id="queue.sfx.tick5" name="tick" at={66} volume={0.35} lead={0} />
    <Sfx id="queue.sfx.tick6" name="tick" at={76} volume={0.35} lead={0} />
    <Sfx id="queue.sfx.tick7" name="tick" at={86} volume={0.35} lead={0} />
    <Sfx id="queue.sfx.tick8" name="tick" at={96} volume={0.35} lead={0} />
    <Sfx id="queue.sfx.decode" name="decode" at={124} volume={0.35} />
  </AbsoluteFill>
);
