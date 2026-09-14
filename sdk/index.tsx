// Insyd Studio SDK — vendored into a Remotion project as src/insyd/index.tsx.
//
// A template declares what is editable, and the editor edits exactly that:
//   <Editable id="hero.card" x={0} y={0}>…</Editable>   position / scale / rotation / opacity / visibility / timing
//   useCopy("hero.title", "Meet the thing")             text
//   edit("hero.card.radius", 22)                         any literal: number, color, string, boolean, enum
//   brand("brand.hero", "#E9573F")                       global tokens (colors, fonts, backgrounds)
//   useAnim("hero.card.in", { delay: 6, preset: "smooth", from: { y: 40, opacity: 0 } })   entrances
//   sceneDuration(layout, "intro", 90)                   scene lengths
//
// Every value has a literal default *in the code*. The editor overrides values live through one
// plain `Layout` object passed as props, and on Save rewrites those literals in the source files.
import React, {
  createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useSyncExternalStore,
} from "react";
import { Audio, Easing, Internals, Sequence, interpolate, measureSpring, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export const INSYD_SDK_VERSION = 3;

// ---------- Layout: the single override document ----------

export type ElementTransform = {
  x: number; y: number; scale: number; rotate: number; opacity: number; hidden: boolean;
  /** frames to shift this element's animation later (negative = earlier) */
  delay: number;
  /** visibility window in the element's own frames: hidden before trimIn / after trimOut (null = open) */
  trimIn: number; trimOut: number | null;
  /** editor-only: cannot be moved or edited until unlocked */
  locked: boolean;
  /** time remap: the element's own clock runs `speed`× (2 = its animations play twice as fast) */
  speed: number;
  /** a linked instance of another Editable created in the editor (renders the same content) */
  cloneOf?: string;
};
export const DEFAULT_TRANSFORM: ElementTransform = { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, hidden: false, delay: 0, trimIn: 0, trimOut: null, locked: false, speed: 1 };

export type SoundKind = "sfx" | "music" | "voice";
export type SoundOverride = {
  /** frames to move the sound later (negative = earlier) */
  shift?: number;
  volume?: number;
  muted?: boolean;
  /** replacement file, relative to public/ (or an absolute URL) */
  src?: string;
  /** frames into the file to start from (trim in) */
  trimStart?: number;
  /** frames to play (trim out); undefined = to the end of the file */
  duration?: number | null;
  /** editor-only: cannot be moved or edited until unlocked */
  locked?: boolean;
  /** playback rate (1 = normal, 2 = twice as fast and half as long) */
  speed?: number;
  /** a sound created in the editor (no code counterpart) — rendered by <LayoutSounds/> */
  added?: boolean; at?: number; label?: string; kind?: SoundKind; loop?: boolean;
};

export type Layout = {
  version: number;
  elements: Record<string, Partial<ElementTransform>>;
  copy: Record<string, string>;
  scenes: Record<string, number>; // scene id -> duration in frames
  props: Record<string, unknown>; // edit()/brand()/useAnim() overrides by id
  sounds: Record<string, SoundOverride>; // <Sound id> overrides + editor-added sounds
};
export const emptyLayout = (): Layout => ({ version: INSYD_SDK_VERSION, elements: {}, copy: {}, scenes: {}, props: {}, sounds: {} });

export const mergeLayout = (base: Layout, over?: Partial<Layout> | null): Layout => ({
  version: INSYD_SDK_VERSION,
  elements: { ...base.elements, ...(over?.elements ?? {}) },
  copy: { ...base.copy, ...(over?.copy ?? {}) },
  scenes: { ...base.scenes, ...(over?.scenes ?? {}) },
  props: { ...base.props, ...(over?.props ?? {}) },
  sounds: { ...(base.sounds ?? {}), ...(over?.sounds ?? {}) },
});

// ---------- Contexts ----------

const LayoutContext = createContext<Layout>(emptyLayout());
/** null outside the editor; "main" for the visible player, "scan" for the hidden analysis player */
export type Channel = "main" | "scan";
const EditorModeContext = createContext<Channel | null>(null);
const OwnerContext = createContext<string | null>(null);

// brand() is called from plain code (theme getters), so overrides also live in a module variable
// that LayoutProvider refreshes synchronously during render — before any child renders.
let brandOverrides: Record<string, unknown> = {};

export const LayoutProvider: React.FC<{ layout?: Partial<Layout> | null; children: React.ReactNode }> = ({ layout, children }) => {
  const value = useMemo(() => mergeLayout(emptyLayout(), layout), [layout]);
  brandOverrides = value.props;
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};

export const useLayout = () => useContext(LayoutContext);
export const useIsEditor = () => useContext(EditorModeContext) !== null;
export const useChannel = () => useContext(EditorModeContext);

export const sceneDuration = (layout: Partial<Layout> | undefined, id: string, fallback: number) =>
  layout?.scenes?.[id] ?? fallback;

/** Scene length in frames, overridable from the timeline. */
export const useSceneDuration = (id: string, fallback: number): number => useLayout().scenes[id] ?? fallback;

// ---------- Editable values ----------

export type EditKind = "number" | "color" | "text" | "boolean" | "enum" | "anim" | "font";
export type EditMeta = {
  kind?: EditKind; label?: string; min?: number; max?: number; step?: number; options?: string[]; unit?: string;
  /** group shown in the inspector, e.g. "Panel" */
  group?: string;
};
export type PropEntry = { id: string; value: unknown; meta: EditMeta; owner: string; kind: EditKind };

const inferKind = (v: unknown, meta?: EditMeta): EditKind => {
  if (meta?.kind) return meta.kind;
  if (meta?.options) return "enum";
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "string") return /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(v.trim()) ? "color" : "text";
  if (v && typeof v === "object" && ("preset" in (v as object) || "from" in (v as object) || "delay" in (v as object))) return "anim";
  return "text";
};

