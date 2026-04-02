# @mnemai/memory-server

**Memory 2.0** — MCP server for an **evidence-linked memory graph**: typed nodes, relationships, freshness decay, contradiction hints, and ranked retrieval with explicit provenance fields. **Local-first** (SQLite file on disk).

## Capabilities

| Area | What you get |
|------|--------------|
| Structure | Typed nodes, edges (`supports`, `contradicts`, …), evidence rows |
| Retrieval | Hybrid **substring + BM25-style token index** + **optional embeddings**; bounded candidates on large graphs |
| Trust / time | Freshness decay, refresh, spaced **review queue**, confidence rules with evidence |
| MCP | Tools + resources (`memory://stats`, `memory://node/{id}`) over **stdio** |
| Quality gate | **Vitest** (graph, handlers, **real stdio e2e** with official SDK client), **smoke** script |

## Install from npm

```bash
npx --yes @mnemai/memory-server
```

MCP config (set an absolute DB path):

```json
{
  "mcpServers": {
    "mnemai-memory": {
      "command": "npx",
      "args": ["--yes", "@mnemai/memory-server"],
      "env": { "MNEMAI_MEMORY_DB": "/absolute/path/to/memory.db" }
    }
  }
}
```

Publishing and version bumps: see repo [RELEASING.md](../../RELEASING.md). `prepublishOnly` runs **`pnpm run verify:ship`**.

## What `verify:ship` checks

1. Build `dist/index.js` (CLI **`mnemai-memory`**, shebang for Unix).
2. Typecheck.
3. **Vitest** — graph, retrieval, embeddings (mocked HTTP), **MCP stdio e2e** (`ping`, tools, resources, stderr clean on success).
4. In-process **smoke** script.

**Scope:** Proves the **reference SDK wire path** on CI’s OS (Linux). Hosts can still differ (timeouts, stderr). Not a guarantee for every proprietary MCP client.

Repo CI also builds the workspace, typechecks, verifies **mission** + **verification** servers, **npm pack** sanity, and the **platform demo** (see root [README.md](../../README.md)).

## Requirements

- Node.js **>= 18**

## From this monorepo

```bash
# repo root — print MCP JSON with absolute paths
pnpm run memory:onboard
```

```bash
node packages/memory-server/dist/index.js
```

## Environment variables

Use the **`MNEMAI_MEMORY_*`** names below. The same settings also accept legacy **`TENGU_MEMORY_*`** names (for older configs).

| Variable | Purpose |
|----------|---------|
| `MNEMAI_MEMORY_DB` | Path to the SQLite file. If unset: uses existing `~/.tengu/memory.db` when present, otherwise creates **`~/.mnemai/memory.db`**. |
| `MNEMAI_MEMORY_SYNC_WRITES=1` | Flush to disk immediately after writes (stronger durability, slower). Legacy: `TENGU_MEMORY_SYNC_WRITES=1`. |
| `MNEMAI_MEMORY_MATCH_LEXICAL` | Weight for substring overlap in hybrid `matchScore` (default `0.35`; renormalized with index/semantic). Legacy `TENGU_*` alias. |
| `MNEMAI_MEMORY_MATCH_INDEX` | Weight for BM25-style token index (default `0.45`). Legacy alias. |
| `MNEMAI_MEMORY_MATCH_SEMANTIC` | Weight for embedding cosine channel when enabled (default `0.2`). Legacy alias. |
| `MNEMAI_MEMORY_EMBED_URL` | OpenAI-compatible **POST** embeddings endpoint. Legacy alias. |
| `MNEMAI_MEMORY_EMBED_KEY` | Bearer token for that endpoint. Legacy alias. |
| `MNEMAI_MEMORY_EMBED_MODEL` | Embedding model id (default `text-embedding-3-small`). Legacy alias. |
| `MNEMAI_MEMORY_QUERY_FULL_SCAN_MAX_NODES` | Graphs larger than this use **index-bounded candidates** + recent seed (default `1600`; `0` = always use smart path when the index matches). Legacy alias. |
| `MNEMAI_MEMORY_QUERY_INDEX_CANDIDATE_CAP` | Floor for max BM25-hit ids per query; effective cap is `max(this, limit×25)` (default `600`). Legacy alias. |
| `MNEMAI_MEMORY_QUERY_RECENT_SEED` | Union this many most recently updated nodes (after filters) (default `200`). Legacy alias. |

## MCP config (clone / local `node`)

```json
{
  "mcpServers": {
    "mnemai-memory": {
      "command": "node",
      "args": ["/absolute/path/to/repo/packages/memory-server/dist/index.js"],
      "env": { "MNEMAI_MEMORY_DB": "/absolute/path/to/my-memory.db" }
    }
  }
}
```

Use **absolute paths** — hosts often use a cwd that is not your repo.

## Tools

| Tool | Role |
|------|------|
| `memory.create_node` | Create a typed node; returns `{ node, trustPolicy }`; optional `reviewIntervalDays` |
| `memory.query` | Hybrid ranked search; optional `useLexicalIndex`, `useSemantic`, `fullScan` |
| `memory.add_edge` | Graph edge (`contradicts`, `supports`, …) |
| `memory.attach_evidence` | Append evidence to a node |
| `memory.refresh` | Reaffirm / boost freshness; optional `reaffirmationNote` |
| `memory.list_review_queue` | Spaced verification queue |
| `memory.verify_node` | Confirm a memory still holds |
| `memory.embed_node` | Store embedding (requires `MNEMAI_MEMORY_EMBED_*` or legacy `TENGU_MEMORY_EMBED_*`) |
| `memory.stats` | Aggregate stats (+ index / embedding counts) |

## Resources

| URI | Role |
|-----|------|
| `memory://stats` | Same JSON as `memory.stats` |
| `memory://node/{nodeId}` | Node + edges |

## Security, performance, limits

- [Security & privacy](../../docs/Memory-2.0-Security-Privacy.md)
- [Performance (test SLOs)](../../docs/Memory-2.0-Performance.md)
- [Host matrix](../../docs/Memory-2.0-Host-Matrix.md)

**Limits (honest):** **sql.js** build has **no FTS5**; lexical search uses **`node_search_tokens`** + BM25-style scoring plus substring match. **Embeddings** are optional and require your own API. Large graphs use **bounded retrieval** (see env vars above). These tradeoffs favor **portable, predictable** local operation over mimicking a hosted search product.

## Related docs

- [RFC: Memory 2.0](../../docs/RFC-Memory-2.0.md)
- [Runtime compatibility](../../docs/Memory-2.0-Runtime-Compatibility.md)
- [Competitive benchmark](../../docs/Memory-2.0-Competitive-Benchmark.md)

## License

MIT
