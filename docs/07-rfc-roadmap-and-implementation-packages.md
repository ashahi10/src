# RFC Roadmap and Implementation Packages

Status: Program RFC and package planning baseline  
Scope: `/Users/adityashahi/Downloads/src` transformation program  
Purpose: Convert A-F strategy into concrete RFC packages with dependency-safe ordering, integration anchors, acceptance gates, and rollout readiness criteria.

## 1) Inputs and Traceability

Authoritative dependencies:

1. `docs/01-current-state-architecture.md` (contract/evidence baseline)
2. `docs/02-vision-and-guardrails.md` (non-negotiable guardrails)
3. `docs/03-gap-analysis-and-target-architecture.md` (gap/target/dependencies)
4. `docs/04-migration-plan-and-rollout.md` (phase/ring/gate model)
5. `docs/05-execution-model-and-operating-principles.md` (runtime semantics)
6. `docs/06-program-execution-rules-and-principles.md` (program governance)
7. `docs/11-implementation-integration-specification.md` (concrete types, module placement, integration points)

Traceability rules:

- every package maps to one or more gaps (`G-001`..`G-008`) and enhancements (A-F)
- every package defines integration anchors in existing code surfaces
- every package defines acceptance gates and rollout eligibility

## 2) RFC Package Framework

## 2.1 Package classes

1. **Foundation packages**: establish control boundaries and contracts
2. **Assurance packages**: verification, confidence, auditability
3. **Scale packages**: multi-agent governance and merge integrity
4. **Optimization packages**: cost and memory intelligence
5. **Hardening packages**: compatibility, mode parity, launch readiness

## 2.2 Required RFC sections (mandatory for every package)

Each package RFC must include:

1. problem statement and target behavior
2. explicit non-goals
3. integration anchors (existing modules/contracts touched)
4. compatibility impact classification (`additive` / `behavioral` / `breaking`)
5. migration strategy and shims
6. verification plan and gate mapping (`GATE-C/B/S/P/O`)
7. rollback plan (`L1/L2/L3`)
8. bounded-risk status (`none` or `U-001`/`U-002` tagged)
9. decision record IDs

## 2.3 RFC acceptance checklist

RFC cannot move to implementation unless:

1. required sections are complete
2. compatibility impact is explicit
3. gate evidence plan is testable
4. owner roles are assigned
5. phased rollout target ring is declared

## 3) Package Roadmap (Master List)

| Package ID | Package Name | Enhancement(s) | Gap(s) | Priority | Depends On | Target Phase |
|---|---|---|---|---|---|---|
| PKG-00 | Program Contract Freeze + Baseline Harness | Cross-cutting | G-008 | P0 | none | Phase 0 |
| PKG-A1 | Mission Schema and Lifecycle Contract | A | G-001, G-007 | P0 | PKG-00 | Phase 1 |
| PKG-C1 | Unified Risk Evaluator Contract | C | G-003 | P0 | PKG-00 | Phase 1 |
| PKG-A2 | Mission Runtime Integration Wrapper | A | G-001 | P1 | PKG-A1, PKG-C1 | Phase 1 |
| PKG-B1 | Verification Policy and Gate Engine | B | G-002 | P1 | PKG-A2 | Phase 2 |
| PKG-B2 | Proof Artifact + Confidence Envelope | B | G-002 | P1 | PKG-B1 | Phase 2 |
| PKG-F1 | Subagent Contract Schema + Validator | F | G-006 | P1 | PKG-A2, PKG-B1, PKG-C1 | Phase 3 |
| PKG-F2 | Coordinator Arbitration + Merge Controls | F | G-006 | P1 | PKG-F1, PKG-B2 | Phase 3 |
| PKG-D1 | Cost Band Planner + Policy Interface | D | G-004 | P2 | PKG-A2, PKG-B1 | Phase 4 |
| PKG-D2 | Adaptive Execution Strategy Controls | D | G-004 | P2 | PKG-D1 | Phase 4 |
| PKG-E1 | Memory Graph Schema + Freshness Policy | E | G-005 | P2 | PKG-A2, PKG-B2 | Phase 4 |
| PKG-E2 | Evidence-Linked Memory Retrieval Path | E | G-005 | P2 | PKG-E1 | Phase 4 |
| PKG-H1 | Cross-Mode Compatibility Hardening | Cross-cutting | G-008 | P0 | all phase packages | Phase 5 |
| PKG-H2 | Launch Readiness + Rollback Drills | Cross-cutting | G-008 | P0 | PKG-H1 | Phase 5 |

