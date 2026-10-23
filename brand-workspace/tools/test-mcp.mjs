#!/usr/bin/env node
/**
 * Smoke test MCP (stdio) para los servidores del plugin tec360-creative-studio.
 * Lanza cada servidor, hace initialize -> notifications/initialized -> tools/list
 * y reporta cuantas herramientas expone. No modifica nada.
 *
 *   node brand-workspace/tools/test-mcp.mjs              # todos los ArtCraft
 *   node brand-workspace/tools/test-mcp.mjs vectorcraft  # uno solo
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const cfgPath = path.resolve(here, "../../.agents/plugins/tec360-creative-studio/mcp_config.json");
const cfg = JSON.parse(readFileSync(cfgPath, "utf8")).mcpServers;
const argv = process.argv.slice(2);
const catIdx = argv.indexOf("--catalog");
const catalogPath = catIdx >= 0 ? path.resolve(argv[catIdx + 1]) : null;
const only = argv.filter((a, i) => a !== "--catalog" && i !== catIdx + 1 || catIdx < 0 && a !== "--catalog");
const names = Object.keys(cfg).filter((n) => (only.length ? only.includes(n) : !["dembrandt", "playwright"].includes(n)));

function probe(name, { command, args }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], shell: command === "npx" });
    let buf = "";
    let stderr = "";
    const timer = setTimeout(() => finish({ ok: false, error: "timeout 25s", stderr: stderr.slice(-400) }), 25000);
    const send = (msg) => child.stdin.write(JSON.stringify(msg) + "\n");
    function finish(r) {
      clearTimeout(timer);
      try { child.kill(); } catch {}
      resolve({ name, ...r });
    }
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (e) => finish({ ok: false, error: e.message }));
    child.stdout.on("data", (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line) continue;
        let msg;
        try { msg = JSON.parse(line); } catch { continue; }
        if (msg.id === 1) {
          if (msg.error) return finish({ ok: false, error: JSON.stringify(msg.error) });
          const info = msg.result?.serverInfo ?? {};
          child._info = `${info.name ?? "?"} ${info.version ?? ""}`.trim();
          send({ jsonrpc: "2.0", method: "notifications/initialized" });
          send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
        } else if (msg.id === 2) {
          const tools = msg.result?.tools ?? [];
          finish({
            ok: true,
            server: child._info,
            tools: tools.length,
            sample: tools.slice(0, 8).map((t) => t.name),
            fullTools: tools.map((t) => ({
              name: t.name,
              description: (t.description || "").split("\n")[0].slice(0, 140),
              required: t.inputSchema?.required ?? [],
            })),
          });
        }
      }
    });
    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "tec360-smoke", version: "1.0" } },
    });
  });
}

const results = [];
for (const n of names) results.push(await probe(n, cfg[n]));
for (const r of results) {
  if (r.ok) console.log(`OK   ${r.name.padEnd(12)} ${String(r.tools).padStart(4)} tools  [${r.server}]  ${r.sample.join(", ")}`);
  else console.log(`FAIL ${r.name.padEnd(12)} ${r.error}${r.stderr ? "\n     " + r.stderr : ""}`);
}

if (catalogPath) {
  mkdirSync(path.dirname(catalogPath), { recursive: true });
  const lines = [
    "# ArtCraft & Creative Studio MCP Tool Catalog (Auto-Generated)",
    "",
    "Catálogo verificado empíricamente contra los servidores MCP reales instalados en Windows (`~/.artcraft/`).",
    "",
  ];
  for (const r of results.filter((x) => x.ok)) {
    lines.push(`## \`${r.name}\` (${r.server} — ${r.tools} tools)`, "");
    lines.push("| Tool | Required Params | Description |", "|---|---|---|");
    for (const t of r.fullTools) {
      lines.push(`| \`${t.name}\` | ${t.required.length ? t.required.map((q) => `\`${q}\``).join(", ") : "—"} | ${t.description.replace(/\|/g, "\\|")} |`);
    }
    lines.push("");
  }
  writeFileSync(catalogPath, lines.join("\n"), "utf8");
  console.log(`Catalogo escrito en: ${catalogPath}`);
}

process.exit(results.every((r) => r.ok) ? 0 : 1);
