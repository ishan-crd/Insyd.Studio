import React, { useEffect, useState } from "react";
import def from "@project/editor";
import { useStore } from "./state/store";
import { api } from "./lib/api";
import { loadDraft, saveDraft, popSession, reconcileDraft } from "./lib/persist";
import { playerRef } from "./lib/player";
import { registry } from "@project/sdk";
import { ensureThumbs } from "./lib/thumbs";
import { noteInventory } from "./lib/scan";
import { connectBridge } from "./lib/bridge";
import { OpenProject } from "./components/OpenProject";
import { TopBar } from "./components/TopBar";
import { Library } from "./components/Library";
import { Preview } from "./components/Preview";
import { Inspector } from "./components/Inspector";
import { Timeline } from "./components/Timeline";
import { useKeyboard } from "./lib/keyboard";
import { ContextMenuHost } from "./components/ContextMenu";
import { ShortcutsModal } from "./components/ShortcutsModal";
import { MobileApp } from "./components/Mobile";
import { useMobile } from "./lib/mobile";

export const App: React.FC = () => {
  const ready = useStore((s) => s.def !== null);
  const toast = useStore((s) => s.toast);
  const [open, setOpen] = useState(false);
  const mobile = useMobile();
  useKeyboard();

  useEffect(() => {
    const d = def;
    if (!d) return;
    (async () => {
      const saved = await api.loadLayout(d.layoutFile).catch(() => null);
      const restored = loadDraft();
      const draft = restored?.layout ?? null;
      useStore.getState().init(d, saved, draft);
      const n = draft ? (Object.values(draft) as unknown[]).filter((v) => v && typeof v === "object").reduce<number>((a, v) => a + Object.keys(v as object).length, 0) : 0;
      if (n) useStore.getState().setToast(`Restored ${n} unsaved change${n === 1 ? "" : "s"}`);
      api.index().then((i) => { useStore.getState().setIndex(i); noteInventory(Object.keys(i.locators)); reconcileDraft(); }).catch(() => {});
      setTimeout(ensureThumbs, 1500);
      connectBridge();
      // restore UI state after a save-reload
      const sess = popSession();
      if (sess) {
        useStore.setState({ selection: sess.selection ?? null, zoom: sess.zoom ?? null, collapsed: sess.collapsed ?? {} });
        const tryScrub = (n = 0) => { if (playerRef.current) playerRef.current.seekTo(sess.frame ?? 0); else if (n < 40) setTimeout(() => tryScrub(n + 1), 100); };
        setTimeout(() => tryScrub(), 200);
      }
    })();
  }, []);

  // learn the code defaults of every Editable from whichever player has mounted it
  useEffect(() => {
    const sync = () => {
      const s = useStore.getState();
      const next = { ...s.codeDefaults };
      let changed = false;
      for (const ch of ["main", "scan"] as const) for (const e of registry.getElements(ch)) {
        if (JSON.stringify(next[e.id]) !== JSON.stringify(e.defaults)) { next[e.id] = e.defaults; changed = true; }
      }
      if (changed) s.setCodeDefaults(next);
      reconcileDraft();
    };
    const a = registry.subscribeElements(sync, "main"), b = registry.subscribeElements(sync, "scan");
    const c = registry.subscribeProps(reconcileDraft);
    return () => { a(); b(); c(); };
  }, []);

  // keep the unsaved draft in localStorage
  useEffect(() => useStore.subscribe((s, prev) => { if (s.layout !== prev.layout || s.saved !== prev.saved) saveDraft(); }), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => useStore.getState().setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  if (!def || open) return <OpenProject onCancel={def ? () => setOpen(false) : undefined} />;
  if (!ready) return <div className="welcome" />;
  if (new URLSearchParams(location.search).get("bare")) return <div className="app" style={{ gridTemplateColumns: "1fr", gridTemplateAreas: '"top" "preview" "tl"', gridTemplateRows: "48px 1fr 0px" }}><TopBar onOpen={() => setOpen(true)} /><Preview /></div>;
  if (mobile) return <MobileApp onOpen={() => setOpen(true)} />;
  return (
    <div className="app">
      <TopBar onOpen={() => setOpen(true)} />
      <Library />
      <Preview />
      <Inspector />
      <Timeline />
      <ContextMenuHost />
      <ShortcutsModal />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
