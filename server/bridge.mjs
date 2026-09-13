// WebSocket bridge between the server (MCP tools) and the open editor tab. Tool calls that change
// editor state are executed *in the tab* against the same store the UI uses, so they are live,
// undoable and visible to the person watching. One tab is "active" (the most recent to connect).
import { WebSocketServer } from "ws";

let active = null; // ws
let seq = 0;
const pending = new Map(); // id -> { resolve, reject, timer }
const listeners = new Set();

export const attachBridge = (httpServer) => {
  const wss = new WebSocketServer({ server: httpServer, path: "/bridge" });
  wss.on("connection", (ws) => {
    active = ws;
    ws.on("message", (buf) => {
      let msg; try { msg = JSON.parse(String(buf)); } catch { return; }
      if (msg.id !== undefined && pending.has(msg.id)) {
        const p = pending.get(msg.id); pending.delete(msg.id); clearTimeout(p.timer);
        if (msg.error) p.reject(new Error(msg.error)); else p.resolve(msg.result);
      } else if (msg.event) {
        listeners.forEach((l) => l(msg.event, msg.data));
      }
    });
    ws.on("close", () => { if (active === ws) active = null; });
  });
  return wss;
};

export const bridge = {
  connected: () => !!active && active.readyState === 1,
  /** Run an editor command in the tab; resolves with its result. */
  call(method, params = {}, timeoutMs = 15000) {
    if (!bridge.connected()) return Promise.reject(new Error("No editor tab connected"));
    const id = ++seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Editor did not answer (${method})`)); }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      active.send(JSON.stringify({ id, method, params }));
    });
  },
  /** Fire-and-forget notification to the tab (e.g. "Claude changed 20 sounds"). */
  notify(event, data) { if (bridge.connected()) active.send(JSON.stringify({ event, data })); },
  on(l) { listeners.add(l); return () => listeners.delete(l); },
};
