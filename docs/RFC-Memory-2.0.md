# RFC: System-Aware Memory 2.0

Status: Approved  
Package: `@mnemai/memory-server`  
Type: MCP Server (stdio transport)

## 1) Objective

Provide AI agents with a structured, evidence-linked memory graph featuring typed nodes, freshness controls, contradiction handling, and ranked retrieval — delivered as a standalone MCP server compatible with any MCP client.

## 2) Problem Statement

Current AI agent memory systems lack:

- typed, structured memory nodes (architecture decisions, incidents, constraints, preferences)
- explicit freshness/staleness governance with decay rules
- evidence linking for memory trustworthiness
- contradiction detection and resolution
- cross-session and cross-project memory reuse

## 3) Non-Goals

- replacing agent-internal short-term context windows
- introducing opaque memory behavior without traceability
- treating historical memory as always high-confidence truth

## 4) MCP Tools Exposed

| Tool | Description |
|---|---|
| `memory.create_node` | Create a typed memory node with content, scope, and optional evidence |
| `memory.query` | Retrieve ranked memory nodes by relevance, freshness, and evidence strength |
| `memory.add_edge` | Create a typed relationship between two memory nodes |
| `memory.attach_evidence` | Attach evidence references to an existing node |
| `memory.refresh` | Reaffirm a node, boosting its freshness score |
| `memory.stats` | Return graph statistics: node counts, freshness distribution, contradictions |

## 5) MCP Resources Exposed

| Resource | Description |
|---|---|
| `memory://stats` | Read-only graph statistics snapshot |
| `memory://node/{nodeId}` | Read-only single node with edges and evidence |

## 6) Memory Graph Model

### 6.1 Node model

- `nodeId` (branded string)
- `nodeType` (preference | architecture_decision | incident | constraint | repo_landmark | tool_outcome | general)
- `content` (text)
- `confidence` (0-1)
- `freshnessScore` (0-1, decays over time)
- `createdAt`, `updatedAt`
- `evidenceRefs[]` (pointers to transcripts, tool results, code anchors, etc.)
- `sourceScope` (session | project | team)
- `tags[]`

### 6.2 Edge model

- `edgeId`
- `fromNodeId`, `toNodeId`
- `relationType` (supports | contradicts | depends_on | supersedes | related_to | caused_by | blocks)
- `weight` (0-1)
- `createdAt`

### 6.3 Evidence link model

Evidence references may point to: transcript events, tool results, verification artifacts, code anchors, decision records, external URIs.

High-confidence policy: a node cannot be treated as high-confidence without valid evidence links.

## 7) Freshness and Staleness Policy

### 7.1 Freshness mechanics

Freshness score considers: recency, evidence recency, contradiction/superseding nodes, environment changes.

### 7.2 Decay and refresh

- Stale nodes decay automatically via configurable decay function (exponential, linear, step)
- Refresh requires new supporting evidence or explicit reaffirmation
- Decayed nodes remain retrievable but lower-ranked and flagged

### 7.3 Contradiction handling

- Contradictory nodes (linked by `contradicts` edges) do not silently overwrite each other
- Retrieval includes contradiction flags so the agent can reason about conflicts

## 8) Retrieval and Ranking

Retrieval ranks by composite score: `relevance * freshnessWeight + freshness * freshnessWeight + evidenceStrength * evidenceWeight`

Injection includes provenance metadata so agents can assess memory trustworthiness.

## 9) Storage

SQLite — zero-config, local persistence. Default path **`~/.mnemai/memory.db`** (new installs), or existing **`~/.tengu/memory.db`** if present; override with **`MNEMAI_MEMORY_DB`** or legacy **`TENGU_MEMORY_DB`**.

**Reference stack:** native `better-sqlite3` on supported Node LTS. **Current package build** uses `sql.js` (WASM SQLite) so the server runs without native compilation; the file format remains standard SQLite.

## 10) Failure Modes

1. Database unavailable — graceful error, tools return structured error responses
2. Evidence link corruption — quarantine suspicious nodes, flag in stats
3. Stale-memory over-injection — freshness scoring prevents this by design

## 11) Type Definitions

All types are defined in `@mnemai/shared-types` package: `MemoryNode`, `MemoryEdge`, `MemoryQueryResult`, `MemoryStats`, `FreshnessConfig`, `EvidenceRef`.
