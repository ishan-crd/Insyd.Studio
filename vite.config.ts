import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";

// The open project is injected through INSYD_PROJECT (set by server/index.mjs).
// `@project/editor` resolves to <project>/src/editor.ts(x), or to a stub when nothing is open.
export default defineConfig(() => {
  const project = process.env.INSYD_PROJECT || "";
  const entry = ["src/editor.tsx", "src/editor.ts"].map((f) => path.join(project, f)).find((f) => project && fs.existsSync(f));
  const editorEntry = entry ?? path.resolve(__dirname, "src/lib/no-project.ts");
  // The editor and the project must share ONE copy of the SDK (registry + contexts are module singletons).
  const sdkEntry = project && fs.existsSync(path.join(project, "src/insyd/index.tsx"))
    ? path.join(project, "src/insyd/index.tsx")
    : path.resolve(__dirname, "sdk/index.tsx");
  return {
    plugins: [react()],
    define: { __INSYD_PROJECT__: JSON.stringify(project) },
    resolve: {
      alias: [
        { find: "@project/editor", replacement: editorEntry },
        { find: "@project/sdk", replacement: sdkEntry },
      ],
      // One React / one Remotion for the editor and the project it hosts.
      dedupe: ["react", "react-dom", "react/jsx-runtime", "remotion", "@remotion/player"],
    },
    server: {
      fs: { allow: [__dirname, ...(project ? [project] : [])] },
      // layout.json is written by the editor itself; the app is the source of truth while open.
      watch: { ignored: ["**/layout.json", "**/out/**", "**/.insyd/**"] },
    },
    optimizeDeps: { exclude: [] },
  };
});