## 4) Package Specifications

## 4.1 PKG-00 Program Contract Freeze + Baseline Harness

Objective:

- lock compatibility-critical contracts and baseline tests before feature-layer changes.

Integration anchors:

- `types/command.ts`, `Tool.ts`, `query.ts`, `QueryEngine.ts`
- `services/mcp/types.ts`, `services/mcp/client.ts`
- `utils/sessionStorage.ts`
- `remote/SessionsWebSocket.ts`, `remote/RemoteSessionManager.ts`, `bridge/bridgeMain.ts`
- `cli/structuredIO.ts`, `cli/print.ts` (headless/SDK permission and control transport)
- `cli/transports/SSETransport.ts` (SSE transport control layer)
- `entrypoints/sdk/coreTypes.ts`, `entrypoints/sdk/coreSchemas.ts` (SDK type contracts and Zod schemas)
- `components/permissions/PermissionRequest.tsx` (REPL permission dispatch)
- `state/AppStateStore.ts` (AppState shape contract)

Required artifacts:

- `artifacts/phase-0/contract-freeze-list.md`
- `artifacts/phase-0/mode-regression-baseline-matrix.md`

Acceptance gates:

- `GATE-C`, `GATE-B`

## 4.2 PKG-A1 Mission Schema and Lifecycle Contract

Objective:

- define mission state machine and lifecycle transition rules.

Integration anchors:

- mission wrapper around `query.ts` and `QueryEngine.ts`
- state persistence compatibility with `utils/sessionStorage.ts`
- interaction with task lifecycle surfaces (`tasks/types.ts`, `utils/task/framework.ts`)

Required artifacts:

- `artifacts/phase-1/mission-schema-and-lifecycle-spec.md`

Acceptance gates:

- `GATE-C`, `GATE-B`

## 4.3 PKG-C1 Unified Risk Evaluator Contract

Objective:

- centralize risk scoring and approval policy classification.

Integration anchors:

- permission pathways: `hooks/toolPermission/PermissionContext.ts`, `hooks/useCanUseTool.tsx`
- policy services: `services/policyLimits/index.ts`, `services/remoteManagedSettings/index.ts`
- tool execution enforcement: `services/tools/toolExecution.ts`

Required artifacts:

- `artifacts/phase-1/risk-policy-interface-spec.md`

Acceptance gates:

- `GATE-S`, `GATE-C`

## 4.4 PKG-A2 Mission Runtime Integration Wrapper

Objective:

- integrate mission lifecycle into runtime without breaking existing execution envelopes.

Integration anchors:

- `query.ts`, `QueryEngine.ts`, `services/tools/toolOrchestration.ts`
- transcript/event compatibility via `utils/sessionStorage.ts`

Required artifacts:

- `artifacts/phase-1/compatibility-regression-report.md`
- `artifacts/phase-1/phase-exit-gate-package.md`

Acceptance gates:

- `GATE-C`, `GATE-B`, `GATE-O`

## 4.5 PKG-B1 Verification Policy and Gate Engine

Objective:

- define and enforce required verification checks prior to completion.

Integration anchors:

- hooks and tool lifecycle surfaces: `services/tools/toolHooks.ts`, `utils/hooks.ts`
- completion flow wrapper around query execution outputs

Required artifacts:

- `artifacts/phase-2/verification-policy-schema.md`

Acceptance gates:

- `GATE-B`, `GATE-S`

## 4.6 PKG-B2 Proof Artifact + Confidence Envelope

Objective:

- standardize proof-of-completion artifact and confidence/uncertainty output.

Integration anchors:

- output/result envelope generation at runtime integration layer
- persistence linkage through session artifacts (`utils/sessionStorage.ts`)

Required artifacts:

- `artifacts/phase-2/proof-artifact-envelope-spec.md`
- `artifacts/phase-2/confidence-uncertainty-model.md`

