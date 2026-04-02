# @tengu/mission-server

MCP server for **durable mission objectives** (sql.js SQLite, local file). Complements **Memory 2.0** and **verification** in the Tengu platform demo.

## Capabilities

| Tool | Purpose |
|------|---------|
| `mission.create` | Create mission with `objective` and optional `constraints[]`; returns `missionId` |
| `mission.get` | Fetch one mission |
| `mission.list` | Newest first, optional `limit` |

## Persistence

- **`TENGU_MISSION_DB`** — SQLite file path (default `~/.tengu/mission.db`).
- **`TENGU_MISSION_SYNC_WRITES=1`** — synchronous flush after writes (optional).

## Run

```bash
pnpm --filter @tengu/mission-server run build
node packages/mission-server/dist/index.js
```

CLI: **`tengu-mission`** (shebang on `dist/index.js`).

## Quality gate

`pnpm run verify:ship` — build, typecheck, Vitest (CRUD + **MCP stdio e2e**), smoke.

## Limits

Single-table model (`missions`); no workflow engine or multi-user ACLs—by design for a **small, inspectable** objective store.

## License

MIT
