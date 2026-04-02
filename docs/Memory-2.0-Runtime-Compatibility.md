# Memory 2.0 Runtime Compatibility

## Dual Target Strategy

Memory 2.0 uses a dual-target strategy:

1. **Portable default (current):** `sql.js` backend, works across Node 18+ without native compilation.
2. **Native optimized mode (planned profile):** `better-sqlite3` for environments where native addons are acceptable and pinned to compatible Node LTS.

## Why Portable Default First

- MCP users run across mixed environments (local, CI, containers, remote shells).
- Native addon build friction can block adoption.
- `sql.js` keeps local-first behavior and SQLite file compatibility with lower operational risk.

## Environment Variables

- `MNEMAI_MEMORY_DB` — custom path for SQLite file (legacy: `TENGU_MEMORY_DB`).
- `MNEMAI_MEMORY_SYNC_WRITES=1` — force synchronous persistence writes for stronger durability (legacy: `TENGU_MEMORY_SYNC_WRITES=1`).

## Recommended Runtime Profiles

### Profile A: Portable (default)

- Node: `>=18`
- Storage engine: `sql.js`
- Best for: broad compatibility, quick setup, CI safety.

### Profile B: Native Optimized (advanced deployment)

- Node: LTS pinned runtime with validated native addon ABI
- Storage engine: `better-sqlite3` (future profile implementation)
- Best for: highest local throughput and lower write latency.
