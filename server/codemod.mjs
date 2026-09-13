// Finds editable literals in a Remotion project's source and rewrites them in place.
//
// Locators (all keyed by the string-literal id in the code):
//   call:<id>    2nd argument of edit("<id>", …) / brand(…) / useCopy(…) / useAnim(…) / useAnimSpec(…)
//   jsx:<id>     transform attributes on <Editable id="<id>" …>
//   scene:<id>   `duration: <number>` in an object literal that also has `id: "<id>"` (the SCENES table)
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import MagicString from "magic-string";

const CALLS = new Set(["edit", "brand", "useCopy", "useAnim", "useAnimSpec", "useSceneDuration"]);
const TRANSFORM_KEYS = ["x", "y", "scale", "rotate", "opacity", "hidden", "delay", "trimIn", "trimOut", "locked"];
const SOUND_TAGS = new Set(["Sound", "Sfx", "KeyTicks"]);
const SOUND_KEYS = ["shift", "volume", "muted", "src", "trimStart", "duration", "locked"];
const SOUND_DEFAULTS = { shift: 0, muted: false, trimStart: 0, locked: false };
const TRANSFORM_DEFAULTS = { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, hidden: false, delay: 0, trimIn: 0, trimOut: null, locked: false };

export const listSourceFiles = (dir) => {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === "insyd" || e.name.startsWith(".")) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx?|jsx?|mjs)$/.test(e.name) && !e.name.endsWith(".d.ts")) out.push(p);
    }
  };
  walk(path.join(dir, "src"));
  return out;
};

const walk = (node, visit, parent = null) => {
  if (!node || typeof node.type !== "string") return;
  visit(node, parent);
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "leadingComments" || key === "trailingComments" || key === "innerComments") continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === "string" && walk(c, visit, node));
    else if (v && typeof v.type === "string") walk(v, visit, node);
  }
};

const litValue = (n) => {
  if (!n) return undefined;
  switch (n.type) {
    case "StringLiteral": return n.value;
    case "NumericLiteral": return n.value;
    case "BooleanLiteral": return n.value;
    case "NullLiteral": return null;
    case "UnaryExpression": return n.operator === "-" ? -litValue(n.argument) : litValue(n.argument);
    case "TemplateLiteral": return n.expressions.length === 0 ? n.quasis[0].value.cooked : undefined;
    case "ObjectExpression": {
      const o = {};
      for (const p of n.properties) {
        if (p.type !== "ObjectProperty") return undefined;
        const k = p.key.type === "Identifier" ? p.key.name : p.key.type === "StringLiteral" ? p.key.value : undefined;
        if (k === undefined) return undefined;
        const v = litValue(p.value); if (v === undefined) return undefined; o[k] = v;
      }
      return o;
    }
    case "ArrayExpression": { const a = n.elements.map(litValue); return a.some((v) => v === undefined) ? undefined : a; }
    case "JSXExpressionContainer": return litValue(n.expression);
    default: return undefined;
  }
};

