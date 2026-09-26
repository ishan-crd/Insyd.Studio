import React from "react";
import { Link } from "react-router-dom";
import { Shell } from "./Shell";
import { REPO } from "./api";

// /studio on the hosted site: the editor edits files and renders on your machine, so it runs locally.
const STEPS: Array<[string, React.ReactNode]> = [
  ["Install and run", <pre key="p">git clone {REPO}{"\n"}cd Insyd.Studio{"\n"}npm install{"\n"}npm run dev</pre>],
  ["Open it", <p key="p">Studio opens at <code>http://localhost:4321</code> — the same marketplace, where <b>Edit in Studio</b> copies a template into <code>~/Documents/Studio Projects</code> and opens it in the editor.</p>],
  ["Make it yours", <p key="p">Edit any clip, sound or value by hand, or connect Claude Code over MCP (<i>Open in Claude Code</i>) and ask for changes. Save writes every edit into the project's source; Export renders the MP4.</p>],
];
export const GetStudio: React.FC = () => (
  <Shell>
    <div className="mk-wrap mk-page">
      <section className="mk-get">
        <span className="mk-eyebrow"><i />Studio runs on your computer</span>
        <h1>Get Studio</h1>
        <p>Studio edits a Remotion project's code and renders the video locally, so it runs on your machine (macOS, Linux or Windows, Node 20+). The templates here download straight into it.</p>
        <ol className="mk-steps">{STEPS.map(([h, body], i) => <li key={h}><span className="n">{String(i + 1).padStart(2, "0")}</span><b>{h}</b>{body}</li>)}</ol>
        <div className="mk-cta"><Link className="mk-btn primary lg" to="/">Browse templates</Link><a className="mk-btn lg" href={REPO} target="_blank" rel="noreferrer">View on GitHub</a></div>
      </section>
    </div>
  </Shell>
);
