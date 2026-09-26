import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { Paper } from "../components/Layers";
import { Mascot } from "../components/Mascot";
import { Phone } from "../components/Phone";
import { Card, CardHeader, UserPrompt, ToolLine, AssistantLine } from "../components/Card";
import { Sfx, KeyTicks } from "../components/Sfx";
import { IconSearch } from "../components/Icons";
import { Ripple, TapThumb } from "../components/Tap";
import { useSpring, useExit, typed, hash } from "../components/motion";
import { Editable, useCopy, edit, useAnim, useAnimSpec } from "../insyd";

// Beat-aligned (16f per beat, 64f per bar): panel on the downbeat, phone on bar 2, tiles on bar 3.
const T = {
  panel: 0, card: 6, prompt: 16, tool1: 48, tool1Done: 64, tool2: 64, mascotOut: 58, phone: 64,
  tap: 96, typeStart: 112, tiles: 128, tool2Done: 144, reply: 160,
};
const QUERY = "latte art";

const SearchScreen: React.FC<{ width: number }> = ({ width }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shown = typed(QUERY, T.typeStart, frame, 0.5);
  const focus = frame >= T.tap;
  const pad = width * 0.06;
  const tile = (width - pad * 2 - 12) / 3;
  const palette = ["#C69C6D", "#8B5A2B", "#E7D3B8", "#A5714A", "#F1E4D3", "#6B4423", "#D9B58C", "#B98657", "#EAD7C0"];
  return (
    <div style={{ position: "absolute", inset: 0, paddingTop: width * 0.17, fontFamily: theme.fonts.body }}>
      <div style={{ padding: `0 ${pad}px` }}>
        <div
          style={{
            height: width * 0.13, borderRadius: width * 0.04, background: "#EBEBEF", display: "flex", alignItems: "center",
            gap: 10, padding: `0 ${width * 0.04}px`, boxShadow: focus ? `0 0 0 3px ${theme.colors.blue}55` : undefined,
          }}
        >
          <IconSearch size={width * 0.06} color="#8A8A8E" />
          <span style={{ fontSize: width * 0.055, color: shown ? theme.colors.ink : "#8A8A8E", fontWeight: 500 }}>
            {shown || "Search"}
            {focus && <span style={{ opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0, color: theme.colors.blue }}>|</span>}
          </span>
        </div>
        {shown.length >= QUERY.length && (
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {["Top", "Accounts", "Tags", "Places"].map((t, i) => {
              const p = spring({ frame: frame - T.tiles + 6 - i * 2, fps, config: theme.spring.snappy });
              return (
                <div key={t} style={{ opacity: p, padding: "6px 14px", borderRadius: 999, background: i === 0 ? theme.colors.ink : "#EBEBEF", color: i === 0 ? "#fff" : theme.colors.ink, fontSize: width * 0.042, fontWeight: 600 }}>{t}</div>
              );
            })}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(3, ${tile}px)`, gap: 6, marginTop: 16 }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const p = spring({ frame: frame - T.tiles - i * 2.2, fps, config: theme.spring.snappy });
            const c = palette[i % palette.length];
            return (
              <div
                key={i}
                style={{
                  width: tile, height: tile, borderRadius: 4, opacity: p, transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})`,
                  background: `linear-gradient(${140 + hash(i, 3) * 60}deg, ${c}, ${palette[(i + 4) % palette.length]})`, position: "relative", overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", left: "50%", top: "50%", width: tile * 0.55, height: tile * 0.55, borderRadius: "50%", transform: "translate(-50%,-50%)", background: "#5A3A22", boxShadow: "inset 0 0 0 4px #F3E7D8" }}>
                  <div style={{ position: "absolute", left: "50%", top: "50%", width: "45%", height: "45%", borderRadius: "50% 50% 50% 0", transform: "translate(-50%,-50%) rotate(-45deg)", background: "#F3E7D8", opacity: 0.85 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const SceneSearch: React.FC = () => {
  const ex = useExit(10);
  const { durationInFrames: dur } = useVideoConfig();
  const prompt = useCopy("search.prompt", "open Instagram and search for latte art");
  const panelColor = edit("search.panel.color", "#2B6BF3", { label: "Color" });
  const PANEL_W = edit("search.panel.width", 900, { label: "Width", min: 500, max: 1200, step: 10, unit: "px" });
  const PHONE_W = edit("search.phone.width", 340, { label: "Width", min: 200, max: 480, step: 10, unit: "px" });
  const mascotSize = edit("search.mascot.size", 380, { label: "Size", min: 160, max: 640, step: 10, unit: "px" });
  const cardW = edit("search.card.width", 880, { label: "Width", min: 600, max: 1100, step: 10, unit: "px" });
  const PHONE_TOP = (1080 - PHONE_W * 2.165) / 2;
  const SEARCH_Y = PHONE_TOP + PHONE_W * 0.265;
  const panelIn = useAnim("search.panel.in", { delay: 0, preset: "heavy", from: { x: 960 } });
  const cardIn = useAnim("search.card.in", { delay: 6, preset: "smooth", from: { x: -1000 } });
  const mascotAnim = useAnimSpec("search.mascot.in", { delay: 8, preset: "bouncy", from: { scale: 0.6, rotate: -14, opacity: 0 } });
  const mascotOut = useSpring(T.mascotOut, theme.spring.smooth);
  const phoneIn = useAnim("search.phone.in", { delay: 64, preset: "smooth", from: { y: 1000 } });
  const panelX = panelIn.x + ex.p * 960;
  const cardX = cardIn.x - ex.p * 1000;
  return (
    <AbsoluteFill>
      <Paper />
      {/* blue panel, right */}
      <Editable id="search.panel" label="Blue panel" style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: PANEL_W }}>
      <div style={{ position: "absolute", inset: 0, background: panelColor, transform: `translateX(${panelX}px)` }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 1 - mascotOut, transform: `scale(${1 - mascotOut * 0.4}) translateY(${mascotOut * 80}px)` }}>
          <Editable id="search.mascot" label="Mascot" kind="image"><Mascot size={mascotSize} anim={mascotAnim} /></Editable>
        </div>
        <div style={{ position: "absolute", left: (PANEL_W - PHONE_W) / 2, top: PHONE_TOP, transform: `translateY(${phoneIn.y}px)` }}>
          <Editable id="search.phone" label="iPhone" kind="image">
          <Phone width={PHONE_W}>
            <SearchScreen width={PHONE_W} />
          </Phone>
          </Editable>
        </div>
        {/* the thumb taps the search bar */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <TapThumb x={PANEL_W / 2 - 60} y={SEARCH_Y} at={T.tap} cell={7} containerHeight={1080} />
          <Ripple x={PANEL_W / 2 - 60} y={SEARCH_Y} at={T.tap} color="#fff" size={150} />
        </div>
      </div>
      </Editable>
      {/* Claude Code card, left */}
      <div style={{ position: "absolute", left: 90, top: 0, bottom: 0, display: "flex", alignItems: "center", transform: `translateX(${cardX}px)` }}>
        <Editable id="search.card" label="Claude Code card">
        <Card width={cardW} pad={34}>
          <CardHeader title="Claude Code  ·  thumb-mcp" />
          <Editable id="search.prompt" label="Prompt" kind="text" display="block"><UserPrompt text={prompt} start={T.prompt} size={30} cpf={1.3} /></Editable>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 30, paddingLeft: 0 }}>
            <ToolLine call={'open_app("instagram")'} start={T.tool1} doneAt={T.tool1Done} result="2.1s" size={21} />
            <ToolLine call={'search_in_app("instagram", "latte art")'} start={T.tool2} doneAt={T.tool2Done} result="6.4s" size={21} />
          </div>
          <div style={{ marginTop: 30 }}>
            <AssistantLine text="Done — results are on screen." start={T.reply} size={27} />
          </div>
        </Card>
        </Editable>
      </div>
      <Sfx id="search.sfx1" name="whoosh" at={T.panel} volume={0.35} />
      <Sfx id="search.sfx2" name="thump" at={T.panel + 4} volume={0.85} />
      <Sfx id="search.sfx3" name="pop" at={T.panel + 8} volume={0.7} />
      <Sfx id="search.sfx4" name="whoosh" at={T.card} volume={0.35} />
      <KeyTicks id="search.sfx5" volume={0.22} from={T.prompt} count={17} every={2} />
      <Sfx id="search.sfx6" shift={1} name="pop-soft" at={T.tool1} volume={0.5} />
      <Sfx id="search.sfx7" name="chime" at={T.tool1Done} volume={0.7} />
      <Sfx id="search.sfx8" shift={-4} name="pop-soft" at={T.tool2} volume={0.5} />
      <Sfx id="search.sfx9" shift={-14} name="whoosh" at={T.phone} volume={0.35} />
      <Sfx id="search.sfx10" name="click" at={T.tap} volume={0.8} />
      <KeyTicks id="search.sfx11" volume={0.22} from={T.typeStart} count={9} every={2} />
      {Array.from({ length: 6 }).map((_, i) => (
        <Sfx id={`search.sfx12.${i}`} key={i} name="pop-soft" at={T.tiles + i * 4} volume={0.5} />
      ))}
      <Sfx id="search.sfx13" name="chime" at={T.tool2Done} volume={0.7} />
      <Sfx id="search.sfx14" name="pop" at={T.reply} volume={0.7} />
      <Sfx id="search.sfx15" name="whoosh" at={dur - 12} volume={0.35} />
    </AbsoluteFill>
  );
};