/** Build the locator index for one file. */
export const indexFile = (file) => {
  const code = fs.readFileSync(file, "utf8");
  let ast;
  try { ast = parse(code, { sourceType: "module", plugins: ["typescript", "jsx"], errorRecovery: true }); }
  catch (e) { return { file, code, entries: [], error: e.message }; }
  const entries = [];
  walk(ast.program, (n) => {
    if (n.type === "CallExpression" && n.callee.type === "Identifier" && CALLS.has(n.callee.name) && n.arguments[0]?.type === "StringLiteral" && n.arguments[1]) {
      const arg = n.arguments[1];
      entries.push({ locator: `call:${n.arguments[0].value}`, fn: n.callee.name, start: arg.start, end: arg.end, value: litValue(arg), literal: litValue(arg) !== undefined });
    }
    if (n.type === "JSXOpeningElement" && n.name.type === "JSXIdentifier" && n.name.name === "Editable") {
      const idAttr = n.attributes.find((a) => a.type === "JSXAttribute" && a.name.name === "id" && a.value?.type === "StringLiteral");
      if (!idAttr) return;
      const attrs = {};
      for (const a of n.attributes) {
        if (a.type !== "JSXAttribute" || !TRANSFORM_KEYS.includes(a.name.name)) continue;
        attrs[a.name.name] = { start: a.start, end: a.end, value: a.value === null ? true : litValue(a.value) };
      }
      // insertion point: right after the id attribute
      entries.push({ locator: `jsx:${idAttr.value.value}`, start: n.start, end: n.end, insertAt: idAttr.end, attrs, selfClosing: n.selfClosing });
    }
    if (n.type === "JSXOpeningElement" && n.name.type === "JSXIdentifier" && SOUND_TAGS.has(n.name.name)) {
      const idAttr = n.attributes.find((a) => a.type === "JSXAttribute" && a.name.name === "id" && a.value?.type === "StringLiteral");
      if (!idAttr) return;
      const attrs = {};
      for (const a of n.attributes) {
        if (a.type !== "JSXAttribute" || !SOUND_KEYS.includes(a.name.name)) continue;
        const v = a.value === null ? true : litValue(a.value);
        attrs[a.name.name] = { start: a.start, end: a.end, value: v, literal: v !== undefined };
      }
      entries.push({ locator: `sound:${idAttr.value.value}`, start: n.start, end: n.end, insertAt: idAttr.end, attrs });
    }
    if (n.type === "ObjectExpression") {
      const idP = n.properties.find((p) => p.type === "ObjectProperty" && p.key.type === "Identifier" && p.key.name === "id" && p.value.type === "StringLiteral");
      const durP = n.properties.find((p) => p.type === "ObjectProperty" && p.key.type === "Identifier" && (p.key.name === "duration" || p.key.name === "durationInFrames") && p.value.type === "NumericLiteral");
      if (idP && durP) entries.push({ locator: `scene:${idP.value.value}`, start: durP.value.start, end: durP.value.end, value: durP.value.value, literal: true });
    }
  });
  return { file, code, entries };
};

export const buildIndex = (dir) => {
  const files = listSourceFiles(dir).map(indexFile);
  const byLocator = new Map();
  for (const f of files) for (const e of f.entries) if (!byLocator.has(e.locator)) byLocator.set(e.locator, { ...e, file: f.file });
  return { files, byLocator };
};

