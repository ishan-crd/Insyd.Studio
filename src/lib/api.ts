const j = async <T,>(r: Response): Promise<T> => {
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? r.statusText);
  return r.json();
};
const post = <T,>(url: string, body?: unknown) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) }).then((r) => j<T>(r));

export type ProjectInfo = { path: string; exists: boolean; name?: string; entry?: string | null; hasSdk?: boolean; hasRemotion?: boolean; ready?: boolean };

export const api = {
  project: () => fetch("/api/project").then((r) => j<{ current: ProjectInfo | null; recent: ProjectInfo[] }>(r)),
  pick: () => post<{ path: string | null }>("/api/project/pick"),
  inspect: (path: string) => post<ProjectInfo>("/api/project/inspect", { path }),
  init: (path: string) => post<ProjectInfo>("/api/project/init", { path }),
  open: (path: string) => post<{ ok: true }>("/api/project/open", { path }),
  close: () => post<{ ok: true }>("/api/project/close"),
  loadLayout: (file: string) => fetch(`/api/layout?file=${encodeURIComponent(file)}`).then((r) => j<any>(r)),
  saveLayout: (file: string, layout: unknown) => post<{ ok: true; file: string }>("/api/layout", { file, layout }),
  index: () => fetch("/api/index").then((r) => j<{ locators: Record<string, { file: string; literal: boolean; values?: Record<string, unknown>; value?: unknown }>; errors: { file: string; error: string }[] }>(r)),
  apply: (layout: unknown, layoutFile: string) => post<{ ok: true; changed: string[]; unresolved: Record<string, Record<string, unknown>>; fallback: any }>("/api/apply", { layout, layoutFile }),
  render: (body: { compositionId: string; entryPoint: string; inputProps: unknown; fileName: string; crf: number }) =>
    post<{ id: string; outputLocation: string }>("/api/render", body),
  cancelRender: (id: string) => post("/api/render/" + id + "/cancel"),
  reveal: (path: string) => post("/api/reveal", { path }),
  claudeContext: (body: unknown) => post<{ ok: true; brief: string; file: string; prompt: string; kickoff: string; cmd: string; claude: string | null }>("/api/claude/context", body),
  claudeOpen: (body: unknown) => post<{ ok: boolean; brief: string; reason?: string; cmd?: string }>("/api/claude/open", body),
  thumbs: (body: { compositionId: string; entryPoint: string; layoutFile: string; every?: number }) => post<{ status: "ready" | "running" | "error"; key: string; base: string; progress?: number; error?: string | null; every?: number; count?: number; width?: number; height?: number; files?: string[] }>("/api/thumbs", body),
  audioList: () => fetch("/api/audio/list").then((r) => j<{ files: { src: string; bytes: number }[] }>(r)),
  audioUpload: (name: string, data: string, folder = "sfx") => post<{ src: string }>("/api/audio/upload", { name, data, folder }),
  openFile: (path: string) => post("/api/open-file", { path }),
};
