# @tengu/memory-server

**Memory 2.0** — an MCP (Model Context Protocol) server that stores an **evidence-linked memory graph**: typed nodes, relationships, freshness decay, contradiction hints, and ranked retrieval with explicit provenance fields.

This package is intended for **Claude Desktop, Cursor, Cline, and other MCP-capable clients**. It is **local-first** (data stays on disk on your machine).

## What is verified in CI / release checks

Running `pnpm run verify:ship` in this package:

1. Builds the server (`dist/index.js`).
2. Typechecks.
3. Runs **Vitest**, including:
   - graph + handler tests
   - **real MCP stdio end-to-end tests** using the official `@modelcontextprotocol/sdk` client (tools, resources, `ping`, stderr discipline on success paths)
4. Runs the in-process smoke script.

**Honest scope:** This proves the **protocol wire path against the reference SDK client** on the OS used in CI (Linux in GitHub Actions). It does **not** certify every proprietary MCP host build; hosts can still differ in timeouts, stderr handling, or sandbox rules. Treat as **production-grade for local MCP**, not a universal compatibility guarantee.

## Requirements

- Node.js **>= 18**
- `pnpm` (monorepo) or install from built artifacts

## Build

From repo root:

```bash
pnpm install
pnpm --filter @tengu/memory-server run build
```

## Run (stdio MCP)

```bash
node packages/memory-server/dist/index.js
```

### Environment variables

| Variable | Purpose |
|----------|---------|
| `TENGU_MEMORY_DB` | Path to the SQLite file (default: `~/.tengu/memory.db`) |
| `TENGU_MEMORY_SYNC_WRITES=1` | Flush to disk immediately after writes (stronger durability, slower) |

## MCP client configuration examples

### Cursor / generic JSON

```json
{
  "mcpServers": {
    "tengu-memory": {
      "command": "node",
      "args": ["/absolute/path/to/repo/packages/memory-server/dist/index.js"],
      "env": {
        "TENGU_MEMORY_DB": "/absolute/path/to/my-memory.db"
      }
    }
  }
}
```

### Claude Desktop (macOS)

Same shape inside `claude_desktop_config.json` under `mcpServers`.

Use **absolute paths** — hosts often start the server with a cwd that does not contain your repo.

## Tools

| Tool | Role |
|------|------|
| `memory.create_node` | Create a typed node; returns `{ node, trustPolicy }` |
| `memory.query` | Ranked search with `matchScore`, `compositeScore`, `evidenceQualityScore`, `salienceScore`, `conflict` |
| `memory.add_edge` | Graph edge (`contradicts`, `supports`, …) |
| `memory.attach_evidence` | Append evidence to a node |
| `memory.refresh` | Reaffirm / boost freshness; optional `reaffirmationNote` |
| `memory.stats` | Aggregate stats |

## Resources

| URI | Role |
|-----|------|
| `memory://stats` | Same JSON as `memory.stats` |
| `memory://node/{nodeId}` | Node + edges (RFC-style template) |

## Why SQLite (and not “only vectors”)?

SQLite gives you **durable, queryable structure** for a **knowledge graph** (nodes, edges, evidence rows) with **predictable behavior** and no extra services. **Semantic / vector search** is complementary: it helps fuzzy recall, but it is weaker alone for **auditable** memory (evidence links, contradiction edges, typed scopes). A common advanced architecture is **SQLite as source of truth + optional embedding index** for hybrid retrieval — see `docs/Memory-2.0-Architecture-SQL-vs-Semantic.md` in this repo.

## Related docs

- [RFC: Memory 2.0](../../docs/RFC-Memory-2.0.md)
- [Ship checklist](../../docs/Memory-2.0-Ship-Checklist.md)
- [Runtime compatibility](../../docs/Memory-2.0-Runtime-Compatibility.md)
- [Competitive benchmark](../../docs/Memory-2.0-Competitive-Benchmark.md)

## License

MIT
