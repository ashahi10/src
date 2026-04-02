# Memory 2.0 — host compatibility matrix

Automated checks run on **Ubuntu (GitHub Actions)** with **Node 22**: build → typecheck → package `verify:ship` gates (Vitest, including **real MCP stdio** against `@modelcontextprotocol/sdk` `Client` + `StdioClientTransport`).

| Host / environment | Automated | Notes |
|--------------------|-----------|--------|
| Linux + Node 22 (CI) | Yes | Same sequence as `.github/workflows/ci.yml`. |
| macOS / Windows (local dev) | Partial | Same tests pass when run locally; not CI-matrixed per OS. |
| Cursor MCP | Manual | Configure with absolute `node` + path to `dist/index.js` or `npx @mnemai/memory-server` after publish. |
| Claude Desktop | Manual | Same as Cursor; validate `claude_desktop_config.json` shape for your version. |
| Other MCP clients | Manual | Any client that supports stdio MCP should work; timeouts and stderr policies differ. |

**Honest scope:** Passing CI proves the **reference SDK wire path** on Linux. It does **not** certify every proprietary host build. If something fails in a specific app, capture host logs and open an issue with OS, Node version, and config (redact secrets).
