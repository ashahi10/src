# Memory 2.0: SQLite graph vs semantic / vector search

## Short answer

Using **SQLite for the memory graph is not outdated**. It is the standard way to store **structured, auditable state** (nodes, edges, evidence, scopes) locally. What people often want from “vector memory” is **fuzzy recall** — that is an **additional retrieval channel**, not a full replacement for a graph.

## What SQLite gives you (and vectors do not replace)

1. **Explicit relationships** — `contradicts`, `supersedes`, `depends_on`, etc., with stable IDs.
2. **Evidence pointers** — URIs and types tied to nodes, for trust and audit.
3. **Deterministic updates** — no nondeterministic indexing unless you add it.
4. **Local-first, offline, single-file deploy** — matches MCP “run a command” hosting.

## What vector / semantic search adds

1. **Synonym and paraphrase recall** — “auth bug” matches “login regression” if embeddings align.
2. **Long-document overlap** — useful when memories are paragraphs, not short facts.

## Recommended advanced direction (honest roadmap)

A **hybrid** design is what most serious systems converge on:

- **SQLite (or libSQL)** remains the **system of record** for the graph.
- **Optional** `memory.embed` / `memory.query_semantic` (or FTS5 full-text) adds **recall width**.
- **Merge ranks** in retrieval: `final = w_struct * graphScore + w_sem * similarity` with explicit provenance.

Memory 2.0 today focuses on the **graph + trust + ranking** layer. Adding embeddings is a **product expansion**, not proof that SQL was wrong.

## False claims to avoid

- “Vectors make memory correct” — vectors improve recall; they do not automatically solve contradictions, evidence, or permissions.
- “SQL cannot scale” — for single-user local MCP workloads, SQLite-class stores are typically **more** than enough; scale limits show up in **embedding index size** and **host RAM**, not SQL itself.