Acceptance gates:

- `GATE-B`, `GATE-O`

## 4.7 PKG-F1 Subagent Contract Schema + Validator

Objective:

- establish mandatory subagent input/output/budget/tool constraints.

Integration anchors:

- `tools/AgentTool/*`
- `tasks/*`, `utils/task/framework.ts`

Required artifacts:

- `artifacts/phase-3/subagent-contract-schema.md`
- `artifacts/phase-3/coordinator-validation-flow.md`

Acceptance gates:

- `GATE-C`, `GATE-B`, `GATE-S`

## 4.8 PKG-F2 Coordinator Arbitration + Merge Controls

Objective:

- enforce arbitration and non-mergeability of unvalidated outputs.

Integration anchors:

- coordinator/adjudication path in agent orchestration surfaces
- verification and confidence envelope integration from B packages

Required artifacts:

- `artifacts/phase-3/arbitration-policy-spec.md`
- `artifacts/phase-3/phase-exit-gate-package.md`

Acceptance gates:

- `GATE-B`, `GATE-S`, `GATE-O`

## 4.9 PKG-D1 Cost Band Planner + Policy Interface

Objective:

- preflight objective-level cost banding with policy-safe constraints.

Integration anchors:

- planning wrapper around execution start
- cost/performance instrumentation from runtime telemetry surfaces

Required artifacts:

- `artifacts/phase-4/cost-band-planner-spec.md`

Acceptance gates:

- `GATE-P`, `GATE-S`

## 4.10 PKG-D2 Adaptive Execution Strategy Controls

Objective:

- phase-aware adaptive strategy selection without violating verification/safety.

Integration anchors:

- runtime execution strategy controls in mission loop wrapper
- enforcement that adaptive policy does not bypass gate checks

Required artifacts:

- `artifacts/phase-4/phase-exit-gate-package.md`

Acceptance gates:

- `GATE-P`, `GATE-B`

## 4.11 PKG-E1 Memory Graph Schema + Freshness Policy

Objective:

- define typed memory graph nodes/edges and freshness policy.

Integration anchors:

- `memdir/memdir.ts`
- `services/teamMemorySync/index.ts`
- `services/SessionMemory/sessionMemory.ts`

Required artifacts:

- `artifacts/phase-4/memory-graph-freshness-and-evidence-spec.md`

Acceptance gates:

- `GATE-C`, `GATE-B`, `GATE-P`

## 4.12 PKG-E2 Evidence-Linked Memory Retrieval Path

Objective:

- enforce evidence linkage on memory retrieval used for decisions.

Integration anchors:

- retrieval pipeline in memory/session services
- proof artifact cross-link contract from B packages

Required artifacts:

- `artifacts/phase-4/phase-exit-gate-package.md`

Acceptance gates:

- `GATE-B`, `GATE-S`, `GATE-O`

## 4.13 PKG-H1 Cross-Mode Compatibility Hardening

Objective:

- validate and harden parity across interactive/headless/remote-bridge/daemon paths.

Integration anchors:

- entry/runtime path surfaces in `entrypoints/cli.tsx`, `main.tsx`, `cli/print.ts`
- remote/bridge transport surfaces in `remote/*`, `bridge/*`, `server/directConnectManager.ts`

Required artifacts:

- `artifacts/phase-5/full-compatibility-matrix-report.md`

Acceptance gates:

- `GATE-C`, `GATE-B`, `GATE-S`, `GATE-P`

## 4.14 PKG-H2 Launch Readiness + Rollback Drills

Objective:

- certify launch readiness with proven rollback drills and operational runbook.

Integration anchors:

- rollout controls and incident paths from `04` and `05` governance model

Required artifacts:

- `artifacts/phase-5/operational-runbook-v1.md`
- `artifacts/phase-5/launch-readiness-review.md`
- `artifacts/phase-5/rollback-drill-report.md`

Acceptance gates:

- `GATE-O` (plus all phase carry-over gates)

## 5) Implementation Sequencing Rules

Sequencing constraints:

