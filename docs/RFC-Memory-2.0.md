# RFC: System-Aware Memory 2.0

Status: Proposed (implementation-ready spec)  
Owner: Memory / Context Systems  
Target Phase: Phase 4  
Related: E (System-Aware Memory 2.0), G-005

## 1) Objective

Evolve current memory behavior into a hybrid evidence-linked memory graph with freshness controls, while preserving backward compatibility with existing memory/session mechanisms.

## 2) Problem Statement

Current memory context is useful but lacks a unified long-horizon structured model for:

- architecture decisions and constraints over time
- incident and operational context reuse
- explicit freshness/staleness governance
- robust evidence linking for memory trustworthiness

## 3) Non-Goals

- dropping existing memory file compatibility in early phases
- introducing opaque memory behavior without traceability
- treating historical memory as always high-confidence truth

## 4) Existing System Anchors

Primary anchors:

- memory/file context shaping: `memdir/memdir.ts`
- team memory sync: `services/teamMemorySync/index.ts`
- session memory services: `services/SessionMemory/sessionMemory.ts`
- session transcript evidence: `utils/sessionStorage.ts`

## 5) Functional Requirements

1. Introduce typed memory nodes:
   - user preferences
   - architecture decisions
   - incidents
   - constraints
   - repo landmarks
   - tool outcomes
2. Support typed edges and relationship semantics.
3. Enforce freshness scoring with decay/refresh rules.
4. Require evidence links for high-confidence memory usage.
5. Maintain backward-compatible read path for existing memory artifacts.

## 6) Memory Graph Model

## 6.1 Node model (logical)

- `nodeId`
- `nodeType`
- `content`
- `confidence`
- `freshnessScore`
- `createdAt`, `updatedAt`
- `evidenceRefs[]`
- `sourceScope` (session/project/team)

## 6.2 Edge model

- `edgeId`
- `fromNodeId`, `toNodeId`
- `relationType` (supports/contradicts/depends_on/supersedes/etc.)
- `weight`
- `createdAt`

## 6.3 Evidence link model

Evidence references may point to:

- transcript events
- tool results
- verification artifacts
- code anchors
- decision records

High-confidence policy:

- node cannot be treated high-confidence without valid evidence links.

## 7) Freshness and Staleness Policy

## 7.1 Freshness mechanics

Freshness score should consider:

- recency
- evidence recency
- contradiction/newer superseding nodes
- environment/context changes

## 7.2 Decay and refresh

- stale nodes decay automatically over time
- refresh requires new supporting evidence or explicit reaffirmation
- decayed nodes remain retrievable but lower-ranked and flagged

## 7.3 Contradiction handling

- contradictory nodes must not silently overwrite each other
- resolver should preserve lineage and mark conflict status

## 8) Retrieval and Injection Strategy

Retrieval must:

1. prioritize relevant + fresh + evidenced nodes
2. include uncertainty markers for stale/conflicted memory
3. avoid high-confidence injection from weak evidence

Injection must:

- remain additive and compatible with existing context assembly paths
- include provenance metadata for auditability

## 9) Backward Compatibility and Migration

Migration principles:

1. maintain current memory read compatibility initially
2. build graph sidecar alongside current stores
3. progressively shift retrieval to graph-informed ranking
4. keep fallback to legacy path during phased rollout

No destructive migration without proven parity and rollback readiness.

## 10) Failure Modes and Recovery

1. memory graph store unavailable
2. evidence link corruption/incompleteness
3. stale-memory over-injection
4. sync divergence across scopes

Recovery:

- fallback to legacy memory path
- quarantine suspicious nodes
- emit telemetry and require refresh/rebuild workflow

## 11) Observability and Audit Requirements

Required signals:

- retrieval source mix (graph vs legacy)
- freshness distribution
- contradiction incidence
- evidence-link coverage rate
- stale-node usage rate in outputs

Auditability:

- every injected high-confidence memory item must be traceable to evidence.

## 12) Rollout Strategy

1. shadow graph population
2. advisory retrieval ranking (non-blocking)
3. controlled activation for selected domains/rings
4. gradual expansion once quality/safety metrics stabilize

Controls:

- feature flags
- kill switch to legacy path
- ringed rollout

## 13) Validation Requirements

Must validate:

- backward compatibility with existing memory/session behavior
- freshness and decay logic correctness
- contradiction handling correctness
- evidence-link requirements for high-confidence usage
- no regression in completion quality and safety signals

## 14) Risks and Mitigations

1. **Stale memory harms decisions**
   - Mitigation: strict freshness scoring and uncertainty tagging
2. **Graph complexity overhead**
   - Mitigation: phased rollout + bounded scope per phase
3. **Evidence-link gaps**
   - Mitigation: high-confidence guardrails + audit checks
4. **Migration drift**
   - Mitigation: sidecar strategy and fallback path

## 15) Bounded-Risk Constraints

Dependencies involving unresolved `U-001`/`U-002` remain `bounded-risk` and block final launch sign-off where applicable.

## 16) Acceptance Criteria

1. graph schema and freshness model approved
2. compatibility migration plan is additive and rollback-safe
3. evidence-linking requirements are explicit and validated
4. retrieval policy handles stale/conflicting memory safely
5. rollout and fallback controls are defined

## 17) Decision Log Entry

| Decision ID | Date (UTC) | Owner | Context / Problem | Options Considered | Chosen Option | Rationale | Compatibility Impact | Risk Class (`R1/R2/R3`) | Verification Plan | Rollback Plan | Evidence Links | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DEC-RFC-E-001 | 2026-03-31 | Memory systems owner | Need long-horizon structured memory with trust controls while preserving existing behavior | full replacement; sidecar graph with compatibility fallback; metadata-only extension | sidecar graph with compatibility fallback | safest migration path with strong provenance and freshness controls | additive-first with legacy compatibility path | R2 | freshness/compatibility/quality validation suite | disable graph retrieval and revert to legacy memory path | `docs/03-gap-analysis-and-target-architecture.md`, `docs/08-validation-and-test-strategy.md` | proposed |

---

This RFC defines a production-ready Memory 2.0 architecture compatible with current system constraints.
