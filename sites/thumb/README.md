# thumb.insyd.in

The landing page for [thumb MCP](https://github.com/ishan-crd/thumb-mcp), in the look of its launch film
(`templates/thumb-launch`). A standalone Vite + React static site with no backend.

```bash
cd sites/thumb
npm install
npm run dev      # http://localhost:4330
npm run build    # → dist/
```

**Deploy (Vercel):** a separate project on this repo with **Root Directory** set to `sites/thumb`. Everything
else comes from `vercel.json`. Domain: `thumb.insyd.in`.

`public/film.mp4` is the launch film's preview render with the audio stripped. `public/og.png` is the hero at 1200×630.