1. A package cannot start until all declared dependencies are phase-exited.
2. Packages with shared compatibility-critical anchors cannot merge concurrently without coordination decision record.
3. Any package touching command/tool/query/MCP/session/remote-bridge contracts must include compatibility regression evidence before phase exit.
4. Any package modifying risk or approval behavior must include safety-owner sign-off.

Parallelization policy:

- allowed: independent optimization packages (`D`, `E`) after foundation and assurance packages exit
- disallowed: parallel changes that both modify control-envelope semantics in the same ring window without explicit arbitration plan

## 6) Gate and Artifact Mapping Matrix

| Package | Required Gates | Required Phase Artifact Package | Owner Sign-off Required |
|---|---|---|---|
| PKG-00 | C, B | phase-0 artifacts | Yes |
| PKG-A1, PKG-C1, PKG-A2 | C, B, S, O (as applicable) | phase-1 artifacts | Yes |
| PKG-B1, PKG-B2 | B, S, O | phase-2 artifacts | Yes |
| PKG-F1, PKG-F2 | C, B, S, O | phase-3 artifacts | Yes |
| PKG-D1, PKG-D2, PKG-E1, PKG-E2 | P, B, S, O (as applicable) | phase-4 artifacts | Yes |
| PKG-H1, PKG-H2 | all gates + O final | phase-5 artifacts | Yes |

Sign-off format requirement:

- use owner sign-off template from `docs/04-migration-plan-and-rollout.md` Section `4.7`.

## 7) RFC Backlog and Priority Rules

Backlog priority policy:

1. safety and compatibility packages rank above optimization packages
2. foundation packages rank above dependent assurance/scale packages
3. packages blocking multiple downstream dependencies get priority boost

Backlog states:

- `drafting`
- `review-ready`
- `approved`
- `in-implementation`
- `gate-validation`
- `phase-exited`
- `rolled-back` (if applicable)

State transition rule:

- transition to `in-implementation` requires approved RFC + owner assignment + entry criteria evidence.

## 8) Bounded-Risk Handling in RFC Roadmap

Inherited unknowns:

- `U-001` generated SDK control type artifacts unavailable
- `U-002` CI/build/deploy manifests unavailable

Rules:

1. RFCs dependent on these items must be tagged `bounded-risk`.
2. No final launch-signoff package may be approved while `U-001` or `U-002` remains unresolved.
3. Bounded-risk packages must include closure owner and target evidence source.

## 9) Initial Decision Log Entries

| Decision ID | Date (UTC) | Owner | Context / Problem | Options Considered | Chosen Option | Rationale | Compatibility Impact | Risk Class (`R1/R2/R3`) | Verification Plan | Rollback Plan | Evidence Links | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DEC-07-001 | 2026-03-31 | RFC program owner | Need a roadmap that prevents dependency inversions and compatibility drift | ad-hoc RFC order; enhancement-by-enhancement order; dependency-ordered package roadmap | dependency-ordered package roadmap | aligns implementation with proven phase/gate model and reduces regression risk | additive-first and contract-preserving by default | R2 | gate mapping matrix + per-package acceptance evidence | phase/ring rollback per `04` + package rollback record | `docs/03-gap-analysis-and-target-architecture.md`, `docs/04-migration-plan-and-rollout.md` | approved |
| DEC-07-002 | 2026-03-31 | RFC program owner | Need consistent RFC quality and comparability across teams | free-form RFCs; lightweight checklist; mandatory RFC section schema + acceptance checklist | mandatory RFC section schema + acceptance checklist | reduces ambiguity and review variance | none directly; improves governance consistency | R1 | RFC checklist audits before approval | block package start until RFC corrected | this document Sections 2.2 and 2.3 | approved |

## 10) Definition of Done for This Document

`07` is complete when all are true:

1. package roadmap covers all A-F enhancements and cross-cutting hardening.
2. each package has dependencies, phase target, and gate expectations.
3. integration anchors map to current code surfaces without fabricating implementation status.
4. artifact and sign-off requirements are explicit and aligned with `04`.
5. sequencing rules prevent dependency inversion and unsafe parallelism.
6. bounded-risk handling for `U-001`/`U-002` is explicit.

---

This file is the authoritative RFC roadmap and implementation-packages baseline for program execution.
