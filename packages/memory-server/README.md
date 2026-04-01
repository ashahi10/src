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
| `TENGU_MEMORY_MATCH_LEXICAL` | Weight for substring overlap in hybrid `matchScore` (default `0.35`; renormalized with index/semantic) |
| `TENGU_MEMORY_MATCH_INDEX` | Weight for BM25-style token index (default `0.45`) |
| `TENGU_MEMORY_MATCH_SEMANTIC` | Weight for embedding cosine channel when enabled (default `0.2`) |
| `TENGU_MEMORY_EMBED_URL` | OpenAI-compatible **POST** embeddings endpoint (e.g. `https://api.openai.com/v1/embeddings`) |
| `TENGU_MEMORY_EMBED_KEY` | Bearer token for that endpoint |
| `TENGU_MEMORY_EMBED_MODEL` | Embedding model id (default `text-embedding-3-small`) |
| `TENGU_MEMORY_QUERY_FULL_SCAN_MAX_NODES` | Graphs larger than this use **index-bounded candidates** + recent seed (default `1600`; `0` = always use smart path when the index matches) |
| `TENGU_MEMORY_QUERY_INDEX_CANDIDATE_CAP` | Floor for max BM25-hit ids per query; effective cap is `max(this, limit×25)` (default `600`) |
| `TENGU_MEMORY_QUERY_RECENT_SEED` | Union this many most recently updated nodes (after the same type/scope filters) to hedge hot edits (default `200`) |

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
| `memory.create_node` | Create a typed node; returns `{ node, trustPolicy }`; optional `reviewIntervalDays` |
| `memory.query` | Hybrid ranked search: substring + **portable token index** (BM25-style) + optional **embeddings**; on large graphs uses **bounded candidates** (top BM25 hits + recent seed, then full-scan fallback if needed). Optional args: `useLexicalIndex`, `useSemantic`, `fullScan` (force exhaustive load) |
| `memory.add_edge` | Graph edge (`contradicts`, `supports`, …) |
| `memory.attach_evidence` | Append evidence to a node |
| `memory.refresh` | Reaffirm / boost freshness; optional `reaffirmationNote` |
| `memory.list_review_queue` | Spaced verification queue (`next_review_at`), overdue or full upcoming list |
| `memory.verify_node` | Confirm a memory still holds: doubles review interval (capped), reschedules, boosts freshness |
| `memory.embed_node` | Fetch and store an embedding for a node (requires `TENGU_MEMORY_EMBED_*`) |
| `memory.stats` | Aggregate stats (+ `lexicalIndexRowCount`, `embeddedNodeCount`) |

## Resources

| URI | Role |
|-----|------|
| `memory://stats` | Same JSON as `memory.stats` |
| `memory://node/{nodeId}` | Node + edges (RFC-style template) |

## Why SQLite (and not “only vectors”)?

SQLite gives you **durable, queryable structure** for a **knowledge graph** (nodes, edges, evidence rows) with **predictable behavior** and no extra services. The default runtime uses **sql.js** (WASM SQLite), which is built **without SQLite FTS5**; this server ships a maintained **`node_search_tokens` inverted index** plus BM25-style scoring instead, then **blends** with substring match and (optionally) stored embeddings. **Semantic / vector search** is complementary: call `memory.embed_node` when `TENGU_MEMORY_EMBED_URL` / `TENGU_MEMORY_EMBED_KEY` are set so `memory.query` can add a cosine channel. See `docs/Memory-2.0-Architecture-SQL-vs-Semantic.md` in this repo.

## Related docs

- [RFC: Memory 2.0](../../docs/RFC-Memory-2.0.md)
- [Ship checklist](../../docs/Memory-2.0-Ship-Checklist.md)
- [Runtime compatibility](../../docs/Memory-2.0-Runtime-Compatibility.md)
- [Competitive benchmark](../../docs/Memory-2.0-Competitive-Benchmark.md)

## License

MIT
