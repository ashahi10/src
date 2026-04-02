# Memory 2.0 Competitive Benchmark (MCP Memory Market)

## Scope

This benchmark compares `@tengu/memory-server` against current MCP memory offerings commonly used with MCP-capable editors and clients:

- Official MCP memory server (`@modelcontextprotocol/server-memory`)
- OpenMemory / Mem0 MCP
- `memory-graph` (graph-focused MCP memory)
- `mcp-brain-tools` (freshness + spaced repetition focus)
- `mcp-memory-libsql` (search/perf-focused graph memory)

## Capability Matrix

| Capability | Tengu Memory 2.0 | Official MCP Memory | OpenMemory/Mem0 | mcp-brain-tools | mcp-memory-libsql |
|---|---|---|---|---|---|
| Typed memory nodes | Yes (strict enums) | Basic entities/types | Generic memories/topics | Entity/observation model | Entity/relation model |
| Explicit evidence references | Yes | No first-class evidence links | Limited metadata-oriented | Limited | Limited |
| Contradiction edges | Yes (`contradicts`) | Not first-class | Not first-class | Not first-class | Not first-class |
| Trust policy (high confidence requires evidence) | Yes | No | Partial/opaque | Partial | Partial |
| Freshness model | Decay + refresh | Minimal/basic | Product-defined | Strong (review cadence) | Basic/medium |
| Contradiction-aware retrieval output | Yes (flags + arbitration metadata) | No | No | Limited | Limited |
| Portable local runtime | Yes (Node + sql.js SQLite) | Yes | Mostly local-first product path | Requires Elasticsearch | Local/remote libSQL |
| MCP resources (`memory://...`) | Yes | Varies | Varies | Varies | Varies |
| Test coverage depth | Growing (unit + smoke + integration) | Varies | Product-level | Moderate | Moderate |

## Where Memory 2.0 Is Already Strong

1. Evidence-backed trust semantics are explicit and auditable.
2. Contradiction modeling exists in the graph model, not hidden in embeddings.
3. Freshness + confidence + evidence are combined in ranking.
4. Local-first persistence with standard SQLite file format.
5. Good fit for command-line and MCP-driven workflows that need deterministic memory behavior.

## Gaps To Close For Best-in-Class

1. Retrieval scaling and recall on large graphs.
2. Stronger contradiction arbitration strategy (not only flags).
3. More human-like salience and memory promotion/demotion heuristics.
4. Operational maturity: reliability metrics, performance budgets, and release gates.
5. Clear dual-runtime posture: portable default + native optimized path guidance.

## Competitive Positioning Statement

Memory 2.0 should be positioned as:

"A deterministic, evidence-aware, contradiction-resilient MCP memory layer for production use and auditable reasoning."

## References

- [Official MCP memory README](https://raw.githubusercontent.com/modelcontextprotocol/servers/main/src/memory/README.md)
- [mcp-brain-tools README](https://raw.githubusercontent.com/j3k0/mcp-brain-tools/main/README.md)
- [memory-graph repository](https://github.com/memory-graph/memory-graph)
- [mcp-memory-libsql README](https://raw.githubusercontent.com/spences10/mcp-memory-libsql/main/README.md)
- [Mem0/OpenMemory overview](https://mem0.ai/openmemory-mcp)
