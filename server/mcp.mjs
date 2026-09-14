// MCP server for Studio by Insyd (Streamable HTTP at /mcp). Claude Desktop / Claude Code connect to
// it and drive the editor: read every scene, element, sound and editable value, change them live
// (each call is one undo step in the UI), save into the code, render, and look at frames.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { bridge } from "./bridge.mjs";

const text = (s) => ({ content: [{ type: "text", text: typeof s === "string" ? s : JSON.stringify(s, null, 2) }] });
const err = (e) => ({ content: [{ type: "text", text: `Error: ${e.message ?? e}` }], isError: true });

/** ctx: { projectDir(), buildIndex, applyLayout, buildBrief, getBundle, renderStill, selectComposition, startRender, renderJob, listAudio } */
export const createMcpServer = (ctx) => {
  const server = new McpServer({ name: "insyd-studio", version: "1.0.0" }, {
    instructions: "You control Studio by Insyd, a video editor for Remotion projects. Prefer these tools over editing files: changes apply live in the editor the person is watching and are undoable. Start with get_project, then list_elements / list_sounds / list_values to learn ids. Values are addressed by id; sounds can be changed in bulk with set_sounds using a filter. Call save to write the current state into the project's source files. Use preview_frame to look at the picture.",
  });
  const live = () => bridge.connected();
  const need = async (method, params) => {
    if (live()) return bridge.call(method, params);
    throw new Error("Studio is not open in a browser. Open http://localhost:4321 (or run the editor) and try again.");
  };
  // mutations go through the tab; notify the UI so it can toast what happened
  const mutate = async (summary, action, args) => {
    const r = await need("apply", { action, args });
    const n = r && Array.isArray(r.changed) ? r.changed.length : null;
    bridge.notify("mcp", { summary: typeof summary === "function" ? summary(n) : summary });
    return r;
  };
  const pct = (v) => (v === undefined ? "" : ` · volume ${Math.round(v * 100)}%`);

  server.registerTool("get_project", { title: "Project overview", description: "Composition size/fps/duration, scenes with start frames, counts, whether the editor tab is connected, unsaved change counts, playhead and selection.", inputSchema: {} }, async () => {
    try {
      if (!live()) return text({ connected: false, project: ctx.projectDir(), note: "Editor tab not connected — open http://localhost:4321" });
      return text({ connected: true, project: ctx.projectDir(), ...(await bridge.call("state")) });
    } catch (e) { return err(e); }
  });
  server.registerTool("get_context", { title: "Full editing brief", description: "The same markdown brief Studio writes to CLAUDE.md: the editing contract plus tables of scenes, elements, sounds, text and editable values with current values and files.", inputSchema: {} }, async () => {
    try { const payload = await need("context"); return text(ctx.buildBrief(payload)); } catch (e) { return err(e); }
  });
  server.registerTool("list_scenes", { title: "List scenes", description: "Scenes with id, label, start frame and duration.", inputSchema: {} }, async () => {
    try { return text((await need("state")).scenes); } catch (e) { return err(e); }
  });
  server.registerTool("list_elements", { title: "List elements", description: "Every editable element: id, label, kind, scene, frames on screen, transform, and the ids of its editable values/animations. Filter by scene id or a text query.", inputSchema: { scene: z.string().optional(), query: z.string().optional() } }, async ({ scene, query }) => {
    try {
      let els = await need("elements");
      if (scene) els = els.filter((e) => e.sceneId === scene);
      if (query) { const q = query.toLowerCase(); els = els.filter((e) => e.id.toLowerCase().includes(q) || e.label.toLowerCase().includes(q)); }
      return text(els);
    } catch (e) { return err(e); }
  });
  server.registerTool("get_element", { title: "Element detail", description: "One element with its transform, code defaults, editable values and animation specs (current values).", inputSchema: { id: z.string() } }, async ({ id }) => {
    try { return text(await need("element", { id })); } catch (e) { return err(e); }
  });
  server.registerTool("list_sounds", { title: "List sounds", description: "Every sound clip: id, label, file, start frame, length, volume, muted, locked, kind (sfx/music). Filter by a query matched against id, label or file (e.g. 'whoosh').", inputSchema: { query: z.string().optional(), kind: z.enum(["sfx", "music", "voice"]).optional() } }, async ({ query, kind }) => {
    try {
      let s = await need("sounds");
      if (kind) s = s.filter((x) => x.kind === kind);
      if (query) { const q = query.toLowerCase(); s = s.filter((x) => x.id.toLowerCase().includes(q) || x.label.toLowerCase().includes(q) || x.src.toLowerCase().includes(q)); }
      return text(s);
    } catch (e) { return err(e); }
  });
  server.registerTool("list_values", { title: "List editable values", description: "Editable values (edit / brand tokens / animation specs) and text: id, kind, current value, default, meta (min/max/options/label), owner. Filter by id prefix (e.g. 'brand.' or 'search.') or kind.", inputSchema: { prefix: z.string().optional(), kind: z.enum(["number", "color", "text", "boolean", "enum", "anim", "font"]).optional() } }, async ({ prefix, kind }) => {
    try {
      let v = await need("values");
      if (prefix) v = v.filter((x) => x.id.startsWith(prefix));
      if (kind) v = v.filter((x) => x.kind === kind);
      return text(v);
    } catch (e) { return err(e); }
  });

  server.registerTool("set_text", { title: "Set text", description: "Change a text value (useCopy id). Use | for a line break where the template supports it.", inputSchema: { id: z.string(), text: z.string() } }, async ({ id, text: t }) => {
    try { await mutate(`changed the text of ${id}`, "setCopy", { id, text: t }); return text({ ok: true, id, text: t }); } catch (e) { return err(e); }
  });
  server.registerTool("set_value", { title: "Set an editable value", description: "Change an edit()/brand()/animation value by id. Numbers, colours ('#E9573F'), booleans, enum strings, or for animations an object like {delay: 12, preset: 'bouncy', from: {y: 40, opacity: 0}} (merged onto the current spec).", inputSchema: { id: z.string(), value: z.any() } }, async ({ id, value }) => {
    try { await mutate(`set ${id} to ${JSON.stringify(value)}`, "setProp", { id, value }); return text({ ok: true, id, value }); } catch (e) { return err(e); }
  });
  server.registerTool("set_values", { title: "Set many values", description: "Batch of {id, value} changes applied as one undo step.", inputSchema: { changes: z.array(z.object({ id: z.string(), value: z.any() })) } }, async ({ changes }) => {
    try { await mutate(`changed ${changes.length} values`, "setProps", { changes }); return text({ ok: true, count: changes.length }); } catch (e) { return err(e); }
  });
  const transformSchema = { x: z.number().optional(), y: z.number().optional(), dx: z.number().optional(), dy: z.number().optional(), scale: z.number().optional(), rotate: z.number().optional(), opacity: z.number().optional(), hidden: z.boolean().optional(), delay: z.number().optional(), trimIn: z.number().optional(), trimOut: z.number().nullable().optional(), locked: z.boolean().optional(), speed: z.number().min(0.25).max(4).optional() };
  server.registerTool("update_element", { title: "Move / scale / hide / re-time an element", description: "Set transform fields on one element: x, y (or relative dx, dy), scale, rotate, opacity, hidden, delay (frames), trimIn/trimOut (visibility window in its own frames), locked, speed (time remap: 2 = its animations run twice as fast).", inputSchema: { id: z.string(), ...transformSchema } }, async ({ id, ...patch }) => {
    try { const r = await mutate(`updated ${id}`, "updateElements", { ids: [id], patch }); return text({ ok: true, ...r }); } catch (e) { return err(e); }
  });
  server.registerTool("update_elements", { title: "Update several elements", description: "Apply the same transform patch to many elements (ids, or all elements of a scene).", inputSchema: { ids: z.array(z.string()).optional(), scene: z.string().optional(), ...transformSchema } }, async ({ ids, scene, ...patch }) => {
    try { const r = await mutate((n) => `updated ${n} elements`, "updateElements", { ids, scene, patch }); return text({ ok: true, ...r }); } catch (e) { return err(e); }
  });
  const soundPatch = { volume: z.number().min(0).max(2).optional().describe("0–1 (1 = 100%)"), muted: z.boolean().optional(), shift: z.number().optional().describe("frames later (negative = earlier); relative to the code timing"), dshift: z.number().optional().describe("move by this many frames from the current position"), src: z.string().optional().describe("replacement file relative to public/, e.g. sfx/pop.wav"), trimStart: z.number().optional(), duration: z.number().nullable().optional(), locked: z.boolean().optional(), speed: z.number().min(0.25).max(4).optional().describe("playback rate: 2 = twice as fast and half as long") };
  server.registerTool("set_sound", { title: "Change one sound", description: "Volume, mute, timing (shift/dshift), file, trim, speed or lock for one sound id.", inputSchema: { id: z.string(), ...soundPatch } }, async ({ id, ...patch }) => {
    try { const r = await mutate(`changed sound ${id}${pct(patch.volume)}`, "setSounds", { ids: [id], patch }); return text({ ok: true, ...r }); } catch (e) { return err(e); }
  });
  server.registerTool("set_sounds", { title: "Change many sounds", description: "Apply the same change to every sound matching a filter — e.g. {query: 'whoosh', volume: 0.1} sets all whooshes to 10%. Filter by ids, a query (id/label/file contains), or kind. One undo step.", inputSchema: { ids: z.array(z.string()).optional(), query: z.string().optional(), kind: z.enum(["sfx", "music", "voice"]).optional(), ...soundPatch } }, async ({ ids, query, kind, ...patch }) => {
    try { const r = await mutate((n) => `changed ${n} sounds${query ? ` matching “${query}”` : ""}${pct(patch.volume)}${patch.muted !== undefined ? (patch.muted ? " · muted" : " · unmuted") : ""}`, "setSounds", { ids, query, kind, patch }); return text({ ok: true, ...r }); } catch (e) { return err(e); }
  });
  server.registerTool("add_sound", { title: "Add a sound", description: "Place an audio file from public/ (see list_audio_files) at a frame.", inputSchema: { src: z.string(), at: z.number(), volume: z.number().optional(), kind: z.enum(["sfx", "music", "voice"]).optional(), label: z.string().optional() } }, async (a) => {
    try { const r = await mutate(`added ${a.src} at f${a.at}`, "addSound", a); return text({ ok: true, ...r }); } catch (e) { return err(e); }
  });
  server.registerTool("remove_sound", { title: "Remove a sound", description: "Removes an added sound; a sound declared in code is muted instead.", inputSchema: { id: z.string() } }, async ({ id }) => {
    try { const r = await mutate(`removed ${id}`, "removeSound", { id }); return text({ ok: true, ...r }); } catch (e) { return err(e); }
  });
  server.registerTool("list_audio_files", { title: "Audio files in the project", description: "Audio files under public/ usable as sound sources.", inputSchema: {} }, async () => {
    try { return text(ctx.listAudio()); } catch (e) { return err(e); }
  });
  server.registerTool("set_scene_duration", { title: "Trim a scene", description: "Set a scene's duration in frames; later scenes shift.", inputSchema: { id: z.string(), frames: z.number().int().min(6) } }, async ({ id, frames }) => {
    try { await mutate(`set scene ${id} to ${frames} frames`, "setSceneDuration", { id, frames }); return text({ ok: true }); } catch (e) { return err(e); }
  });

  server.registerTool("set_scene_speed", { title: "Speed up / slow down a scene", description: "Play everything in a scene at a rate (0.25–4; 2 = twice as fast). Its duration is rescaled so it still shows the same content; later scenes shift.", inputSchema: { id: z.string(), speed: z.number().min(0.25).max(4) } }, async ({ id, speed }) => {
    try { await mutate(`set scene ${id} to ${speed}× speed`, "setSceneSpeed", { id, speed }); return text({ ok: true }); } catch (e) { return err(e); }
  });

  server.registerTool("select", { title: "Select in the editor", description: "Highlight elements or sounds in the UI (so the person sees what you mean).", inputSchema: { type: z.enum(["element", "sound", "scene"]), ids: z.array(z.string()) } }, async ({ type, ids }) => {
    try { await need("apply", { action: "select", args: { type, ids } }); return text({ ok: true }); } catch (e) { return err(e); }
  });
  server.registerTool("seek", { title: "Move the playhead", description: "Seek the editor to a frame.", inputSchema: { frame: z.number().int().min(0) } }, async ({ frame }) => {
    try { await need("apply", { action: "seek", args: { frame } }); return text({ ok: true, frame }); } catch (e) { return err(e); }
  });
  server.registerTool("play", { title: "Play", description: "Start playback in the editor.", inputSchema: {} }, async () => { try { await need("apply", { action: "play", args: {} }); return text({ ok: true }); } catch (e) { return err(e); } });
  server.registerTool("pause", { title: "Pause", description: "Pause playback.", inputSchema: {} }, async () => { try { await need("apply", { action: "pause", args: {} }); return text({ ok: true }); } catch (e) { return err(e); } });
  server.registerTool("undo", { title: "Undo", description: "Undo the last change (yours or the person's).", inputSchema: {} }, async () => { try { await need("apply", { action: "undo", args: {} }); bridge.notify("mcp", { summary: "undid the last change" }); return text({ ok: true }); } catch (e) { return err(e); } });
  server.registerTool("redo", { title: "Redo", description: "Redo.", inputSchema: {} }, async () => { try { await need("apply", { action: "redo", args: {} }); return text({ ok: true }); } catch (e) { return err(e); } });

  server.registerTool("save", { title: "Save into the code", description: "Write every pending change into the project's source files (and layout.json for values without a code literal). The editor reloads afterwards. Returns the changed files.", inputSchema: {} }, async () => {
    try { const r = await need("save"); bridge.notify("mcp", { summary: "saved into the source files" }); return text(r); } catch (e) { return err(e); }
  });
  server.registerTool("export_video", { title: "Export MP4", description: "Render the current state to an MP4 on the Desktop. Returns a job id; poll export_status.", inputSchema: { fileName: z.string().optional(), quality: z.enum(["best", "high", "balanced", "small"]).optional() } }, async ({ fileName, quality }) => {
    try { const r = await need("export", { fileName, quality }); return text(r); } catch (e) { return err(e); }
  });
  server.registerTool("export_status", { title: "Export progress", description: "Stage/progress/output path of a render job.", inputSchema: { id: z.string() } }, async ({ id }) => {
    try { const j = ctx.renderJob(id); if (!j) throw new Error("Unknown job"); return text({ stage: j.stage, progress: j.progress, outputLocation: j.outputLocation, error: j.error }); } catch (e) { return err(e); }
  });
  server.registerTool("preview_frame", { title: "Look at a frame", description: "Render a still of the current state at a frame (defaults to the playhead) and return it as an image, so you can see the result of your changes. The first call after opening a project can take ~20–40 s while the project bundles; later calls take a few seconds.", inputSchema: { frame: z.number().int().min(0).optional(), width: z.number().int().min(160).max(1920).optional() } }, async ({ frame, width }) => {
    try {
      const st = await need("state");
      const f = frame ?? st.frame;
      const layout = await need("layout");
      const png = await ctx.still({ frame: f, layout, width: width ?? 960 });
      return { content: [{ type: "image", data: png.toString("base64"), mimeType: "image/jpeg" }, { type: "text", text: `frame ${f} of ${st.durationInFrames}` }] };
    } catch (e) { return err(e); }
  });
  return server;
};

/** Express mount: stateless Streamable HTTP, one McpServer per request. */
export const mountMcp = (app, ctx) => {
  app.post("/mcp", async (req, res) => {
    try {
      const server = createMcpServer(ctx);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on("close", () => { transport.close(); server.close(); });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: e.message }, id: null });
    }
  });
};