/** An editable literal. Call during render; the default must be a literal in the source. */
export function edit<T>(id: string, value: T, meta?: EditMeta): T {
  const layout = useContext(LayoutContext);
  const editor = useContext(EditorModeContext);
  const owner = useContext(OwnerContext);
  if (editor) registry.registerProp({ id, value, meta: meta ?? {}, owner: owner ?? ownerFromId(id), kind: inferKind(value, meta) });
  return resolveOverride(value, layout.props[id]);
}

// Object values (animation specs) may be overridden partially: { delay: 40 } keeps the rest.
const resolveOverride = <T,>(value: T, o: unknown): T => {
  if (o === undefined) return value;
  if (value && o && typeof value === "object" && typeof o === "object" && !Array.isArray(value) && !Array.isArray(o)) return { ...(value as object), ...(o as object) } as T;
  return o as T;
};

/** A global brand token (color, font, background). Safe to call outside components. */
export function brand<T>(id: string, value: T, meta?: EditMeta): T {
  if (registry.isEditor()) registry.registerProp({ id, value, meta: meta ?? {}, owner: "brand", kind: inferKind(value, meta) });
  return resolveOverride(value, brandOverrides[id]);
}

/** Text that the editor can rewrite. */
export const useCopy = (id: string, fallback: string): string => {
  const layout = useContext(LayoutContext);
  const editor = useContext(EditorModeContext);
  const owner = useContext(OwnerContext);
  if (editor) registry.registerProp({ id, value: fallback, meta: { kind: "text" }, owner: owner ?? ownerFromId(id), kind: "text" });
  return layout.copy[id] ?? fallback;
};

const ownerFromId = (id: string) => (id.startsWith("brand.") ? "brand" : `scene:${id.split(".")[0]}`);

// ---------- Animation specs ----------

