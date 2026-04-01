# Gap Analysis and Target Architecture (Transformation Program)

Status: Move-ready architecture analysis for implementation planning (with bounded-risk carry-forward rules)  
Scope: `/Users/adityashahi/Downloads/src`  
Purpose: Translate current-state evidence and transformation vision into an actionable target architecture with explicit gaps, priorities, and dependency-safe sequencing.

## 1) Inputs, Scope, and Evidence Policy

Primary inputs:

1. `docs/01-current-state-architecture.md` (current-state evidence baseline)
2. `docs/02-vision-and-guardrails.md` (target intent and non-negotiable guardrails)
3. Source anchors already verified in this workspace slice (runtime, contracts, orchestration, state, remote/bridge, policy, memory, tasks, hooks)

Evidence policy:

- All current-state claims in this document map to `01` claims or direct source anchors.
- All future-state statements are design intent and must not be read as "already implemented."
- Any statement that depends on unknowns `U-001` or `U-002` is marked `bounded-risk`.

Out-of-scope in this document:

- per-file implementation diffs
- sprint-level staffing plans
- final CI/release mechanics not visible in this slice (`bounded-risk`)

## 2) Current-to-Target Gap Summary

| Gap ID | Domain | Current State (from `01`) | Target State (from `02`) | Severity | Why it matters |
|---|---|---|---|---|---|
| G-001 | Mission lifecycle | Strong per-turn flow (`query.ts`, `QueryEngine.ts`) but no first-class mission transaction model | Mission Engine with plan->execute->verify->commit/abort and resumable state | High | Long-horizon correctness and deterministic recovery |
| G-002 | Completion confidence | Errors/denials are surfaced, but proof+confidence is not first-class completion contract | Verification-first runtime with confidence and uncertainty artifacts | High | Prevents false "done" outcomes |
| G-003 | Risk policy centralization | Permission and policy logic is present but distributed across hooks/tools/services | Unified risk policy engine and one authoritative decision path | High | Reduces policy drift and inconsistent approvals |
| G-004 | Cost planning | Existing local optimizations and runtime controls exist, but no objective-level preflight cost planning | Cost-intelligent planner with phase-aware adaptation | Medium-High | Better cost/quality/risk control at scale |
| G-005 | Long-horizon memory | Session/memory capabilities exist, but no explicit hybrid memory graph with freshness enforcement | System-aware memory graph with evidence links + decay/refresh | Medium-High | Better continuity and fewer stale assumptions |
| G-006 | Multi-agent governance | Task and agent features exist, but no formal cross-agent contract/arbitration framework | Contracted subagent execution with coordinator validation | High | Safer parallelization and merge integrity |
| G-007 | Invariant enforcement | Invariants are documented; enforcement is partly discipline-based | Runtime-checkable invariant guards across mission/policy/state | Medium | Prevents state drift regressions |
| G-008 | Cross-mode parity | Modes are documented, behavior differs by mode with complexity risk | Explicit mode-parity gates and compatibility test matrix | High | Avoids breakage during transformation rollout |

## 3) Detailed Gap Inventory

## 3.1 Reliability and Determinism

Current-state anchors:

- async turn loop and orchestration: `query.ts`, `QueryEngine.ts`, `services/tools/toolOrchestration.ts`
- state split and invariants: `bootstrap/state.ts`, `state/AppStateStore.ts`
- task lifecycle primitives: `tasks/types.ts`, `utils/task/framework.ts`, `tasks/stopTask.ts`

Gaps:

1. No first-class mission object with lifecycle semantics (`G-001`).
2. No single runtime transaction boundary spanning multi-step objective execution.
3. Invariants are known but not consistently machine-enforced at mission boundaries (`G-007`).

Target requirements:

- mission lifecycle state machine
- explicit checkpointing and resumability
- invariant checks at phase transitions

## 3.2 Verification and Completion Integrity

Current-state anchors:

- tool execution/hook handling and failure propagation: `services/tools/toolExecution.ts`, `services/tools/toolHooks.ts`, `utils/hooks.ts`
- transcript persistence: `utils/sessionStorage.ts`

Gaps:

1. Verification is present in workflows but not mandatory as a runtime contract (`G-002`).
2. No normalized proof artifact schema for "objective complete."
3. Confidence/uncertainty not systematically surfaced in final completion envelopes.

Target requirements:

- required verification policy per action bundle
- proof-of-completion artifact
- confidence score and uncertainty reason taxonomy

## 3.3 Security, Trust, and Policy Governance

Current-state anchors:

