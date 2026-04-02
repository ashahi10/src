# @tengu/verification-server

MCP server for **durable verification proofs** (sql.js SQLite). Records artifacts that can be linked from **Memory 2.0** evidence (e.g. `tengu://verification/{id}`).

## Capabilities

| Tool | Purpose |
|------|---------|
| `verification.record_proof` | Store `summary`, `detailUri`, optional `missionId`; returns `verificationId` |
| `verification.get_proof` | Fetch by id |

## Persistence

- **`TENGU_VERIFICATION_DB`** — SQLite file path (default `~/.tengu/verification.db`).
- **`TENGU_VERIFICATION_SYNC_WRITES=1`** — synchronous flush (optional).

## Run

```bash
pnpm --filter @tengu/verification-server run build
node packages/verification-server/dist/index.js
```

CLI: **`tengu-verification`**.

## Quality gate

`pnpm run verify:ship` — build, typecheck, Vitest (CRUD + **MCP stdio e2e**), smoke.

## Limits

Proofs are **opaque URIs + summary**—no built-in cryptographic verification or external CI integration in this package.

## License

MIT
