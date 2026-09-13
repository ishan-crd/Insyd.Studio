import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import { useStore } from "./state/store";
(window as any).__insydStore = useStore;
(window as any).__INSYD_PROJECT__ = __INSYD_PROJECT__;

// No StrictMode: it double-renders every frame of the hosted composition in dev.
createRoot(document.getElementById("root")!).render(<App />);
