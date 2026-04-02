# Memory 2.0 — performance expectations (SLOs from tests)

These numbers come from **automated tests** in `packages/memory-server`, not from production load testing.

| Scenario | Gate | Source |
|----------|------|--------|
| Query latency (≈2k nodes, keyword + ranking, `limit` 40) | **&lt; 5 seconds** wall clock on CI hardware | `test/performance-smoke.test.ts` |

**Notes**

- CI hardware varies; use this as a **regression guard**, not a customer SLA.
- Large graphs use **bounded candidate retrieval** by default; see environment variables in the package README (`MNEMAI_MEMORY_QUERY_*`, legacy `TENGU_MEMORY_QUERY_*`).
- Optional **embeddings** add **network latency** per query when enabled; not included in the 5s gate above.
