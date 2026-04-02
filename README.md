# Mnemai — Evidence-Linked Agent Memory for MCP

Agents may “remember” for a minute, then forget: most implementations fall back to raw text blobs or vector similarity, with no durable structure, no explicit provenance, and no auditable way to connect what an agent *said* to what it *knows*.

**Mnemai** fixes that with **three** local-first MCP servers that work as one coherent workflow: **missions** (objectives), **memory** (evidence-linked graph), and **verification** (proof records). Together they turn agent memory into **structured, auditable, evidence-backed state** you can reuse across MCP workflows. Published on npm under the **`@mnemai`** scope (Memory 2.0 is [`@mnemai/memory-server`](https://www.npmjs.com/package/@mnemai/memory-server)).

## Problem

Most agent “memory” is still just **text** or **vector similarity**. That’s useful for recall, but it’s fragile in production:
- no consistent structure for facts vs context vs decisions,
- no explicit provenance for *why* something was believed,
- no auditable record of proof that links an agent output back to stored evidence.

When memory isn’t structured and evidence isn’t explicit, agent workflows become hard to debug, hard to verify, and easy to break as you scale to multiple tools/hosts.

Mnemai addresses this by engineering **evidence-linked memory**, **mission tracking**, and **verification records** as small **SQLite-backed MCP servers** (portable `sql.js`) with a tested cross-server demo you can run from a clean checkout.

## What we built (and how)

| Piece | Role | Persistence | CI gate |
|-------|------|-------------|---------|
| **Memory 2.0** (`@mnemai/memory-server`) | Typed nodes, edges, hybrid search, review queue, optional embeddings | `MNEMAI_MEMORY_DB` (default **`~/.mnemai/memory.db`**; uses existing `~/.tengu/memory.db` if present; legacy `TENGU_MEMORY_DB` still works) | `verify:ship` (Vitest + smoke + **MCP stdio e2e**) |
| **Mission** (`@mnemai/mission-server`) | Track objectives so “why we did it” survives beyond a single run | `TENGU_MISSION_DB` (default `~/.tengu/mission.db`) | `verify:ship` (unit + smoke + **stdio e2e**) |
| **Verification** (`@mnemai/verification-server`) | Record proof artifacts so agent outputs stay auditable (and can be tied back to a mission) | `TENGU_VERIFICATION_DB` (default `~/.tengu/verification.db`) | `verify:ship` (unit + smoke + **stdio e2e**) |

**How it fits:** hosts start each server as a **separate stdio process** (typical MCP). Our **platform demo** connects all three via the official SDK and runs one cross-server workflow (see below).

## Capability matrix (Memory 2.0)

| Capability | Supported |
|------------|-----------|
| Typed memory nodes | Yes |
| Evidence references on nodes | Yes |
| Graph edges (e.g. `contradicts`, `supports`) | Yes |
| Hybrid retrieval (substring + BM25-style index + optional embeddings) | Yes |
| Bounded candidate search on large graphs (env-tunable) | Yes |
| Freshness decay + refresh / review queue | Yes |
| MCP resources (`memory://stats`, `memory://node/{id}`) | Yes |
| Published npm CLI (`mnemai-memory`) | **Live:** [`@mnemai/memory-server`](https://www.npmjs.com/package/@mnemai/memory-server) on npm (public); pack verified in CI; see [RELEASING.md](RELEASING.md) for maintainer publish flow |

## Install & run

### From npm (Memory — published)

**[`@mnemai/memory-server`](https://www.npmjs.com/package/@mnemai/memory-server)** is on the public npm registry (install the current `latest` tag on the package page). Maintainer notes: [RELEASING.md](RELEASING.md).

```bash
npx --yes @mnemai/memory-server
```

MCP snippet:

```json
{
  "mcpServers": {
    "mnemai-memory": {
      "command": "npx",
      "args": ["--yes", "@mnemai/memory-server"],
      "env": {
        "MNEMAI_MEMORY_DB": "/absolute/path/to/your-memory.db"
      }
    }
  }
}
```

Mission and verification CLIs (`mnemai-mission`, `mnemai-verification`) match the same pattern **after** those packages are published; today use repo build paths or clone flow below.

### From this repo (clone)

```bash
pnpm install
pnpm run build
pnpm run memory:onboard
```

`memory:onboard` prints a ready-to-paste MCP block with **absolute** paths for Memory 2.0.

**Dev (Memory, from source):** `pnpm dev:memory`

## End-to-end platform demo (multi-server)

Runs **three** built servers over stdio: mission → memory → verification → memory evidence link → query.

```bash
pnpm run build
pnpm run demo:platform
```

You should see `platform-demo: OK` plus JSON with `missionId`, `nodeId`, and `verificationId`. This is the same shape of flow we recommend for product integrations: **objective in mission store**, **facts in memory with URIs**, **proof in verification store**, **evidence attached back on the memory node**.

## Performance (test SLO)

From automated tests: **≈2k nodes**, ranked query with `limit` 40 completes in **under 5 seconds** on CI hardware. See [docs/Memory-2.0-Performance.md](docs/Memory-2.0-Performance.md).

## Security, privacy, operations

- [Security & privacy](docs/Memory-2.0-Security-Privacy.md) — local DB files, when the network is used (embeddings only), backups.
- [Host matrix](docs/Memory-2.0-Host-Matrix.md) — what is automated vs manually verified.
- [Releasing / npm](RELEASING.md) — pack checks, publish, versioning.

## Honest limits (Memory 2.0)

Memory uses **sql.js** (no SQLite **FTS5**); lexical search uses a maintained **`node_search_tokens`** index plus BM25-style scoring, blended with substring match and **optional** embeddings (`MNEMAI_MEMORY_EMBED_*` / legacy `TENGU_MEMORY_EMBED_*`, `memory.embed_node`). Large graphs use **bounded candidates** + recent seed (see [packages/memory-server/README.md](packages/memory-server/README.md#environment-variables)). These choices favor **portability and predictable behavior** over pretending to be a hosted vector database.

## Documentation

- [RFC: Memory 2.0](docs/RFC-Memory-2.0.md)
- [Competitive benchmark](docs/Memory-2.0-Competitive-Benchmark.md)
- [Runtime compatibility](docs/Memory-2.0-Runtime-Compatibility.md)
- [Security & privacy](docs/Memory-2.0-Security-Privacy.md) · [Host matrix](docs/Memory-2.0-Host-Matrix.md) · [Performance (test SLOs)](docs/Memory-2.0-Performance.md)
- Packages: [memory-server](packages/memory-server/README.md), [mission-server](packages/mission-server/README.md), [verification-server](packages/verification-server/README.md)

## Workspace CI (clean checkout)

On every push/PR to `main`: **install → build all workspace packages → typecheck → verify Memory, Mission, Verification → verify npm pack for Memory → platform demo.**

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm run typecheck
pnpm run verify:memory
pnpm run verify:mission
pnpm run verify:verification
pnpm run verify:npm-pack
pnpm run demo:platform
```

## Tech stack

- Node **≥ 18**, TypeScript strict, pnpm workspaces, `@modelcontextprotocol/sdk`, `sql.js`, `zod`.

## License

MIT