- permission context and handlers: `hooks/toolPermission/PermissionContext.ts`, `hooks/useCanUseTool.tsx`
- distributed policy services: `services/policyLimits/index.ts`, `services/remoteManagedSettings/index.ts`
- remote/bridge control paths: `remote/RemoteSessionManager.ts`, `remote/SessionsWebSocket.ts`, `bridge/bridgeMain.ts`

Gaps:

1. Policy control is partially centralized but still distributed in enforcement paths (`G-003`).
2. No singular risk evaluator for multi-action chains.
3. Auditability is broad but not guaranteed as one immutable decision ledger.

Target requirements:

- unified risk scoring engine
- deterministic approval bands (`R1/R2/R3`)
- append-only policy decision records with correlation IDs

## 3.4 Cost and Performance Governance

Current-state anchors:

- tool orchestration limits/concurrency: `services/tools/toolOrchestration.ts`
- policy/settings polling defaults: `services/policyLimits/index.ts`, `services/remoteManagedSettings/index.ts`
- MCP/client behavior and timeouts: `services/mcp/client.ts`

Gaps:

1. No objective-level preflight cost banding (`G-004`).
2. No explicit phase-adaptive model/runtime policy integrated with mission lifecycle.
3. Limited formal reuse policy for verified intermediate artifacts.

Target requirements:

- preflight plan with cost/quality/risk trade bands
- phase-aware model/tool strategy switching
- validated reuse cache with invalidation safety

## 3.5 Context and Memory Quality

Current-state anchors:

- memdir constraints and context shaping: `memdir/memdir.ts`
- team/session memory services: `services/teamMemorySync/index.ts`, `services/SessionMemory/sessionMemory.ts`

Gaps:

1. No explicit typed memory graph for decisions/incidents/constraints (`G-005`).
2. Freshness and staleness controls are not unified as a first-class memory policy.
3. Evidence-linking from memory facts to code/runtime proof is incomplete.

Target requirements:

- typed memory graph model
- decay/refresh/freshness policy
- evidence links and trust scoring on memory nodes

## 3.6 Multi-Agent Governance and Composition

Current-state anchors:

- task families and task framework: `tasks/*`, `utils/task/framework.ts`
- agent tooling surfaces: `tools/AgentTool/*`, task-related tools

Gaps:

1. No mandatory subagent input/output/acceptance contract (`G-006`).
2. Coordinator merge logic is not yet contract-validated end-to-end.
3. Arbitration policy for conflicting outputs is not formalized.

Target requirements:

- subagent contract schema
- coordinator validation stage
- arbitration protocol with verification weighting

## 4) Target Architecture Blueprint

## 4.1 Logical architecture layers

1. **Interface layer**
   - interactive REPL
   - headless/SDK
   - remote/bridge control surfaces
2. **Objective layer (new core)**
   - Mission Engine (A)
   - verification orchestration (B)
   - confidence/uncertainty envelope
3. **Policy and governance layer**
   - Unified Risk Policy Engine (C)
   - approval workflows and audit ledger
4. **Planning/economics layer**
   - Cost-Intelligent Planner (D)
   - phase strategy and validated reuse
5. **Knowledge layer**
   - System-Aware Memory 2.0 graph (E)
   - freshness and evidence linkage
6. **Execution layer**
   - existing tool orchestration and command/runtime contracts
   - Multi-Agent Contract Framework coordinator (F)
7. **Observability and persistence layer**
   - transcript/event evidence
   - metrics and policy decision telemetry

## 4.2 Target runtime control flow (high level)

1. Objective intake -> mission creation (A)
2. Preflight planning -> cost band selection (D)
3. Risk preclassification -> approval strategy assignment (C)
4. Step execution via existing runtime/tools (preserve contracts)
5. Mandatory verification bundle execution (B)
6. Confidence/uncertainty synthesis (B)
7. Commit/abort decision with rollback pathway (A/C)
8. Evidence + memory update (E)
9. If delegated: subagent contract validation and arbitration (F)

## 4.3 Compatibility principle in target architecture

All new layers wrap current contracts rather than replacing them abruptly:

- preserve command/tool/query/MCP/session/remote envelopes
- add mission/policy/verification metadata additively
- use shims for any contract transition

## 5) Capability Mapping (A-F to Architecture)

| Enhancement | Primary Layer | Depends On | Enables | Compatibility Sensitivity |
|---|---|---|---|---|
| A Mission Engine | Objective | baseline contracts, persistence | lifecycle determinism, rollback, resumability | High (session/flow metadata) |
| B Verification-First | Objective + Observability | A, existing test/tool hooks | proof artifacts, confidence envelope | Medium-High |
| C Risk Policy Engine | Governance | permission paths, policy services | consistent approval and audit behavior | High (tool/remote approval paths) |
| D Cost Planner | Planning | A + runtime metrics + caching | objective economics and adaptive strategy | Medium |
| E Memory 2.0 | Knowledge | evidence events, memory services | long-horizon context quality | Medium |
| F Multi-Agent Contracts | Execution + Governance | A/B/C + task/agent tooling | safe delegation and merge integrity | High |

