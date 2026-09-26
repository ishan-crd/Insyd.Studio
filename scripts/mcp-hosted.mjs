// The hosted marketplace MCP: a real MCP client connects over streamable HTTP, lists the tools and calls
// each one.   node scripts/mcp-hosted.mjs [https://studio.insyd.in/mcp]   (default: npm run preview:web)
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
const url = process.argv[2] || "http://localhost:4400/mcp";
let pass = 0, fail = 0;
const check = (c, m, d = "") => { if (c) pass++; else { fail++; console.log("  ✗", m, d); } };
const info = await fetch(url).then((r) => r.json()).catch(() => null);
check(info?.name === "insyd-templates", "GET (a browser) → description JSON", JSON.stringify(info)?.slice(0, 120));
const client = new Client({ name: "check", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(url)));
const tools = (await client.listTools()).tools.map((t) => t.name).sort();
check(tools.join() === "get_started,get_template,list_templates", "tools", tools.join());
const list = await client.callTool({ name: "list_templates", arguments: {} });
const ts = list.structuredContent?.templates ?? [];
check(ts.length >= 3 && ts.every((t) => t.download.startsWith("http") && t.clips > 0), `list_templates → ${ts.length}`);
check((await client.callTool({ name: "list_templates", arguments: { query: "loop" } })).structuredContent.templates.some((t) => t.slug === "opus-viral"), "search: 'loop' finds Opus Viral");
const one = await client.callTool({ name: "get_template", arguments: { slug: "opus-viral" } });
check(one.structuredContent?.scenes?.length === 12 && /Download: http/.test(one.content[0].text), "get_template opus-viral");
for (const k of ["download", "preview", "poster"]) { const r = await fetch(one.structuredContent[k], { method: "HEAD" }); check(r.ok, `${k} link resolves (${r.status})`); }
const missing = await client.callTool({ name: "get_template", arguments: { slug: "nope" } });
check(missing.isError === true, "unknown slug → isError");
check(/localhost:4321\/mcp/.test((await client.callTool({ name: "get_started", arguments: {} })).content[0].text), "get_started explains the local editing MCP");
await client.close();
console.log(`${pass}/${pass + fail} passed (${url})`);
process.exit(fail ? 1 : 0);
