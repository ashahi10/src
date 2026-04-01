# RFC: Mission Engine

Status: Proposed (implementation-ready spec)  
Owner: Architecture / Runtime  
Target Phase: Phase 1 (foundation), extended in Phase 2+  
Related: A (Mission Engine), G-001, G-007

## 1) Objective

Introduce a first-class Mission abstraction that wraps long-horizon work in a deterministic lifecycle:

- Plan Contract
- Execute Steps
- Verification Gates
- Commit/Abort

The Mission Engine must improve reliability and recovery without breaking existing query/tool/session/remote contracts.

## 2) Problem Statement

Current runtime is robust per-turn but does not provide a single transaction-like model for multi-step objectives. This creates:

- weak resumability across long objectives
- inconsistent completion semantics across modes
- no uniform proof boundary for "done" versus "partially done"
- higher risk of state drift between planning intent and execution reality

## 3) Non-Goals

- replacing existing `query.ts` or `QueryEngine.ts` execution internals
- changing existing tool permission UX flows
- introducing contract-breaking protocol changes in phase-1 rollout
- redesigning CI/release pipelines in this RFC

## 4) Existing System Anchors (Evidence)

Mission Engine integrates around (not replacing):

- runtime loops: `query.ts`, `QueryEngine.ts`
- tool orchestration: `services/tools/toolOrchestration.ts`, `services/tools/toolExecution.ts`
- session persistence: `utils/sessionStorage.ts`
- state surfaces: `bootstrap/state.ts`, `state/AppStateStore.ts`
- remote/bridge control flows: `remote/*`, `bridge/bridgeMain.ts`, `server/directConnectManager.ts`

## 5) Functional Requirements

1. Mission object schema must include:
   - objective
   - constraints
   - budget
   - risk policy reference
   - success criteria
   - rollback strategy
2. Mission lifecycle state machine must be explicit and validated.
3. Mission steps must produce machine-checkable evidence.
4. Mission completion must be gated by verification outcomes.
5. Interrupted missions must be resumable from last consistent checkpoint.
6. Mission metadata must be additive and backward compatible with existing persistence.

## 6) Mission Domain Model

## 6.1 Mission schema (logical)

- `missionId`
- `sessionId`
- `parentMissionId` (optional)
- `objective`
- `constraints[]`
- `budgetPolicy`
- `riskPolicyRef`
- `successCriteria[]`
- `rollbackPlan`
- `createdAt`, `updatedAt`
- `state`
- `steps[]`
- `verificationSummary`
- `confidenceSummary`

## 6.2 Mission state machine

States:

- `created`
- `planned`
- `executing`
- `verifying`
- `completed`
- `aborted`
- `failed`
- `rolled_back`

Required transition guards:

1. no `completed` without verification pass or explicit waiver record
2. no `rolled_back` without prior abort/fail context
3. no direct `executing -> completed` shortcut
4. resume always restores from last persisted checkpoint

## 6.3 Step model

Each step contains:

- `stepId`
- `intent`
- `inputs`
- `actionRef` (command/tool/subagent/manual boundary)
- `expectedOutcome`
- `actualOutcome`
- `status`
- `evidenceRefs[]`
- `startedAt`, `endedAt`

## 7) Architecture and Integration Approach

## 7.1 Wrapper-first insertion strategy

Mission Engine runs as an orchestration layer above current runtime:

1. Mission intake -> plan contract generation
2. For each step, delegate to existing runtime paths
3. Collect results + evidence
4. Invoke verification policy
5. Commit/abort/rollback decision

This preserves existing behavior for non-mission and legacy paths.

## 7.2 Mode behavior

Mission semantics must be consistent in:

- interactive REPL
- headless/SDK
- remote/bridge flows
- daemon/worker contexts

Mode-specific transports differ, but lifecycle correctness must not.

## 7.3 State and persistence strategy

- mission state is persisted additively; existing transcript chain rules remain intact
- mission checkpoints are append-oriented and correlated to session artifacts
- no destructive rewrite of historical transcript format