/** Serialize a value as a JS literal (unquoted identifier keys, double-quoted strings). */
export const toLiteral = (v, indent = "") => {
  if (v === null) return "null";
  if (typeof v === "number") return Number.isFinite(v) ? String(Math.round(v * 1000) / 1000) : "0";
  if (typeof v === "boolean") return String(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map((x) => toLiteral(x, indent)).join(", ")}]`;
  if (typeof v === "object") {
    const keys = Object.keys(v).filter((k) => v[k] !== undefined);
    if (!keys.length) return "{}";
    return `{ ${keys.map((k) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${toLiteral(v[k], indent)}`).join(", ")} }`;
  }
  return "undefined";
};

/**
 * Apply layout overrides to the source. Returns { changed: [files], applied: {…ids}, unresolved: {…} }.
 * `layout` = { elements, copy, scenes, props } with only the overrides to persist.
 */
export const applyLayout = (dir, layout) => {
  const { byLocator } = buildIndex(dir);
  const edits = new Map(); // file -> [{start,end,text}]
  const push = (file, start, end, text) => { if (!edits.has(file)) edits.set(file, []); edits.get(file).push({ start, end, text }); };
  const applied = { elements: {}, copy: {}, scenes: {}, props: {}, sounds: {} };
  const unresolved = { elements: {}, copy: {}, scenes: {}, props: {}, sounds: {} };

  for (const [id, v] of Object.entries(layout.props ?? {})) {
    const e = byLocator.get(`call:${id}`);
    if (e && e.literal) { push(e.file, e.start, e.end, toLiteral(mergeSpec(e.value, v))); applied.props[id] = v; } else unresolved.props[id] = v;
  }
  for (const [id, text] of Object.entries(layout.copy ?? {})) {
    const e = byLocator.get(`call:${id}`);
    if (e && e.fn === "useCopy") { push(e.file, e.start, e.end, toLiteral(text)); applied.copy[id] = text; } else unresolved.copy[id] = text;
  }
  for (const [id, frames] of Object.entries(layout.scenes ?? {})) {
    const e = byLocator.get(`scene:${id}`);
    if (e) { push(e.file, e.start, e.end, toLiteral(frames)); applied.scenes[id] = frames; } else unresolved.scenes[id] = frames;
  }
  // Sounds: replace/insert each overridden attribute; editor-added sounds have no code and stay in layout.json.
  for (const [id, o] of Object.entries(layout.sounds ?? {})) {
    const e = byLocator.get(`sound:${id}`);
    if (!e || o.added) { unresolved.sounds[id] = o; continue; }
    for (const k of SOUND_KEYS) {
      if (o[k] === undefined) continue;
      const isDefault = o[k] === null || (SOUND_DEFAULTS[k] !== undefined && o[k] === SOUND_DEFAULTS[k]);
      const text = isDefault ? "" : o[k] === true ? ` ${k}` : typeof o[k] === "string" ? ` ${k}=${JSON.stringify(o[k])}` : ` ${k}={${toLiteral(o[k])}}`;
      const cur = e.attrs[k];
      if (cur) push(e.file, cur.start - 1, cur.end, text);
      else if (text) push(e.file, e.insertAt, e.insertAt, text);
    }
    applied.sounds[id] = o;
  }
  for (const [id, t] of Object.entries(layout.elements ?? {})) {
    const e = byLocator.get(`jsx:${id}`);
    if (!e || t.cloneOf) { unresolved.elements[id] = t; continue; }
    // final attribute values = existing code defaults overridden by the layout
    const final = {};
    for (const k of TRANSFORM_KEYS) {
      const cur = e.attrs[k]?.value;
      const next = t[k] !== undefined ? t[k] : cur;
      if (next !== undefined && next !== null && next !== TRANSFORM_DEFAULTS[k]) final[k] = next;
    }
    // remove all existing transform attrs, then insert the final set after id=
    const removals = Object.values(e.attrs).sort((a, b) => b.start - a.start);
    for (const a of removals) push(e.file, a.start - 1, a.end, ""); // -1 eats the preceding space
    const text = Object.entries(final).map(([k, v]) => (v === true ? ` ${k}` : ` ${k}={${toLiteral(v)}}`)).join("");
    if (text) push(e.file, e.insertAt, e.insertAt, text);
    applied.elements[id] = t;
  }

  const changed = [];
  for (const [file, list] of edits) {
    const src = fs.readFileSync(file, "utf8");
    const ms = new MagicString(src);
    // apply from the end so ranges stay valid; insertions at equal positions keep order
    list.sort((a, b) => b.start - a.start || b.end - a.end);
    for (const ed of list) {
      if (ed.start === ed.end) ms.appendLeft(ed.start, ed.text);
      else ms.overwrite(ed.start, ed.end, ed.text);
    }
    const out = ms.toString();
    if (out !== src) { fs.writeFileSync(file, out); changed.push(file); }
  }
  return { changed, applied, unresolved };
};

// For anim specs, an override may be partial (e.g. only delay) — merge onto the code literal.
const mergeSpec = (codeValue, override) =>
  codeValue && typeof codeValue === "object" && !Array.isArray(codeValue) && override && typeof override === "object" && !Array.isArray(override)
    ? { ...codeValue, ...override }
    : override;