export const SPRING_PRESETS = {
  snappy: { damping: 16, stiffness: 170, mass: 0.6 },
  smooth: { damping: 22, stiffness: 95, mass: 1 },
  bouncy: { damping: 12, stiffness: 180, mass: 0.7 },
  pixel: { damping: 13, stiffness: 260, mass: 0.5 },
  heavy: { damping: 26, stiffness: 70, mass: 1.2 },
  gentle: { damping: 30, stiffness: 60, mass: 1 },
} as const;
export type SpringPreset = keyof typeof SPRING_PRESETS;
export const EASINGS = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.83, 0, 0.17, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  soft: Easing.bezier(0.25, 0.1, 0.25, 1),
  linear: (t: number) => t,
};

export type AnimSpec = {
  /** frames after the element mounts */
  delay?: number;
  /** spring preset, or "bezier" to use `duration` + `easing` */
  preset?: SpringPreset | "custom" | "bezier";
  damping?: number; stiffness?: number; mass?: number;
  duration?: number; easing?: keyof typeof EASINGS;
  /** starting offsets; each animates to its resting value */
  from?: { x?: number; y?: number; scale?: number; opacity?: number; rotate?: number; blur?: number };
  /** frames between staggered children */
  stagger?: number;
};

export type AnimState = {
  p: number; x: number; y: number; scale: number; opacity: number; rotate: number; blur: number;
  style: React.CSSProperties; spec: AnimSpec;
};

export const springConfigOf = (spec: AnimSpec) =>
  spec.preset === "custom"
    ? { damping: spec.damping ?? 20, stiffness: spec.stiffness ?? 100, mass: spec.mass ?? 1 }
    : SPRING_PRESETS[(spec.preset as SpringPreset) ?? "smooth"] ?? SPRING_PRESETS.smooth;