## 8) API and Contract Surfaces

## 8.1 Internal mission service contract

Core operations:

- `createMission(input)`
- `planMission(missionId)`
- `executeMissionStep(missionId, stepId)`
- `verifyMission(missionId)`
- `commitMission(missionId)` / `abortMission(missionId)`
- `rollbackMission(missionId)`
- `resumeMission(missionId)`

## 8.2 Compatibility constraints

- existing command/tool/query interfaces remain stable
- mission metadata is additive sidecar/envelope data
- remote/bridge control envelopes remain backward compatible

## 9) Failure Modes and Recovery

Critical failure classes:

1. plan generation failure
2. step execution failure
3. verification timeout/failure
4. persistence/write failure
5. remote/bridge disconnect during mission execution

Recovery rules:

- fail fast with explicit mission state update
- persist failure evidence before exit
- support safe resume when possible
- route to rollback path when side effects occurred

## 10) Security and Policy Alignment

Mission Engine does not bypass existing policy/permission controls.

Requirements:

- every step routes through central risk/permission decision path
- high-risk step requires explicit approval gate
- mission audit records include decision source and rationale references

## 11) Observability and Audit Requirements

Required mission telemetry:

- mission lifecycle transitions
- per-step duration and result status
- verification pass/fail + waiver counts
- rollback invocation and outcome

Audit requirements:

- mission-to-step-to-evidence traceability
- append-oriented records with correlation IDs

## 12) Rollout Plan

Phase progression:

1. Phase 1: schema + lifecycle + wrapper integration (advisory)
2. Phase 2: verification-gated completion enforcement
3. Phase 3+: broaden default usage by safe domains/rings

Rollout controls:

- feature flags
- kill switch
- ringed promotion using gate evidence

## 13) Validation Strategy

Must pass before phase exit:

- lifecycle transition tests (happy/abort/fail/resume)
- compatibility regression suite (command/tool/query/MCP/session/remote-bridge)
- persistence integrity tests
- mode matrix smoke tests

## 14) Risks and Mitigations

1. **State drift risk**
   - Mitigation: strict transition guards + checkpoint validation
2. **Compatibility regression risk**
   - Mitigation: additive-only metadata, shim-first strategy
3. **False completion risk**
   - Mitigation: hard verification gate before `completed`
4. **Operational complexity risk**
   - Mitigation: phased rollout + runbook + rollback drills

## 15) Bounded-Risk Constraints

- `U-001`: generated SDK control types unresolved
- `U-002`: full CI/build/deploy visibility unresolved

Rules:

- no final launch sign-off for Mission Engine while `U-001`/`U-002` unresolved
- any dependency on these unknowns must be tagged `bounded-risk`

## 16) Acceptance Criteria

This RFC is accepted when:

1. mission schema/state machine are frozen and approved
2. wrapper integration plan is contract-safe and additive
3. failure/recovery semantics are explicit and testable
4. validation suite and gate mapping are complete
5. rollout/rollback controls are explicit
6. risk and bounded-risk handling are explicit

## 17) Decision Log Entry

| Decision ID | Date (UTC) | Owner | Context / Problem | Options Considered | Chosen Option | Rationale | Compatibility Impact | Risk Class (`R1/R2/R3`) | Verification Plan | Rollback Plan | Evidence Links | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DEC-RFC-A-001 | 2026-03-31 | Runtime architecture owner | Need deterministic multi-step objective lifecycle without rewriting core runtime | rewrite core loop; wrapper-first mission layer; external orchestrator only | wrapper-first mission layer | lowest regression risk while enabling lifecycle controls | additive-first, no immediate contract break | R2 | lifecycle + compatibility + mode tests | L1/L2/L3 per rollout phase | `docs/01-current-state-architecture.md`, `docs/04-migration-plan-and-rollout.md` | proposed |

---

This RFC defines the production-ready Mission Engine approach for safe integration into the existing system.
