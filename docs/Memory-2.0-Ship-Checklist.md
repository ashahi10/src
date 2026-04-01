# Memory 2.0 Ship Checklist

## Functional Gates

- `memory.create_node` enforces trust policy for high confidence without evidence.
- `memory.query` returns ranked results with provenance fields:
  - `matchScore`
  - `compositeScore`
  - `evidenceQualityScore`
  - `salienceScore`
  - `conflict`
- `memory.refresh` records reaffirmation metadata.
- `memory.stats` includes `highConfidenceWithoutEvidenceCount`.

## Reliability Gates

- Startup fails with structured error when DB cannot be initialized.
- Persistence survives close/restart cycle.
- Query path avoids full-table decay writes on each request.
- Save policy documented:
  - Debounced by default
  - Synchronous mode with `TENGU_MEMORY_SYNC_WRITES=1`

## Test Gates

Run in `packages/memory-server`:

```bash
pnpm run verify:ship
```

Must pass:

- Production build (`dist/index.js`)
- Typecheck
- Unit/integration tests (including **MCP stdio e2e** via official SDK client)
- Smoke test

CI (when using GitHub Actions): `.github/workflows/memory-server-ci.yml` runs the same `verify:ship` gate on Ubuntu + Node 22.

## Performance Gates

- Performance smoke test over 2k nodes passes within practical latency threshold.
- Retrieval can return matches beyond the first page (no silent 500-node recall ceiling).

## Documentation Gates

- RFC storage/runtime section reflects actual implementation.
- Competitive benchmark doc present.
- Runtime compatibility doc present.
- CLI usage and environment variables documented.