/** Progress of a spec at a local frame (0 = the frame the animation starts). */
export const animProgress = (spec: AnimSpec, frame: number, fps: number): number => {
  const f = frame - (spec.delay ?? 0);
  if (spec.preset === "bezier") {
    const d = Math.max(1, spec.duration ?? 20);
    return interpolate(f, [0, d], [0, 1], { easing: EASINGS[spec.easing ?? "out"], extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }
  return spring({ frame: f, fps, config: springConfigOf(spec) });
};

/** Frames until the animation has settled (for timeline bars). */
export const animLength = (spec: AnimSpec, fps: number): number =>
  spec.preset === "bezier" ? Math.max(1, spec.duration ?? 20) : measureSpring({ fps, config: springConfigOf(spec), threshold: 0.01 });

export const animAt = (spec: AnimSpec, frame: number, fps: number): AnimState => {
  const p = animProgress(spec, frame, fps);
  const from = spec.from ?? {};
  const x = (from.x ?? 0) * (1 - p), y = (from.y ?? 0) * (1 - p), rotate = (from.rotate ?? 0) * (1 - p);
  const scale = from.scale === undefined ? 1 : from.scale + (1 - from.scale) * p;
  const opacity = from.opacity === undefined ? 1 : from.opacity + (1 - from.opacity) * p;
  const blur = (from.blur ?? 0) * (1 - p);
  const style: React.CSSProperties = {
    opacity,
    transform: `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`,
    ...(blur ? { filter: `blur(${blur}px)` } : {}),
  };
  return { p, x, y, scale, opacity, rotate, blur, style, spec };
};

/** The editable spec only (for staggered children: pair with animAt). */
export const useAnimSpec = (id: string, spec: AnimSpec): AnimSpec => edit(id, spec, { kind: "anim" });

/** An editable entrance: returns progress + ready-to-use offsets/style at the current frame. */
export const useAnim = (id: string, spec: AnimSpec, offset = 0): AnimState => {
  const s = useAnimSpec(id, spec);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return animAt(s, frame - offset, fps);
};

// ---------- Registry (editor side; inert in normal renders) ----------

export type ElementKind = "block" | "text" | "image";
export type Rect = { x: number; y: number; w: number; h: number };
export type ElementEntry = {
  id: string; label: string; kind: ElementKind; el: HTMLElement;
  /** effective transform (code defaults + overrides) */
  transform: ElementTransform;
  /** the defaults written in the code (<Editable x={…}>) */
  defaults: Partial<ElementTransform>;
  copyId?: string;
  /** set on linked instances */
  cloneOf?: string;
};

type Listener = () => void;
const channels: Record<Channel, { elements: Map<string, ElementEntry>; listeners: Set<Listener>; snapshot: ElementEntry[]; scheduled: boolean }> = {
  main: { elements: new Map(), listeners: new Set(), snapshot: [], scheduled: false },
  scan: { elements: new Map(), listeners: new Set(), snapshot: [], scheduled: false },
};

export type SoundEntry = {
  id: string; label: string; kind: SoundKind;
  /** effective file (override or code), relative to public/ or absolute */
  src: string;
  /** resolved URL the browser can load */
  url: string;
  /** effective start, absolute timeline frame (includes shift) */
  absStart: number;
  /** effective shift (override or code default) */
  shift: number;
  volume: number; muted: boolean; repeat: number; every: number; loop: boolean;
  trimStart: number; duration: number | null; locked: boolean; speed: number;
  /** defaults as written in the code */
  defaults: { shift: number; volume: number; muted: boolean; src: string; trimStart: number; duration: number | null; locked: boolean; speed: number };
  added: boolean;
};
const soundChannels: Record<Channel, { sounds: Map<string, SoundEntry>; listeners: Set<Listener>; snapshot: SoundEntry[]; scheduled: boolean }> = {
  main: { sounds: new Map(), listeners: new Set(), snapshot: [], scheduled: false },
  scan: { sounds: new Map(), listeners: new Set(), snapshot: [], scheduled: false },
};
const scheduleSound = (channel: Channel) => {
  const ch = soundChannels[channel];
  if (ch.scheduled) return; ch.scheduled = true;
  queueMicrotask(() => { ch.scheduled = false; ch.snapshot = Array.from(ch.sounds.values()); ch.listeners.forEach((l) => l()); });
};
const props = new Map<string, PropEntry>();
const propListeners = new Set<Listener>();
let propSnapshot: PropEntry[] = [];
let root: HTMLElement | null = null;
let compSize = { width: 1920, height: 1080 };
let propScheduled = false, propDirty = false, editorMode = false;

const schedule = (kind: Channel | "prop") => {
  if (kind !== "prop") {
    const ch = channels[kind];
    if (ch.scheduled) return; ch.scheduled = true;
    queueMicrotask(() => { ch.scheduled = false; ch.snapshot = Array.from(ch.elements.values()); ch.listeners.forEach((l) => l()); });
  } else {
    if (propScheduled) return; propScheduled = true;
    queueMicrotask(() => { propScheduled = false; if (!propDirty) return; propDirty = false; propSnapshot = Array.from(props.values()); propListeners.forEach((l) => l()); });
  }
};

export const registry = {
  isEditor: () => editorMode,
  setEditor(v: boolean) { editorMode = v; },
  setRoot(el: HTMLElement | null, size?: { width: number; height: number }) { root = el; if (size) compSize = size; },
  reportElement(entry: ElementEntry, channel: Channel = "main") { channels[channel].elements.set(entry.id, entry); schedule(channel); },
  removeElement(id: string, channel: Channel = "main") { if (channels[channel].elements.delete(id)) schedule(channel); },
  registerProp(p: PropEntry) {
    const cur = props.get(p.id);
    if (cur && cur.owner === p.owner && cur.kind === p.kind && JSON.stringify(cur.value) === JSON.stringify(p.value) && JSON.stringify(cur.meta) === JSON.stringify(p.meta)) return;
    props.set(p.id, p); propDirty = true; schedule("prop");
  },
  reportSound(entry: SoundEntry, channel: Channel = "main") {
    const cur = soundChannels[channel].sounds.get(entry.id);
    if (cur && JSON.stringify(cur) === JSON.stringify(entry)) return;
    soundChannels[channel].sounds.set(entry.id, entry); scheduleSound(channel);
  },
  removeSound(id: string, channel: Channel = "main") { if (soundChannels[channel].sounds.delete(id)) scheduleSound(channel); },
  subscribeSounds(l: Listener, channel: Channel = "main") { soundChannels[channel].listeners.add(l); return () => { soundChannels[channel].listeners.delete(l); }; },
  getSounds: (channel: Channel = "main") => soundChannels[channel].snapshot,
  subscribeElements(l: Listener, channel: Channel = "main") { channels[channel].listeners.add(l); return () => { channels[channel].listeners.delete(l); }; },
  subscribeProps(l: Listener) { propListeners.add(l); return () => { propListeners.delete(l); }; },
  getElements: (channel: Channel = "main") => channels[channel].snapshot,
  getProps: () => propSnapshot,
  getElement: (id: string, channel: Channel = "main") => channels[channel].elements.get(id),
  /** Composition-space rect of a DOM element (measured on demand, never per frame for everything). */
  measure(el: HTMLElement): Rect | null {
    if (!root) return null;
    const r = root.getBoundingClientRect();
    const e = el.getBoundingClientRect();
    const s = r.width / compSize.width || 1;
    return { x: (e.left - r.left) / s, y: (e.top - r.top) / s, w: e.width / s, h: e.height / s };
  },
  measureId(id: string): Rect | null { const e = channels.main.elements.get(id); return e ? registry.measure(e.el) : null; },
  /** The innermost Editable under a client point. */
  hitTest(clientX: number, clientY: number): string | null {
    for (const el of document.elementsFromPoint(clientX, clientY)) {
      const hit = (el as HTMLElement).closest?.("[data-insyd-id]") as HTMLElement | null;
      if (hit && root?.contains(hit)) return hit.dataset.insydId ?? null;
    }
    return null;
  },
  scale(): number { return root ? root.getBoundingClientRect().width / compSize.width || 1 : 1; },
};
if (typeof window !== "undefined") (window as any).__insydRegistry = registry;

const mainSub = (l: Listener) => registry.subscribeElements(l, "main");
const mainGet = () => registry.getElements("main");
export const useElements = () => useSyncExternalStore(mainSub, mainGet, mainGet);
const soundSub = (l: Listener) => registry.subscribeSounds(l, "main");
const soundGet = () => registry.getSounds("main");
export const useSounds = () => useSyncExternalStore(soundSub, soundGet, soundGet);
export const useProps = () => useSyncExternalStore(registry.subscribeProps, registry.getProps, registry.getProps);

// ---------- Editable ----------

export type EditableProps = Partial<ElementTransform> & {
  id: string;
  label?: string;
  kind?: ElementKind;
  /** for kind="text": the copy id this element displays (defaults to `id`) */
  copyId?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  /** "inline" shrink-wraps the wrapper (default); "block" fills the parent width; "fill" is position:absolute inset 0 */
  display?: "inline" | "block" | "fill";
};

/**
 * Wraps a piece of UI so the editor can move/scale/hide/re-time it. Transform props on the
 * element (x, y, scale, rotate, opacity, hidden, delay) are the saved defaults; the layout overrides them.
 */
export const Editable: React.FC<EditableProps> = ({ id, label, kind = "block", copyId, children, style, display = "inline", ...defaults }) => {
  const layout = useContext(LayoutContext);
  const t: ElementTransform = { ...DEFAULT_TRANSFORM, ...stripUndefined(defaults), ...(layout.elements[id] ?? {}) };
  // Linked instances created in the editor. They share this element's place in the layout (the
  // shell below) but are independent siblings of the original: their own transform, timing and
  // visibility, and they survive the original being trimmed out or hidden.
  const clones = Object.entries(layout.elements).filter(([, o]) => o.cloneOf === id);
  const shellBase: React.CSSProperties =
    display === "fill" ? { position: "absolute", inset: 0 }
    : display === "block" ? { position: "relative", width: "100%" }
    : { position: "relative", width: "fit-content" };
  const fill = display !== "inline" || !!style?.position;
  const withDelay = (key: string, delay: number, node: React.ReactNode) =>
    delay !== 0 ? <Sequence key={key} from={delay} layout="none" name={`delay:${key}`}>{node}</Sequence> : <React.Fragment key={key}>{node}</React.Fragment>;
  return (
    <OwnerContext.Provider value={id}>
      <div style={{ ...shellBase, ...style, transform: undefined, opacity: undefined }} data-insyd-shell={id}>
        {withDelay(id, t.delay,
          <EditableBody id={id} label={label ?? id} kind={kind} copyId={copyId} t={t} defaults={stripUndefined(defaults)} fill={fill}>
            {children}
          </EditableBody>)}
        {clones.map(([cid, o]) => {
          const ct: ElementTransform = { ...DEFAULT_TRANSFORM, ...o };
          return withDelay(cid, ct.delay,
            <div style={{ position: "absolute", inset: 0, visibility: "visible" }}>
              <EditableBody id={cid} label={`${label ?? id} (copy)`} kind={kind} copyId={copyId} t={ct} defaults={{}} fill cloneOf={id}>
                {children}
              </EditableBody>
            </div>);
        })}
      </div>
    </OwnerContext.Provider>
  );
};

/**
 * Runs the children's clock at `speed`×. Remotion computes useCurrentFrame() as
 * timelinePosition − (cumulatedFrom + relativeFrom) of the enclosing Sequence, so re-basing
 * cumulatedFrom makes every hook below (useCurrentFrame, useAnim, nested Sequences) see the
 * remapped frame: round(localFrame × speed).
 */
const TimeScale: React.FC<{ speed: number; children: React.ReactNode }> = ({ speed, children }) => {
  const frame = useCurrentFrame();
  const timeline = Internals.useTimelinePosition();
  const ctx = useContext(Internals.SequenceContext);
  const config = useVideoConfig();
  const remapped = Math.round(frame * speed);
  const relativeFrom = ctx?.relativeFrom ?? 0;
  const value = useMemo(() => ({
    absoluteFrom: ctx?.absoluteFrom ?? 0, cumulatedNegativeFrom: ctx?.cumulatedNegativeFrom ?? 0,
    parentFrom: ctx?.parentFrom ?? 0, durationInFrames: ctx?.durationInFrames ?? config.durationInFrames, id: ctx?.id ?? "insyd-speed",
    width: ctx?.width ?? config.width, height: ctx?.height ?? config.height, premounting: ctx?.premounting ?? false, postmounting: ctx?.postmounting ?? false,
    premountDisplay: ctx?.premountDisplay ?? null,
    relativeFrom, cumulatedFrom: timeline - remapped - relativeFrom,
  }), [ctx, config.durationInFrames, config.width, config.height, timeline, remapped, relativeFrom]);
  return <Internals.SequenceContext.Provider value={value as any}>{children}</Internals.SequenceContext.Provider>;
};

const stripUndefined = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

const EditableBody: React.FC<{
  id: string; label: string; kind: ElementKind; copyId?: string; t: ElementTransform; defaults: Partial<ElementTransform>;
  fill: boolean; children: React.ReactNode; cloneOf?: string;
}> = ({ id, label, kind, copyId, t, defaults, fill, children, cloneOf }) => {
  const channel = useChannel();
  const editor = channel !== null;
  const ref = useRef<HTMLDivElement>(null);
  const frame = useCurrentFrame();
  const defaultsKey = JSON.stringify(defaults);
  // outside its visibility window the element keeps its layout footprint but is invisible and absent from the editor
  const inWindow = frame >= t.trimIn && (t.trimOut === null || t.trimOut === undefined || frame <= t.trimOut);
  useLayoutEffect(() => {
    if (!channel || !ref.current) return;
    if (!inWindow) { registry.removeElement(id, channel); return; }
    registry.reportElement({ id, label, kind, el: ref.current, transform: t, defaults, copyId, cloneOf }, channel);
  }, [channel, id, label, kind, copyId, cloneOf, defaultsKey, t.x, t.y, t.scale, t.rotate, t.opacity, t.hidden, t.delay, t.trimIn, t.trimOut, t.locked, inWindow]);
  useLayoutEffect(() => () => { if (channel) registry.removeElement(id, channel); }, [channel, id]);

  const gone = !inWindow || (t.hidden && !editor);
  const body = t.speed && t.speed !== 1 ? <TimeScale speed={t.speed}>{children}</TimeScale> : children;
  return (
    <div
      ref={ref}
      data-insyd-id={id}
      style={{
        position: "relative",
        ...(fill ? { width: "100%", height: "100%" } : {}),
        transform: `translate(${t.x}px, ${t.y}px) rotate(${t.rotate}deg) scale(${t.scale})`,
        transformOrigin: "50% 50%",
        opacity: t.hidden && editor && inWindow ? 0.15 : t.opacity,
        visibility: gone ? "hidden" : "visible",
        pointerEvents: gone ? "none" : undefined,
      }}
    >
      {body}
    </div>
  );
};

// ---------- Sound ----------

export const resolveAudioSrc = (src: string) => (/^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src));

export type SoundProps = {
  id: string;
  /** file relative to public/ (or an absolute URL) */
  src: string;
  /** start frame, relative to the enclosing Sequence */
  at?: number;
  volume?: number;
  muted?: boolean;
  /** saved re-timing, in frames (the editor writes this) */
  shift?: number;
  label?: string;
  kind?: SoundKind;
  /** play the file `repeat` times, `every` frames apart (key ticks, counters) */
  repeat?: number;
  every?: number;
  loop?: boolean;
  /** frames into the file to start from */
  trimStart?: number;
  /** frames to play; omit to play to the end */
  duration?: number;
  /** editor-only lock (no effect on rendering) */
  locked?: boolean;
  /** playback rate: 2 plays twice as fast (and half as long) */
  speed?: number;
  /** frames to fade in from silence / out to silence */
  fadeIn?: number;
  fadeOut?: number;
  /** editor-added sound */
  added?: boolean;
};

/**
 * An editable sound. Plays `src` at `at` (+ `shift`); the editor can re-time, replace, re-level
 * and mute it, and shows it as a clip on the audio tracks.
 */
export const Sound: React.FC<SoundProps> = ({ id, src, at = 0, volume = 1, muted = false, shift = 0, label, kind = "sfx", repeat = 1, every = 2, loop = false, trimStart = 0, duration, locked = false, speed = 1, fadeIn = 0, fadeOut = 0, added = false }) => {
  const layout = useContext(LayoutContext);
  const channel = useChannel();
  const o = layout.sounds?.[id] ?? {};
  const eff = {
    src: o.src ?? src, volume: o.volume ?? volume, muted: o.muted ?? muted, shift: o.shift ?? shift,
    trimStart: o.trimStart ?? trimStart, duration: o.duration === undefined ? (duration ?? null) : o.duration, locked: o.locked ?? locked,
    speed: Math.max(0.1, o.speed ?? speed ?? 1),
  };
  const start = at + eff.shift;
  const local = useCurrentFrame();
  const timeline = Internals.useTimelinePosition();
  const absStart = timeline - local + start;
  const url = resolveAudioSrc(eff.src);
  useLayoutEffect(() => {
    if (!channel) return;
    registry.reportSound({
      id, label: label ?? id, kind, src: eff.src, url, absStart, shift: eff.shift, volume: eff.volume, muted: eff.muted, repeat, every, loop,
      trimStart: eff.trimStart, duration: eff.duration, locked: eff.locked, speed: eff.speed,
      defaults: { shift, volume, muted, src, trimStart, duration: duration ?? null, locked, speed }, added,
    }, channel);
  }, [channel, id, label, kind, eff.src, url, absStart, eff.shift, eff.volume, eff.muted, eff.trimStart, eff.duration, eff.locked, eff.speed, repeat, every, loop, shift, volume, muted, src, trimStart, duration, locked, speed, added]);
  useLayoutEffect(() => () => { if (channel) registry.removeSound(id, channel); }, [channel, id]);
  if (eff.muted || eff.volume <= 0) return null;
  const total = eff.duration ?? null;
  const vol = fadeIn || (fadeOut && total)
    ? (f: number) => {
        let v = eff.volume;
        if (fadeIn) v *= Math.min(1, Math.max(0, f / fadeIn));
        if (fadeOut && total) v *= Math.min(1, Math.max(0, (total - f) / fadeOut));
        return v;
      }
    : eff.volume;
  return (
    <>
      {Array.from({ length: Math.max(1, repeat) }).map((_, i) => (
        <Sequence key={i} from={start + i * every} durationInFrames={eff.duration ?? undefined} layout="none" name={`sound:${id}`}>
          <Audio src={url} volume={vol} loop={loop} startFrom={eff.trimStart || undefined} playbackRate={eff.speed !== 1 ? eff.speed : undefined} />
        </Sequence>
      ))}
    </>
  );
};

/** Renders sounds that were added in the editor (stored in the layout, not in code). Put it once in the root. */
export const LayoutSounds: React.FC = () => {
  const layout = useContext(LayoutContext);
  return (
    <>
      {Object.entries(layout.sounds ?? {}).filter(([, o]) => o.added && o.src).map(([id, o]) => (
        <Sound key={id} id={id} src={o.src!} at={o.at ?? 0} volume={o.volume ?? 0.8} muted={o.muted} label={o.label ?? o.src} kind={o.kind ?? "sfx"} loop={o.loop} trimStart={o.trimStart} duration={o.duration ?? undefined} locked={o.locked} speed={o.speed} added />
      ))}
    </>
  );
};

// ---------- Project definition ----------

export type SceneDef = { id: string; label: string; durationInFrames: number };

export type ProjectDefinition<P extends { layout?: Partial<Layout> } = { layout?: Partial<Layout> }> = {
  id: string;
  name: string;
  component: React.ComponentType<P>;
  width: number;
  height: number;
  fps: number;
  scenes: SceneDef[];
  defaultLayout: Layout;
  /** entry point relative to the project root, for rendering (e.g. "src/index.ts") */
  entryPoint: string;
  /** where unresolved overrides are saved, relative to the project root */
  layoutFile: string;
  /** total duration for a given layout; defaults to the sum of scene durations */
  durationInFrames?: (layout: Layout) => number;
  /** touch every brand() token once so the Brand panel is complete before every scene has rendered */
  registerBrand?: () => void;
};

export const defineProject = <P extends { layout?: Partial<Layout> }>(def: ProjectDefinition<P>): ProjectDefinition<P> => def;

export const projectDuration = (def: ProjectDefinition<any>, layout: Layout) =>
  def.durationInFrames
    ? def.durationInFrames(layout)
    : def.scenes.reduce((a, s) => a + sceneDuration(layout, s.id, s.durationInFrames), 0);

/** Used by the editor to host a project's composition inside the Player. */
export const EditorHost: React.FC<{ def: ProjectDefinition<any>; layout: Layout; channel?: Channel }> = ({ def, layout, channel = "main" }) => {
  const Comp = def.component;
  registry.setEditor(true);
  const warmed = useRef(false);
  if (!warmed.current) { warmed.current = true; try { def.registerBrand?.(); } catch {} }
  // Stable ref callback: an inline one is detached/re-attached on every re-render, and child
  // layout effects (which measure against the root) run before the parent's ref is re-attached.
  // Only the visible player owns the measurement root.
  const setRoot = useCallback((el: HTMLDivElement | null) => { if (channel === "main") registry.setRoot(el, { width: def.width, height: def.height }); }, [def.width, def.height, channel]);
  return (
    <EditorModeContext.Provider value={channel}>
      <div ref={setRoot} style={{ position: "absolute", inset: 0 }}>
        <Comp layout={layout} />
      </div>
    </EditorModeContext.Provider>
  );
};
