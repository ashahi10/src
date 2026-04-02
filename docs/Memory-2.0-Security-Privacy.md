# Memory 2.0 — security & privacy

## Data locality

- **Memory:** use **`MNEMAI_MEMORY_DB`** for the SQLite path, or rely on defaults: **`~/.mnemai/memory.db`** for new installs; if **`~/.tengu/memory.db`** already exists it is reused. Legacy **`TENGU_MEMORY_DB`** is still honored.
- **Mission** and **verification** servers use separate files (`~/.tengu/mission.db`, `~/.tengu/verification.db`) unless overridden with **`TENGU_MISSION_DB`** and **`TENGU_VERIFICATION_DB`**.
- All three are **local files on disk** under your user account (or paths you choose). Nothing is sent to the Mnemai npm org or this repository by default.

## Network exposure

- **No network I/O** for core graph operations (create, query, edges, evidence attach, stats, review tools).
- **Embeddings only:** If **`MNEMAI_MEMORY_EMBED_URL`** and **`MNEMAI_MEMORY_EMBED_KEY`** (or legacy **`TENGU_MEMORY_EMBED_*`**) are set, `memory.embed_node` and the semantic channel in `memory.query` call that **HTTPS endpoint** with node text (truncated server-side). You control the provider and keys.

## MCP hosts

- The server speaks **stdio JSON-RPC**. Your MCP host starts the process and inherits its environment. Use **absolute paths** in host configs so secrets and DB paths are explicit.

## Backups

- Copy the SQLite file(s) while the server is stopped, or rely on filesystem snapshots. For stronger durability on writes, see **`MNEMAI_MEMORY_SYNC_WRITES=1`** (or legacy **`TENGU_MEMORY_SYNC_WRITES=1`**) in the package README.

## Migrations

- Schema is applied at startup (`CREATE TABLE IF NOT EXISTS`, etc.). **Backup before upgrading** across major versions; breaking migrations will be called out in the changelog.
