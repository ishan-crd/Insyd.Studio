import { registry } from "@project/sdk";
import { useStore } from "../state/store";
import { api } from "./api";

// Everything Claude Code needs to edit this project while Studio shows the result live.
export const contextPayload = () => {
  const s = useStore.getState();
  const def = s.def!;
  const props = registry.getProps();
  return {
    def: { id: def.id, name: def.name, width: def.width, height: def.height, fps: def.fps, scenes: def.scenes },
    layout: s.layout,
    scan: {
      elements: s.allElements(),
      sounds: s.scan.sounds,
      props: props.filter((p) => p.kind !== "text").map((p) => ({ id: p.id, kind: p.kind, value: p.value, owner: p.owner })),
      copy: props.filter((p) => p.kind === "text").map((p) => ({ id: p.id, value: p.value })),
    },
  };
};

/** Copies a self-contained prompt (instructions + the full brief) for any Claude without the MCP; also refreshes CLAUDE.md. */
export const copyClaudePrompt = async () => {
  const s = useStore.getState();
  try {
    const r = await api.claudeContext(contextPayload());
    await navigator.clipboard.writeText(r.prompt);
    s.setToast(`Prompt copied (${Math.round(r.prompt.length / 1024)} KB) · ${r.file} updated`);
    return r;
  } catch (e: any) { s.setToast("Could not copy the prompt: " + e.message); return null; }
};

export const copyClaudeContext = async () => {
  const s = useStore.getState();
  try {
    const r = await api.claudeContext(contextPayload());
    await navigator.clipboard.writeText(r.brief);
    s.setToast(`Context copied (${Math.round(r.brief.length / 1024)} KB) and written to ${r.file}`);
  } catch (e: any) { s.setToast("Could not copy context: " + e.message); }
};
