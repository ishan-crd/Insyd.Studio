import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { theme } from "../theme";
import { Block, Slam, Rise, Sticker, Stamp, Card, clamp, useRamp, useSpringIn, useExit } from "../components/Kit";
import { Sfx, KeyTicks } from "../components/Sfx";
import { Editable, useCopy, edit, useClip } from "../insyd";

const SIZE = { label: "Size", min: 40, max: 420, step: 2, unit: "px" } as const;
const mono: React.CSSProperties = { fontFamily: theme.fonts.mono, textTransform: "uppercase", letterSpacing: "0.12em" };
const display: React.CSSProperties = { fontFamily: theme.fonts.display, textTransform: "uppercase", lineHeight: 0.95, letterSpacing: "-0.005em" };

// ---------------------------------------------------------------- 12–16 s · the itinerary
/** a day card: flies in from the right on its beat, lands tilted, straightens */
const DayCard: React.FC<{ n: string; title: string; sub: string; price: string; bg: string; fg: string; tilt: number }> = ({ n, title, sub, price, bg, fg, tilt }) => {
  const s = useSpringIn(0, theme.spring.slam);
  const out = useExit(6);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateX(${(1 - s) * 1100 + out * -1200}px) rotate(${tilt * (1 - s * 0.6) + (1 - s) * 18}deg)` }}>
      <Card bg={bg} radius={40} shadow={16}>
        <div style={{ position: "absolute", left: 34, top: 34, width: 130, height: 130, borderRadius: "50%", background: theme.colors.ink, color: bg, display: "grid", placeItems: "center", fontFamily: theme.fonts.display, fontSize: 64 }}>{n}</div>
        <div style={{ position: "absolute", left: 200, top: 38, right: 210, color: fg }}>
          <div style={{ fontFamily: theme.fonts.body, fontWeight: 800, fontSize: 54, letterSpacing: "-0.035em", lineHeight: 1.02 }}>{title}</div>
          <div style={{ fontFamily: theme.fonts.body, fontWeight: 500, fontSize: 32, opacity: 0.8, marginTop: 10 }}>{sub}</div>
        </div>
        <div style={{ position: "absolute", right: 34, top: "50%", transform: "translateY(-50%) rotate(4deg)", background: theme.colors.cream, color: theme.colors.ink, border: `5px solid ${theme.colors.ink}`, borderRadius: 24, padding: "10px 18px", fontFamily: theme.fonts.mono, fontSize: 32, fontWeight: 500 }}>{price}</div>
      </Card>
    </div>
  );
};
export const SceneItinerary: React.FC = () => (
  <AbsoluteFill>
    <Editable id="plan.bg" label="Background" display="fill" delay={0} trimOut={119}><Block color={theme.colors.cream} enter="wipe-left" /></Editable>
    <Editable id="plan.kicker" label="Kicker" kind="text" delay={2} trimOut={117} style={{ position: "absolute", left: 90, top: 200, width: 900, height: 50 }}>
      <Rise style={{ ...mono, fontSize: 30, color: theme.colors.orange }}>{useCopy("plan.kicker", "● Planned in 9.2 seconds")}</Rise>
    </Editable>
    <Editable id="plan.title" label="Title" kind="text" delay={4} trimOut={115} style={{ position: "absolute", left: 90, top: 260, width: 900, height: 300 }}>
      <Rise style={{ ...display, fontSize: edit("plan.title.size", 150, SIZE), color: theme.colors.ink }}>{useCopy("plan.title", "Lisbon,")}</Rise>
      <Rise at={4} style={{ ...display, fontSize: edit("plan.title.size2", 150, SIZE), color: theme.colors.ink }}>{useCopy("plan.title.b", "4 days.")}</Rise>
    </Editable>
    <Editable id="plan.d1" label="Day 1" kind="text" copyId="plan.d1.title" delay={15} trimOut={104} style={{ position: "absolute", left: 70, top: 640, width: 940, height: 250 }}>
      <DayCard n="01" title={useCopy("plan.d1.title", "Alfama food crawl")} sub={useCopy("plan.d1.sub", "7 tascas, 1 fado bar")} price={useCopy("plan.d1.price", "$62")} bg={theme.colors.lime} fg={theme.colors.ink} tilt={-3} />
    </Editable>
    <Editable id="plan.d2" label="Day 2" kind="text" copyId="plan.d2.title" delay={30} trimOut={89} style={{ position: "absolute", left: 70, top: 920, width: 940, height: 250 }}>
      <DayCard n="02" title={useCopy("plan.d2.title", "Sintra by train")} sub={useCopy("plan.d2.sub", "Palaces, no queues")} price={useCopy("plan.d2.price", "$48")} bg={theme.colors.pink} fg={theme.colors.ink} tilt={2.5} />
    </Editable>
    <Editable id="plan.d3" label="Day 3" kind="text" copyId="plan.d3.title" delay={45} trimOut={74} style={{ position: "absolute", left: 70, top: 1200, width: 940, height: 250 }}>
      <DayCard n="03" title={useCopy("plan.d3.title", "Surf Carcavelos")} sub={useCopy("plan.d3.sub", "Board + lesson booked")} price={useCopy("plan.d3.price", "$75")} bg={theme.colors.blue} fg={theme.colors.cream} tilt={-2} />
    </Editable>
    <Editable id="plan.d4" label="Day 4" kind="text" copyId="plan.d4.title" delay={60} trimOut={59} style={{ position: "absolute", left: 70, top: 1480, width: 940, height: 250 }}>
      <DayCard n="04" title={useCopy("plan.d4.title", "Sunset, Bairro Alto")} sub={useCopy("plan.d4.sub", "Rooftop table for 2")} price={useCopy("plan.d4.price", "$40")} bg={theme.colors.orange} fg={theme.colors.ink} tilt={3} />
    </Editable>
    <Sfx id="plan.sfx.wipe" name="swoosh" at={0} volume={0.45} lead={2} />
    <Sfx id="plan.sfx.d1" name="whip" at={15} volume={0.45} lead={3} />
    <Sfx id="plan.sfx.d2" name="whip" at={30} volume={0.45} lead={3} />
    <Sfx id="plan.sfx.d3" name="whip" at={45} volume={0.45} lead={3} />
    <Sfx id="plan.sfx.d4" name="whip" at={60} volume={0.5} lead={3} />
  </AbsoluteFill>
);

// ---------------------------------------------------------------- 16–20 s · the route
// Stops in the map card's own coordinates (940 × 1080)
const STOPS: Array<[number, number]> = [[190, 250], [700, 330], [300, 690], [720, 900]];
/** a smooth route through the stops, sampled so the plane and the draw can share its length */
const ROUTE = (() => {
  const pts: Array<[number, number]> = [];
  const P = [STOPS[0], ...STOPS, STOPS[STOPS.length - 1]];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    for (let k = 0; k < 40; k++) {
      const t = k / 40, t2 = t * t, t3 = t2 * t;
      const c = (a: number, b: number, cc: number, d: number) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
      pts.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  pts.push(STOPS[STOPS.length - 1]);
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  // where along the route (0..1) each stop sits
  const stopAt = STOPS.map((_, i) => len[Math.min(pts.length - 1, i * 40)] / len[len.length - 1]);
  return { pts, len, total: len[len.length - 1], stopAt, d: "M" + pts.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join(" L") };
})();
const along = (u: number) => {
  const target = u * ROUTE.total;
  let i = ROUTE.len.findIndex((l) => l >= target);
  if (i <= 0) i = 1;
  const a = ROUTE.pts[i - 1], b = ROUTE.pts[i], seg = ROUTE.len[i] - ROUTE.len[i - 1] || 1, t = (target - ROUTE.len[i - 1]) / seg;
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, angle: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI };
};
/** route progress: it reaches each stop on a beat (every 15 frames from the clip start) */
const useRouteProgress = (every: number) => {
  const { frame } = useClip();
  const k = ROUTE.stopAt;
  return interpolate(frame, [0, every, every * 2, every * 3], [k[0], k[1], k[2], k[3]], { easing: theme.ease.inOut, ...clamp });
};

const MapBase: React.FC = () => {
  const s = useSpringIn(0, theme.spring.smooth);
  const out = useExit(6);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${0.8 + 0.2 * s}) rotate(${(1 - s) * -6}deg)`, opacity: Math.min(1, s * 2) * (1 - out) }}>
      <Card bg={theme.colors.cream} radius={48} shadow={18}>
        <svg width="100%" height="100%" viewBox="0 0 940 1080" preserveAspectRatio="none">
          <defs><pattern id="dots" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="3" fill={theme.colors.ink} opacity="0.13" /></pattern></defs>
          <rect width="940" height="1080" fill="url(#dots)" />
          {/* the coast: land in lime, the river in blue */}
          <path d="M-20 -20 L620 -20 C 560 120, 640 210, 560 320 C 480 430, 560 520, 470 610 C 380 700, 520 820, 420 1100 L -20 1100 Z" fill={theme.colors.lime} stroke={theme.colors.ink} strokeWidth="6" />
          <path d="M960 460 C 820 470, 760 560, 640 580 C 560 594, 520 650, 470 700" fill="none" stroke={theme.colors.blue} strokeWidth="40" strokeLinecap="round" opacity="0.9" />
          <circle cx="760" cy="180" r="70" fill={theme.colors.pink} stroke={theme.colors.ink} strokeWidth="6" />
          <rect x="120" y="840" width="160" height="110" rx="24" fill={theme.colors.pink} stroke={theme.colors.ink} strokeWidth="6" />
        </svg>
      </Card>
    </div>
  );
};
const Route: React.FC<{ every: number }> = ({ every }) => {
  const u = useRouteProgress(every);
  const out = useExit(6);
  const p = along(u);
  const drawn = (u * ROUTE.total).toFixed(1);
  return (
    <svg width="100%" height="100%" viewBox="0 0 940 1080" style={{ overflow: "visible", opacity: 1 - out }}>
      <path d={ROUTE.d} fill="none" stroke={theme.colors.ink} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${drawn} 99999`} />
      <path d={ROUTE.d} fill="none" stroke={theme.colors.orange} strokeWidth="6" strokeLinecap="round" strokeDasharray={`18 16`} strokeDashoffset={0} style={{ clipPath: "none" }} mask="url(#routeMask)" />
      <defs><mask id="routeMask"><path d={ROUTE.d} fill="none" stroke="#fff" strokeWidth="16" strokeDasharray={`${drawn} 99999`} /></mask></defs>
      <g transform={`translate(${p.x} ${p.y}) rotate(${p.angle + 90})`}>
        <path d="M0 -34 L9 -10 L34 4 L34 12 L9 6 L6 24 L14 32 L14 37 L0 33 L-14 37 L-14 32 L-6 24 L-9 6 L-34 12 L-34 4 L-9 -10 Z" fill={theme.colors.ink} stroke={theme.colors.cream} strokeWidth="3" />
      </g>
    </svg>
  );
};
const Stops: React.FC<{ names: string[]; every: number }> = ({ names, every }) => {
  const { frame } = useClip();
  const out = useExit(6);
  const colors = [theme.colors.orange, theme.colors.blue, theme.colors.orange, theme.colors.blue];
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      {STOPS.map(([x, y], i) => {
        const f = frame - i * every;
        if (f < 0) return null;
        const s = interpolate(f, [0, 4, 9], [0, 1.35, 1], clamp);
        const label = interpolate(f, [2, 10], [0, 1], { easing: theme.ease.back, ...clamp });
        const right = x < 470;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: x - 30, top: y - 30, width: 60, height: 60, borderRadius: "50%", background: colors[i], border: `7px solid ${theme.colors.ink}`, transform: `scale(${s})` }} />
            <div style={{ position: "absolute", top: y - 34, ...(right ? { left: x + 50 } : { right: 940 - x + 50 }), background: theme.colors.ink, color: theme.colors.cream, fontFamily: theme.fonts.body, fontWeight: 700, fontSize: 38, padding: "10px 22px", borderRadius: 36, whiteSpace: "nowrap", transform: `scale(${label})`, transformOrigin: right ? "0 50%" : "100% 50%" }}>{names[i]}</div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
const Counter: React.FC<{ km: number; every: number; suffix: string }> = ({ km, every, suffix }) => {
  const u = useRouteProgress(every);
  const k0 = ROUTE.stopAt[0];
  const n = Math.round(((u - k0) / (1 - k0)) * km);
  const out = useExit(6);
  const p = useRamp(0, 10);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: p * (1 - out) }}>
      <div style={{ ...display, fontSize: 120, color: theme.colors.lime, fontVariantNumeric: "tabular-nums" }}>{n} km <span style={{ color: theme.colors.cream }}>{suffix}</span></div>
    </AbsoluteFill>
  );
};
export const SceneMap: React.FC = () => {
  const every = edit("map.every", 15, { label: "Frames between stops", min: 6, max: 40, step: 1, unit: "f" });
  return (
  <AbsoluteFill>
    <Editable id="map.bg" label="Background" display="fill" delay={0} trimOut={119}><Block color={theme.colors.blue} enter="wipe-up" /></Editable>
    <Editable id="map.title" label="Title" kind="text" delay={2} trimOut={117} style={{ position: "absolute", left: 60, top: 170, width: 960, height: 150 }}>
      <Slam text={useCopy("map.title", "Every stop, routed.")} size={edit("map.title.size", 116, SIZE)} color={theme.colors.cream} shake={6} />
    </Editable>
    <Editable id="map.base" label="Map" delay={0} trimOut={119} style={{ position: "absolute", left: 70, top: 380, width: 940, height: 1080 }}><MapBase /></Editable>
    <Editable id="map.route" label="Route + plane" delay={16} trimOut={103} style={{ position: "absolute", left: 70, top: 380, width: 940, height: 1080 }}>
      <Route every={every} />
    </Editable>
    <Editable id="map.stops" label="Stops" kind="text" copyId="map.stop1" delay={16} trimOut={103} style={{ position: "absolute", left: 70, top: 380, width: 940, height: 1080 }}>
      <Stops every={every} names={[useCopy("map.stop1", "Alfama"), useCopy("map.stop2", "Sintra"), useCopy("map.stop3", "Carcavelos"), useCopy("map.stop4", "Bairro Alto")]} />
    </Editable>
    <Editable id="map.counter" label="Distance counter" kind="text" copyId="map.counter.suffix" delay={16} trimOut={103} style={{ position: "absolute", left: 60, top: 1540, width: 960, height: 150 }}>
      <Counter km={edit("map.counter.km", 412, { label: "Kilometres", min: 1, max: 99999, step: 1 })} every={every} suffix={useCopy("map.counter.suffix", "· 4 stops")} />
    </Editable>
    <Sfx id="map.sfx.in" name="swoosh" at={0} volume={0.45} lead={2} />
    <Sfx id="map.sfx.plane" name="plane" at={16} volume={0.45} lead={0} />
    <Sfx id="map.sfx.p1" name="pop" at={16} volume={0.5} />
    <Sfx id="map.sfx.p2" name="pop" at={31} volume={0.5} />
    <Sfx id="map.sfx.p3" name="pop" at={46} volume={0.5} />
    <Sfx id="map.sfx.p4" name="pop" at={61} volume={0.55} />
  </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 20–23 s · the budget
const Price: React.FC<{ from: number; to: number; roll: number; old: string }> = ({ from, to, roll, old }) => {
  const { frame } = useClip();
  const p = interpolate(frame, [6, 6 + roll], [0, 1], { easing: theme.ease.inOut, ...clamp });
  const n = Math.round(from + (to - from) * p);
  const strike = useRamp(2, 10, theme.ease.inOut);
  const land = interpolate(frame, [6 + roll, 6 + roll + 4, 6 + roll + 10], [1, 1.12, 1], clamp);
  const out = useExit(6);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - out }}>
      <div style={{ position: "relative", ...display, fontSize: 110, color: theme.colors.ink, opacity: 0.55 }}>
        {old}
        <i style={{ position: "absolute", left: -10, right: -10, top: "50%", height: 14, background: theme.colors.orange, transform: `scaleX(${strike}) rotate(-6deg)`, transformOrigin: "0 50%" }} />
      </div>
      <div style={{ ...display, fontSize: 360, lineHeight: 1, color: theme.colors.ink, fontVariantNumeric: "tabular-nums", transform: `scale(${land})` }}>${n.toLocaleString("en-US")}</div>
    </AbsoluteFill>
  );
};
export const SceneBudget: React.FC = () => (
  <AbsoluteFill>
    <Editable id="budget.bg" label="Background" display="fill" delay={0} trimOut={89}><Block color={theme.colors.pink} /></Editable>
    <Editable id="budget.kicker" label="Kicker" kind="text" delay={0} trimOut={89} style={{ position: "absolute", left: 90, top: 330, width: 900, height: 60 }}>
      <Rise style={{ ...mono, fontSize: 34, color: theme.colors.ink, textAlign: "center" }}>{useCopy("budget.kicker", "Total, all in")}</Rise>
    </Editable>
    <Editable id="budget.price" label="Price" kind="text" copyId="budget.old" delay={0} trimOut={89} style={{ position: "absolute", left: 40, top: 460, width: 1000, height: 600 }}>
      <Price from={edit("budget.from", 1240, { label: "Starts at", min: 0, max: 99999, step: 1 })} to={edit("budget.to", 864, { label: "Lands on", min: 0, max: 99999, step: 1 })} roll={edit("budget.roll", 30, { label: "Roll (frames)", min: 4, max: 80, step: 1, unit: "f" })} old={useCopy("budget.old", "$1,240")} />
    </Editable>
    <Editable id="budget.stamp" label="Stamp" kind="text" delay={45} trimOut={44} style={{ position: "absolute", left: 90, top: 1060, width: 900, height: 300 }}>
      <Stamp text={useCopy("budget.stamp", "Under budget")} color={theme.colors.blue} size={edit("budget.stamp.size", 124, SIZE)} angle={-8} />
    </Editable>
    <Editable id="budget.line" label="Line" kind="text" delay={50} trimOut={39} style={{ position: "absolute", left: 90, top: 1440, width: 900, height: 140 }}>
      <Rise style={{ fontFamily: theme.fonts.body, fontWeight: 700, fontSize: edit("budget.line.size", 54, SIZE), letterSpacing: "-0.03em", color: theme.colors.ink, textAlign: "center", lineHeight: 1.15 }}>{useCopy("budget.line", "Flights, stays and every meal.")}</Rise>
    </Editable>
    <Sfx id="budget.sfx.strike" name="scribble" at={2} volume={0.35} />
    <KeyTicks id="budget.sfx.roll" from={6} count={15} every={2} volume={0.28} src="sfx/tick.wav" />
    <Sfx id="budget.sfx.cash" name="cash" at={36} volume={0.6} />
    <Sfx id="budget.sfx.stamp" name="stamp" at={51} volume={0.8} lead={0} />
  </AbsoluteFill>
);

// ---------------------------------------------------------------- 23–26 s · booked
const Pass: React.FC<{ from: string; to: string; name: string; seat: string; gate: string; time: string }> = ({ from, to, name, seat, gate, time }) => {
  const s = useSpringIn(0, theme.spring.smooth);
  const out = useExit(6);
  const cell = (k: string, v: string) => (
    <div><div style={{ ...mono, fontSize: 22, opacity: 0.6 }}>{k}</div><div style={{ fontFamily: theme.fonts.body, fontWeight: 800, fontSize: 46, letterSpacing: "-0.02em" }}>{v}</div></div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - s) * 1500 + out * -80}px) rotate(${-4 + (1 - s) * 12}deg)`, opacity: 1 - out }}>
      <Card bg={theme.colors.ink} radius={44} shadow={20} style={{ color: theme.colors.cream, boxShadow: `20px 20px 0 ${theme.colors.blue}` }}>
        <div style={{ position: "absolute", left: 56, right: 56, top: 60, display: "flex", justifyContent: "space-between", ...mono, fontSize: 24, color: theme.colors.lime }}><span>Roam · Boarding pass</span><span>RM 2031</span></div>
        <div style={{ position: "absolute", left: 56, right: 56, top: 130, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ ...display, fontSize: 200, lineHeight: 1 }}>{from}</span>
          <svg width="130" height="60" viewBox="0 0 130 60"><path d="M4 30 H112 M92 10 L116 30 L92 50" stroke={theme.colors.lime} strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span style={{ ...display, fontSize: 200, lineHeight: 1, color: theme.colors.lime }}>{to}</span>
        </div>
        <div style={{ position: "absolute", left: 56, right: 56, top: 400, display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", rowGap: 30 }}>
          {cell("Passenger", name)}{cell("Seat", seat)}{cell("Gate", gate)}{cell("Boards", time)}
        </div>
        {/* perforation + barcode */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 640, borderTop: `6px dashed ${theme.colors.cream}`, opacity: 0.35 }} />
        <div style={{ position: "absolute", left: -40, top: 604, width: 80, height: 80, borderRadius: "50%", background: theme.colors.lime }} />
        <div style={{ position: "absolute", right: -40, top: 604, width: 80, height: 80, borderRadius: "50%", background: theme.colors.lime }} />
        <div style={{ position: "absolute", left: 56, right: 56, top: 700, height: 130, display: "flex", gap: 6 }}>
          {BARS.map((w, i) => <i key={i} style={{ width: w, background: theme.colors.cream }} />)}
        </div>
      </Card>
    </div>
  );
};
const BARS = Array.from({ length: 56 }, (_, i) => [3, 6, 3, 9, 3, 4, 12, 3, 6, 3][(i * 7) % 10]);
export const SceneBooked: React.FC = () => (
  <AbsoluteFill>
    <Editable id="booked.bg" label="Background" display="fill" delay={0} trimOut={89}><Block color={theme.colors.lime} enter="wipe-up" /></Editable>
    <Editable id="booked.pass" label="Boarding pass" kind="text" copyId="booked.name" delay={0} trimOut={89} style={{ position: "absolute", left: 80, top: 420, width: 920, height: 900 }}>
      <Pass from={useCopy("booked.from", "JFK")} to={useCopy("booked.to", "LIS")} name={useCopy("booked.name", "Maya R.")} seat={useCopy("booked.seat", "14A")} gate={useCopy("booked.gate", "B22")} time={useCopy("booked.time", "19:05")} />
    </Editable>
    <Editable id="booked.stamp" label="Stamp" kind="text" delay={36} trimOut={53} style={{ position: "absolute", left: 140, top: 1260, width: 800, height: 300 }}>
      <Stamp text={useCopy("booked.stamp", "Booked.")} color={theme.colors.orange} size={edit("booked.stamp.size", 170, SIZE)} angle={-7} />
    </Editable>
    <Editable id="booked.line" label="Line" kind="text" delay={8} trimOut={81} style={{ position: "absolute", left: 90, top: 200, width: 900, height: 180 }}>
      <Rise style={{ ...display, fontSize: edit("booked.line.size", 120, SIZE), color: theme.colors.ink, textAlign: "center" }}>{useCopy("booked.line", "One tap. Done.")}</Rise>
    </Editable>
    <Sfx id="booked.sfx.in" name="swoosh" at={0} volume={0.5} lead={2} />
    <Sfx id="booked.sfx.line" name="tap" at={8} volume={0.35} />
    <Sfx id="booked.sfx.stamp" name="stamp" at={42} volume={0.85} lead={0} />
    <Sfx id="booked.sfx.ding" name="ding" at={46} volume={0.45} />
  </AbsoluteFill>
);

