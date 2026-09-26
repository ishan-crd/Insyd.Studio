import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./styles.css";
import { useStore } from "./state/store";
import { stashSession } from "./lib/persist";
import { Marketplace } from "./market/Marketplace";
import { TemplatePage } from "./market/TemplatePage";
import { GetStudio } from "./market/GetStudio";

// Routes: /                  the template marketplace
//         /templates/:slug   one template (full preview, scenes, palette, "Edit in Studio")
//         /studio            the editor, on whatever project is open
// The editor (and the project it hosts) loads only when /studio is visited.
const Studio = __INSYD_HOSTED__ ? () => null : lazy(() => import("./App").then((m) => ({ default: m.App })));

// Code edited outside the editor (e.g. by Claude Code) triggers a full reload; keep the playhead and selection.
if (import.meta.hot) import.meta.hot.on("vite:beforeFullReload", () => { try { stashSession(); } catch {} });
(window as any).__insydStore = useStore;
(window as any).__INSYD_PROJECT__ = __INSYD_PROJECT__;

// No StrictMode: it double-renders every frame of the hosted composition in dev.
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Marketplace />} />
      <Route path="/templates/:slug" element={<TemplatePage />} />
      <Route path="/studio/*" element={__INSYD_HOSTED__ ? <GetStudio /> : <Suspense fallback={<div className="welcome" />}><Studio /></Suspense>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>,
);