## 6) Dependency and Sequencing Model

Recommended dependency order (architecture-first):

1. **Foundation track**
   - A (mission lifecycle primitives)
   - C (risk policy centralization interface)
2. **Assurance track**
   - B (verification contracts)
3. **Scale track**
   - F (subagent contracts) after A/B/C interfaces stabilize
4. **Optimization track**
   - D (cost planning) and E (memory graph) in parallel after foundational contracts exist

Rationale:

- A and C define control boundaries.
- B validates completion correctness.
- F relies on all of A/B/C for safe delegated execution.
- D and E improve economics and quality once core control loops are stable.

## 7) Gap Closure Plan by Workstream

| Workstream | Primary gaps | First deliverable | Exit criteria |
|---|---|---|---|
| WS-1 Mission lifecycle | G-001, G-007 | mission schema + lifecycle state machine | resumable mission with checkpoint tests |
| WS-2 Verification and confidence | G-002 | verification policy + proof artifact schema | completion gated by required checks |
| WS-3 Risk governance | G-003 | central risk evaluator + approval API | uniform decision behavior across modes |
| WS-4 Cost intelligence | G-004 | preflight cost band planner | cost/quality/risk policy active in planning |
| WS-5 Memory graph | G-005 | node/edge schema + freshness policy | evidence-linked memory retrieval active |
| WS-6 Multi-agent governance | G-006 | subagent contract schema + validator | unvalidated outputs blocked from merge |
| WS-7 Mode parity and compatibility | G-008 | mode compatibility test matrix | no regressions on critical contracts |

## 8) Target Non-Functional Expectations

These are target direction statements; numeric thresholds are set in later execution docs after baseline telemetry windows are collected.

Reliability:

- multi-step objective success should improve with verification gating
- mission resume/rollback should reduce partial-failure dead ends

Safety:

- high-risk actions should be fully approval-traceable
- policy decisions should be reproducible from recorded factors

Cost/performance:

- objective-level cost variance should align with selected band intent
- phase-aware strategy should reduce unnecessary high-cost execution

Quality:

- final completion responses should include uncertainty disclosure by default
- compatibility-critical regressions should trend downward release over release

## 9) Bounded-Risk Handling in This Document

Inherited unknowns:

- `U-001`: generated SDK control type parity (`bounded-risk`)
- `U-002`: full CI/build/deploy visibility (`bounded-risk`)

Effect on `03`:

1. This document may define architecture and migration intent independent of those artifacts.
2. This document may not assert final implementation compatibility for unseen generated types.
3. This document may not finalize release execution procedures dependent on unseen CI manifests.

## 10) Decision Log (Initial Entries)

Format follows the mandatory template from `02`.

| Decision ID | Date (UTC) | Owner | Context / Problem | Options Considered | Chosen Option | Rationale | Compatibility Impact | Risk Class (`R1/R2/R3`) | Verification Plan | Rollback Plan | Evidence Links | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DEC-03-001 | 2026-03-31 | Architecture doc owner | Need safe sequence for A-F with minimal regression risk | parallel all tracks; sequence A->B->C...; layered foundation-first | foundation-first with staged dependency tracks | preserves current contracts while introducing control layers incrementally | additive-first, contract-preserving | R2 | mode-wise compatibility gate + contract tests | revert to prior runtime path behind feature flags | `docs/01-current-state-architecture.md`, `docs/02-vision-and-guardrails.md` | approved |
| DEC-03-002 | 2026-03-31 | Architecture doc owner | Need a target architecture that does not force immediate contract breaks | replace core runtime now; wrap existing runtime with new objective/policy layers | wrap-and-extend strategy | lower blast radius and easier rollback | mostly additive, no immediate breaking envelopes | R2 | compatibility regression suite over command/tool/query/MCP/session/remote | disable new wrapper layers and fall back to baseline flow | `query.ts`, `QueryEngine.ts`, `Tool.ts`, `utils/sessionStorage.ts`, remote/bridge modules | approved |

## 11) Definition of Done for This Document

`03` is complete when all are true:

1. Every major strategic gap maps to a concrete target capability.
2. Target architecture layers and flow are explicit and dependency-aware.
3. A-F mapping includes dependencies and compatibility sensitivity.
4. Workstream closure plan has exit criteria.
5. Bounded-risk constraints are explicitly carried and enforced.
6. Decision log entries exist in the mandated format.

---

This file is the authoritative gap-analysis and target-architecture baseline for subsequent migration and implementation planning documents.
