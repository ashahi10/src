# Milestone Tickets and Implementation Plan

Status: Normative implementation execution plan  
Scope: `/Users/adityashahi/Downloads/src` transformation program (Enhancements A-F)  
Purpose: Provide AI-readable, developer-actionable tickets organized into milestones. Each ticket includes full context, file references, acceptance criteria, implementation approach options, and dependency links so that an AI coding agent or developer can pick up any ticket with zero ambiguity and produce correct code without breaking existing systems.

## Authority and Reference Documents

Before working on ANY ticket, the implementer (human or AI) MUST read and internalize:

1. `docs/01-current-state-architecture.md` — what exists today, contracts, subsystem map
2. `docs/02-vision-and-guardrails.md` — non-negotiable rules, anti-patterns, decision log format
3. `docs/03-gap-analysis-and-target-architecture.md` — gap inventory (G-001 through G-008)
4. `docs/04-migration-plan-and-rollout.md` — phase/ring/gate model, rollback rules
5. `docs/07-rfc-roadmap-and-implementation-packages.md` — package roadmap (PKG-00 through PKG-H2)
6. `docs/11-implementation-integration-specification.md` — concrete types, module placement, runtime state ownership (Section 4.3), hook sites (Section 6.4), persistence contract (Section 8.2), multi-mode permission design (Section 10.3), feature flags (Section 7)

**Critical implementation rules** (from doc 02):

- No silent breaking changes to: command contract, tool permission semantics, query/headless stream, MCP transport, transcript compatibility, remote/bridge control envelopes
- Every new module uses `feature()` build-time + GrowthBook runtime flag (doc 11, Section 7)
- Every new hook event requires 5-site update (doc 11, Section 6.4)
- Every new transcript entry requires 3-site update (doc 11, Section 8.2) — every type in the `Entry` union MUST have a corresponding `loadTranscriptFile` else-if branch or data is silently lost
- New runtime state lives on `AppState` outside `DeepImmutable` (doc 11, Section 4.3)
- Risk approval must work in REPL, SDK/headless, and remote modes (doc 11, Section 10.3)

**Governance prerequisite** (from doc 02, Section 13.1):

All feature RFCs (`RFC-Mission-Engine.md`, `RFC-Risk-Policy-Engine.md`, `RFC-Verification-First.md`, `RFC-Cost-Intelligent-Planner.md`, `RFC-Memory-2.0.md`, `RFC-MultiAgent-Contracts.md`) currently have `Status: Proposed`. Per doc 02 Section 13.1, decisions carrying `Status: approved` (self-approved) must be independently reviewed before gating production implementation. The governance flow is:

1. **Milestone 0 (PKG-00)**: Can proceed immediately — contract freeze and baseline work does not depend on RFC approval.
2. **Milestone 1 entry (PKG-A1, PKG-C1)**: Requires the relevant RFCs to move from `Proposed` → `Approved` with independent reviewer sign-off during or at the end of Phase 0. Decision records must be updated to `reviewed-approved` status.
3. **Milestone 1 broad integration (PKG-A2)**: Requires Phase 0 exit gate passed AND RFC approvals for Mission Engine and Risk Policy Engine.

This governance gate is a process step, not a documentation gap — the RFCs are architecturally complete and implementation-ready. The approval step validates that a second set of eyes has confirmed the design before code lands.

---

## Milestone 0: Contract Freeze and Baseline Harness

**Package**: PKG-00  
**Phase**: 0  
**Dependencies**: None  
**Gaps addressed**: G-008 (cross-mode parity)  
**Goal**: Lock all compatibility-critical interfaces, build a regression test harness, and establish measurements before any feature code lands.

---

### Ticket M0-001: Create Contract Freeze Document

**Priority**: P0 — blocks all other work  
**Estimated effort**: Small (documentation)

**Context**: Before any enhancement code is written, we must snapshot the exact public contracts that must not break. Doc 07 (Section 4.1) lists the integration anchors. This ticket creates the actual `artifacts/phase-0/contract-freeze-list.md`.

**Files to read before starting**:
- `types/command.ts` — Command type shape
- `Tool.ts` lines 1-250 — `Tool` type, `ToolUseContext`, `ToolUseBlock`
- `query.ts` lines 1-100 — `QueryParams` type, exported `query` generator signature
- `QueryEngine.ts` lines 130-200 — `QueryEngineConfig` type
- `state/AppStateStore.ts` lines 89-170 — `AppState` type
- `entrypoints/sdk/coreTypes.ts` lines 1-60 — SDK exported types, `HOOK_EVENTS`, `EXIT_REASONS`
- `entrypoints/sdk/coreSchemas.ts` lines 1-50 — schema exports list
- `cli/structuredIO.ts` lines 1-50 — `StructuredIO` class interface
- `cli/transports/SSETransport.ts` lines 1-50 — transport interface
- `remote/RemoteSessionManager.ts` lines 1-50 — public methods
- `utils/sessionStorage.ts` lines 139-160 — `isTranscriptMessage`, `isChainParticipant`
- `types/logs.ts` lines 297-318 — `Entry` union
- `components/permissions/PermissionRequest.tsx` lines 47-82 — `permissionComponentForTool`
- `services/mcp/types.ts` — MCP type exports

**What to produce**:

Create `artifacts/phase-0/contract-freeze-list.md` with:
1. A table listing every frozen contract (type name, file path, line range, hash of the type definition)
2. For each contract: what constitutes a "breaking change" vs "additive extension"
3. A list of allowed additive-only extensions (e.g., adding optional fields to `AppState`, adding values to `HOOK_EVENTS`, adding entry types to `Entry` union)
4. A list of forbidden changes (e.g., removing fields, changing required fields to optional, modifying `isTranscriptMessage` filtering, changing `permissionComponentForTool` dispatch logic)

**Acceptance criteria**:
- [ ] Every file in doc 07 Section 4.1's integration anchors list is covered
- [ ] Each contract entry has a concrete line-range reference that can be machine-verified
- [ ] Additive-only rules are explicit enough that a reviewer can reject a PR by comparing against this list
- [ ] Document exists at `artifacts/phase-0/contract-freeze-list.md`

**Approaches**:
- **Approach A (recommended)**: Write the contract freeze document by reading each file and extracting the public type signatures. Use TypeScript `type` exports as the contract boundary. This is manual but precise.
- **Approach B**: Write a script that extracts exported types from each frozen file and generates a machine-readable contract snapshot (JSON). More rigorous but higher setup cost. Could be done after Approach A as a hardening step.

---

### Ticket M0-002: Build Mode Regression Baseline Test Matrix

**Priority**: P0 — blocks all other work  
**Estimated effort**: Medium

**Context**: The codebase supports 4 runtime modes: interactive REPL, headless/SDK (`cli/print.ts`), remote/CCR (`remote/RemoteSessionManager.ts`), and bridge (`bridge/bridgeMain.ts`). Each mode has different permission, streaming, and control flows. We need a regression matrix that exercises core paths in each mode BEFORE any A-F code lands.

**Files to read before starting**:
- `entrypoints/cli.tsx` — mode dispatch logic
- `cli/print.ts` — headless execution path
- `screens/REPL.tsx` lines 1-100 — REPL initialization
- `remote/RemoteSessionManager.ts` — remote control flow
- `bridge/bridgeMain.ts` — bridge mode flow
- `services/tools/toolExecution.ts` — tool execution and permission path
- `services/tools/toolOrchestration.ts` — concurrent/serial tool batching

**What to produce**:

Create `artifacts/phase-0/mode-regression-baseline-matrix.md` with:
1. A matrix of (mode × operation × expected behavior) covering:
   - Tool execution with permission prompt
   - Tool execution with auto-approve
   - Tool execution denied by hook
   - Compaction trigger and recovery
   - Session resume from transcript
   - Abort/interrupt handling
   - MCP tool execution
2. For each cell: specific command or API call to reproduce
3. Baseline measurements: timing, token count, transcript entry count

**Acceptance criteria**:
- [ ] All 4 modes covered (REPL, headless, remote, bridge)
- [ ] At least 7 operations per mode
- [ ] Each test case has a reproducible command/invocation
- [ ] Matrix exists at `artifacts/phase-0/mode-regression-baseline-matrix.md`

**Approaches**:
- **Approach A (recommended)**: Manual test case documentation with shell commands for headless mode and step-by-step instructions for interactive modes. Fast to produce, sufficient for Phase 0.
- **Approach B**: Write automated test scripts that exercise each mode programmatically. More rigorous but significant setup cost.

---

### Ticket M0-003: Create Baseline Measurement Plan

**Priority**: P0  
**Estimated effort**: Small

**What to produce**: `artifacts/phase-0/baseline-measurement-plan.md` documenting pre-enhancement measurements:
- Average transcript size per session (in KB/MB)
- System prompt token count by mode
- Permission prompt latency (p50, p95)
- Compaction trigger frequency and token reclaim rate
- Hook execution overhead per tool call

**Acceptance criteria**:
- [ ] Each metric has a collection method (manual sampling, telemetry query, or script)
- [ ] Baseline values are recorded before any enhancement code lands
- [ ] Document exists at `artifacts/phase-0/baseline-measurement-plan.md`

---

### Ticket M0-004: Phase-0 Go/No-Go Checklist

**Priority**: P0  
**Estimated effort**: Small

**What to produce**: `artifacts/phase-0/go-no-go-checklist-v1.md` with pass/fail criteria for Phase 0 exit:
1. Contract freeze document reviewed and complete
2. Mode regression baseline captured
3. Measurement plan executed with baseline numbers recorded
4. No open blockers on frozen contracts

**Acceptance criteria**:
- [ ] Checklist is binary pass/fail for each item
- [ ] Links to M0-001, M0-002, M0-003 artifacts
- [ ] Phase 1 cannot begin until all items pass

---

## Milestone 1: Foundation — Mission Schema, Risk Evaluator, and Runtime Integration

**Packages**: PKG-A1, PKG-C1, PKG-A2  
**Phase**: 1  
**Dependencies**: Milestone 0 complete  
**Gaps addressed**: G-001 (mission lifecycle), G-003 (risk centralization), G-007 (invariant enforcement)  
**Goal**: Establish the mission state machine, risk policy evaluator, and integrate both into the runtime without breaking existing execution paths.

---

### Ticket M1-001: Create `types/mission.ts` — Mission Type Definitions

**Priority**: P0  
**Estimated effort**: Small  
**Package**: PKG-A1

**Context**: Define the core TypeScript types for the Mission Engine. All types are specified in doc 11, Section 3.1.

**Files to read before starting**:
- `docs/11-implementation-integration-specification.md` Section 3.1 — complete type definitions
- `types/ids.ts` or equivalent — existing branded ID patterns (e.g., `SessionId`)
- `types/hooks.ts` — pattern for type definition files
- `types/logs.ts` — pattern for discriminated unions

**What to produce**:

Create `types/mission.ts` containing:
- `MissionId` branded type
- `MissionStepId` branded type
- `MISSION_STATES` const array and `MissionState` type
- `MissionBudgetPolicy` type
- `MissionRollbackStrategy` type
- `MissionSuccessCriterion` type
- `MissionStep` type
- `Mission` type
- `MissionTransitionEvent` type

**Acceptance criteria**:
- [ ] All types exactly match doc 11 Section 3.1 definitions
- [ ] Branded types use the `string & { readonly __brand: 'X' }` pattern from the codebase
- [ ] No runtime dependencies — pure type definitions only
- [ ] File exports all types
- [ ] TypeScript compiles with zero errors (`tsc --noEmit`)

**Approaches**:
- **Approach A (recommended)**: Direct transcription from doc 11 Section 3.1. These types are already fully specified.
- No alternative needed — the types are concrete and unambiguous.

---

### Ticket M1-002: Create `types/riskPolicy.ts` — Risk Policy Type Definitions

**Priority**: P0  
**Estimated effort**: Small  
**Package**: PKG-C1

**Context**: Define the core TypeScript types for the Risk Policy Engine. All types are specified in doc 11, Section 3.3.

**Files to read before starting**:
- `docs/11-implementation-integration-specification.md` Section 3.3 — complete type definitions
- `types/mission.ts` (from M1-001) — `MissionId` dependency

**What to produce**:

Create `types/riskPolicy.ts` containing:
- `RiskClass` type (`'R1' | 'R2' | 'R3'`)
- `RiskFactor` type
- `RiskDecisionMode` type
- `RiskDecision` type
- `RiskPolicy` type
- `RiskAuditRecord` type

**Acceptance criteria**:
- [ ] All types match doc 11 Section 3.3
- [ ] `RiskDecision` references `MissionId` optionally
- [ ] TypeScript compiles with zero errors

---

### Ticket M1-003: Create `types/verification.ts` — Verification Type Definitions

**Priority**: P0  
**Estimated effort**: Small  
**Package**: PKG-A1

**Context**: Define verification types. Specified in doc 11, Section 3.2.

**Files to read before starting**:
- `docs/11-implementation-integration-specification.md` Section 3.2

**What to produce**: Create `types/verification.ts` with all types from Section 3.2: `VerificationCheckId`, `VerificationBundleId`, `VerificationCheck`, `VerificationBundle`, `VerificationResult`, `VerificationSummary`, `ConfidenceSummary`, `ProofArtifact`.

**Acceptance criteria**:
- [ ] All types match doc 11 Section 3.2
- [ ] TypeScript compiles with zero errors

---

### Ticket M1-004: Create `types/costPlanner.ts` — Cost Planner Type Definitions

**Priority**: P1  
**Estimated effort**: Small  
**Package**: PKG-A1

**Files to read**: doc 11 Section 3.4

**What to produce**: Create `types/costPlanner.ts` with: `CostBand`, `PreflightPlan`, `StepCostEstimate`, `AdaptationEvent`.

**Acceptance criteria**:
- [ ] All types match doc 11 Section 3.4
- [ ] TypeScript compiles with zero errors

---

### Ticket M1-005: Create `types/memoryGraph.ts` — Memory Graph Type Definitions

**Priority**: P1  
**Estimated effort**: Small  
**Package**: PKG-A1

**Files to read**: doc 11 Section 3.5

**What to produce**: Create `types/memoryGraph.ts` with: `MemoryNodeId`, `MemoryEdgeId`, `MemoryNodeType`, `MemoryNode`, `MemoryEdge`, `MemoryGraph`, `FreshnessPolicy`, `FreshnessEvaluation`.

**Acceptance criteria**:
- [ ] All types match doc 11 Section 3.5
- [ ] TypeScript compiles with zero errors

---

### Ticket M1-006: Create `types/agentGovernance.ts` — Agent Governance Type Definitions

**Priority**: P1  
**Estimated effort**: Small  
**Package**: PKG-A1

**Files to read**: doc 11 Section 3.6

**What to produce**: Create `types/agentGovernance.ts` with: `SubagentContractId`, `SubagentContract`, `ContractValidationResult`, `ArbitrationDecision`, `MergeDecision`.

**Acceptance criteria**:
- [ ] All types match doc 11 Section 3.6
- [ ] TypeScript compiles with zero errors

---

### Ticket M1-007: Create Feature Flag Gates for A-F

**Priority**: P0  
**Estimated effort**: Small  
**Package**: PKG-A1, PKG-C1

**Context**: Each enhancement needs a build-time + runtime feature flag gate. Doc 11 Section 7 specifies the exact pattern and file locations.

**Files to read before starting**:
- `docs/11-implementation-integration-specification.md` Section 7 — flag assignments table and pattern
- `bridge/bridgeEnabled.ts` — canonical example of the combined flag pattern
- `voice/voiceModeEnabled.ts` — second canonical example
- `services/analytics/growthbook.ts` — `getFeatureValue_CACHED_MAY_BE_STALE` import path

**What to produce**:

Create 6 files:

1. `services/mission/missionEnabled.ts`
2. `services/verification/verificationEnabled.ts`
3. `services/riskPolicy/riskPolicyEnabled.ts`
4. `services/costPlanner/costPlannerEnabled.ts`
5. `services/memoryGraph/memoryGraphEnabled.ts`
6. `services/agentGovernance/agentGovernanceEnabled.ts`

Each follows the exact pattern from doc 11 Section 7.3:

```typescript
import { feature } from 'bun:bundle'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../../services/analytics/growthbook.js'

export function isMissionEngineEnabled(): boolean {
  return feature('MISSION_ENGINE')
    ? getFeatureValue_CACHED_MAY_BE_STALE('tengu_mission_engine', false)
    : false
}
```

**Acceptance criteria**:
- [ ] All 6 files follow the identical pattern with correct flag names from doc 11 Section 7.2 table
- [ ] Import paths resolve correctly relative to `services/<feature>/` directory
- [ ] `feature()` macro name matches the `Build-time Flag` column; GrowthBook key matches the `GrowthBook Key` column
- [ ] Default return is `false` (enhancement disabled until explicitly enabled)
- [ ] TypeScript compiles with zero errors

---

### Ticket M1-008: Create Mission Service Module — State Machine and Lifecycle

**Priority**: P0  
**Estimated effort**: Large  
**Package**: PKG-A1

**Context**: The Mission Engine is the foundational service. It manages mission creation, state transitions, step tracking, and rollback. It does NOT integrate with the runtime yet (that's M1-012). This ticket builds the standalone service logic.

**Files to read before starting**:
- `docs/11-implementation-integration-specification.md` Sections 3.1, 4.1, 5.2, 12.1-12.7 — types, module placement, compaction, cross-dependencies
- `types/mission.ts` (from M1-001) — Mission types
- `services/mission/missionEnabled.ts` (from M1-007) — feature gate
- `utils/task/framework.ts` — existing task framework patterns (for lifecycle pattern reference)
- `utils/uuid.ts` or equivalent — UUID generation pattern

**What to produce**:

Create the following files under `services/mission/`:

1. `services/mission/index.ts` — `MissionService` class with:
   - `createMission(objective, constraints, budgetPolicy, rollbackStrategy, successCriteria) → Mission`
   - `transitionState(missionId, targetState, reason?) → MissionTransitionEvent`
   - `addStep(missionId, step) → MissionStep`
   - `updateStepStatus(missionId, stepId, status, actualOutcome?) → void`
   - `getActiveMission() → Mission | undefined`
   - `abortMission(missionId, reason) → MissionTransitionEvent`
   - `createCheckpoint(missionId) → void`
   - `rollback(missionId) → void`

2. `services/mission/stateMachine.ts` — pure state transition logic:
   - `VALID_TRANSITIONS: Record<MissionState, MissionState[]>` — allowed transitions
   - `validateTransition(from, to) → boolean`
   - No side effects — pure validation logic

3. `services/mission/types.ts` — service-internal types (e.g., `MissionServiceConfig`)

4. `services/mission/missionContext.ts` — context builders:
   - `createMissionAttachmentIfNeeded(activeMission, toolUseContext) → Message | undefined`
   - `getMissionContextForSystemPrompt(activeMission) → string`

**Valid state transitions** (from doc 11 Section 3.1):
```
created → planned
planned → executing
executing → verifying
executing → aborted
executing → failed
verifying → completed
verifying → failed
verifying → executing  (retry after failed verification)
failed → rolled_back
aborted → rolled_back
```

**Acceptance criteria**:
- [ ] `MissionService.createMission` generates branded `MissionId` and sets state to `'created'`
- [ ] `transitionState` validates against `VALID_TRANSITIONS` and throws on invalid transitions
- [ ] `transitionState` emits a `MissionTransitionEvent` with correlationId
- [ ] `getActiveMission` returns `undefined` when no mission is active
- [ ] All methods are gated by `isMissionEngineEnabled()` — if disabled, methods either no-op or throw
- [ ] `createMissionAttachmentIfNeeded` produces a system message matching the post-compact attachment pattern (study `compactConversation` in `services/compact/compact.ts` for the attachment format)
- [ ] `getMissionContextForSystemPrompt` produces a string containing: mission objective, current state, step count, active constraints
- [ ] No direct dependencies on query loop, tools, or UI — this is a standalone service
- [ ] TypeScript compiles with zero errors

**Approaches**:
- **Approach A (recommended)**: Implement `MissionService` as a stateless function library operating on `Mission` objects stored in `AppState`. Transitions mutate via `setAppState`. This aligns with the codebase's preference for functional operations over long-lived object instances.
- **Approach B**: Implement as a class with internal state. Simpler to reason about but creates another stateful singleton that needs cleanup and testing infrastructure.

---

### Ticket M1-009: Create Risk Policy Service Module — Evaluator and Decision Engine

**Priority**: P0  
**Estimated effort**: Large  
**Package**: PKG-C1

**Context**: The Unified Risk Policy Engine centralizes risk classification and approval decisions. It replaces ad-hoc permission logic with a systematic risk scoring model. It does NOT modify the permission UI (that's M2-005). This ticket builds the core evaluation logic.

**Files to read before starting**:
- `docs/11-implementation-integration-specification.md` Sections 3.3, 4.1, 6.3, 10.3, 12.2, 12.4 — types, hook integration, multi-mode permissions, cross-deps
- `types/riskPolicy.ts` (from M1-002) — Risk types
- `services/riskPolicy/riskPolicyEnabled.ts` (from M1-007) — feature gate
- `services/policyLimits/index.ts` — existing policy limits (understand current approach)
- `services/tools/toolExecution.ts` — understand where risk evaluation will be called (M1-012)
- `hooks/toolPermission/PermissionContext.ts` — current permission context

**What to produce**:

Create the following files under `services/riskPolicy/`:

1. `services/riskPolicy/index.ts` — `RiskEvaluator` with:
   - `evaluateToolAction(toolName, toolInput, context) → RiskDecision`
   - `evaluateMissionStep(step, mission) → RiskDecision`
   - `getSessionAuditLog() → RiskAuditRecord[]`

2. `services/riskPolicy/riskScorer.ts` — pure scoring logic:
   - `scoreToolRisk(toolName, toolInput) → RiskFactor[]`
   - `classifyRisk(factors) → RiskClass`
   - `determineDecisionMode(riskClass, permissionContext) → RiskDecisionMode`

3. `services/riskPolicy/types.ts` — service-internal types

4. `services/riskPolicy/defaultPolicy.ts` — default risk policy rules:
   - Default `dataSensitivity`, `blastRadius`, `reversibility` scores per tool category
   - MCP tools get higher default scores (doc 11 Section 11.3)
   - Shell/Bash tools with `rm`, `sudo`, pipe to external commands get elevated scores

**Risk scoring factors** (from doc 11 Section 3.3):
- `dataSensitivity`: how sensitive is the data being accessed (0-1 scale)
- `blastRadius`: how many files/systems could be affected (0-1 scale)
- `reversibility`: how easily can the action be undone (0-1 scale, higher = more reversible)
- `precedentCount`: how many times has this exact action been approved before in this session

**Decision mode mapping**:
- R1 (`riskClass` sum < 0.3): `auto` — proceed without prompting
- R2 (sum 0.3-0.7): `scoped_ask` — prompt with recommended approval
- R3 (sum > 0.7): `explicit_ask` — prompt with detailed risk explanation, no default approval

**Acceptance criteria**:
- [ ] `evaluateToolAction` returns a complete `RiskDecision` with all factors scored
- [ ] Risk classification boundaries are configurable (not hardcoded threshold magic numbers — use a `RiskPolicy` configuration type)
- [ ] MCP tools receive elevated default scores per doc 11 Section 11.3
- [ ] `RiskAuditRecord` is created for every evaluation (audit trail)
- [ ] Risk evaluator cannot weaken a hook-based denial (doc 11 Section 6.3 — "hooks deny => denied regardless of risk engine")
- [ ] All scoring functions are pure (no side effects, deterministic for same inputs)
- [ ] Gated by `isRiskPolicyEnabled()`
- [ ] TypeScript compiles with zero errors

**Approaches**:
- **Approach A (recommended)**: Rule-based scoring with configurable weights. Each tool category has a default score profile. Scores are additive. Simple, predictable, and debuggable.
- **Approach B**: Machine-learning-based scoring using historical permission decisions. More sophisticated but requires training data we don't have yet. Not appropriate for Phase 1.

---

### Ticket M1-010: Add Enhancement State to `AppState`

**Priority**: P0  
**Estimated effort**: Small  
**Package**: PKG-A2

**Context**: This is the critical runtime state ownership change identified in doc 11 Section 4.3. Active mission, risk policy, verification, and cost planner state must be accessible from `AppState` so that `ToolUseContext.getAppState()`, `QueryEngineConfig.getAppState()`, system prompt assembly, and compaction can all access it.

**Files to modify**:
- `state/AppStateStore.ts` — add new fields to `AppState` type and `getDefaultAppState()`

**Files to read before starting**:
- `docs/11-implementation-integration-specification.md` Section 4.3 — exact field specifications
- `state/AppStateStore.ts` lines 89-170 — existing `AppState` structure
- `state/AppStateStore.ts` — `getDefaultAppState()` function
- `types/mission.ts` (from M1-001)
- `types/riskPolicy.ts` (from M1-002)
- `types/verification.ts` (from M1-003)
- `types/costPlanner.ts` (from M1-004)

**What to change**:

Add to `AppState` AFTER the existing `tasks` field (outside `DeepImmutable<{}>`, following the same pattern as `tasks`):

```typescript
activeMission?: Mission
riskPolicyState?: {
  activePolicyRef: string
  sessionDecisionLog: RiskDecision[]
}
verificationState?: {
  activeBundle?: VerificationBundle
  lastResult?: VerificationResult
}
costPlannerState?: {
  currentBand: 'cheap' | 'balanced' | 'thorough'
  sessionBudgetUsed: number
  sessionBudgetLimit?: number
}
```

Update `getDefaultAppState()` to initialize these as `undefined`.

**Acceptance criteria**:
- [ ] New fields are outside `DeepImmutable<{}>` (same as `tasks`)
- [ ] `getDefaultAppState()` returns `undefined` for all new fields (no mission active by default)
- [ ] Existing tests pass unchanged (new fields are optional/undefined)
- [ ] No imports are added for types that might not exist yet under a build-time feature flag — use conditional `import type` or type-only imports
- [ ] TypeScript compiles with zero errors

**CRITICAL CONSTRAINT**: This change MUST NOT modify any existing field or change any existing default value. It is purely additive.

---

### Ticket M1-011: Extend Transcript Persistence — New Entry Types

**Priority**: P0  
**Estimated effort**: Medium  
**Package**: PKG-A2

**Context**: New mission/verification/risk state changes must persist to the JSONL transcript. This requires the 3-site update documented in doc 11 Section 8.2.

**Files to modify**:
1. `types/logs.ts` — add new entry types to `Entry` union
2. `utils/sessionStorage.ts` — add else-if branches in `loadTranscriptFile` (line ~3625) and extend return value

**Files to read before starting**:
- `docs/11-implementation-integration-specification.md` Section 8.2 (3-site contract) and Section 8.3 (new entry types)
- `types/logs.ts` lines 297-318 — current `Entry` union
- `utils/sessionStorage.ts` lines 3625-3698 — current `loadTranscriptFile` else-if chain
- `utils/sessionStorage.ts` lines 139-156 — `isTranscriptMessage` and `isChainParticipant` (DO NOT MODIFY)

**What to change in `types/logs.ts`**:

Add the 4 new entry types from doc 11 Section 8.3:
- `MissionStateEntry` (type: `'mission_state'`)
- `MissionEvidenceEntry` (type: `'mission_evidence'`)
- `VerificationResultEntry` (type: `'verification_result'`)
- `RiskDecisionEntry` (type: `'risk_decision'`)

Add these to the `Entry` union.

**What to change in `utils/sessionStorage.ts`**:

1. In `loadTranscriptFile`, add collection variables near the top:
```typescript
const missionStates = new Map<string, MissionStateEntry>()
const missionEvidence: MissionEvidenceEntry[] = []
const verificationResults: VerificationResultEntry[] = []
const riskDecisions: RiskDecisionEntry[] = []
```

2. Add else-if branches in the entry processing loop (after the existing `marble-origami-snapshot` branch) for ALL 4 new entry types:
```typescript
} else if (entry.type === 'mission_state') {
  missionStates.set(entry.missionId, entry)
} else if (entry.type === 'mission_evidence') {
  missionEvidence.push(entry)
} else if (entry.type === 'verification_result') {
  verificationResults.push(entry)
} else if (entry.type === 'risk_decision') {
  riskDecisions.push(entry)
}
```

IMPORTANT: All 4 types listed in the `Entry` union update (mission_state, mission_evidence, verification_result, risk_decision) MUST have corresponding else-if branches. Missing any one will cause that entry type to be silently dropped during transcript loading — see doc 11 Section 8.2 "3-site persistence contract".

3. Extend the return value of `loadTranscriptFile` to include the new collections.

**Acceptance criteria**:
- [ ] New entry types added to `Entry` union in `types/logs.ts`
- [ ] `loadTranscriptFile` processes new entry types (not silently ignored)
- [ ] `isTranscriptMessage` is NOT modified (new entries are metadata, not conversation messages)
- [ ] `isChainParticipant` is NOT modified
- [ ] Old transcripts without new entry types load correctly (empty collections)
- [ ] New entries are appendable via existing `appendEntry` method
- [ ] TypeScript compiles with zero errors

---

### Ticket M1-012: Mission Runtime Integration — Query Loop and Tool Execution

**Priority**: P0  
**Estimated effort**: Large  
**Package**: PKG-A2

**Context**: This is the core integration that threads mission lifecycle into the existing query loop and tool execution path. It is the most architecturally sensitive ticket in Milestone 1.

**Files to modify (with extreme care)**:
- `query.ts` — inject mission context into system prompt assembly
- `services/tools/toolExecution.ts` — inject risk evaluation before permission check

**Files to read before starting**:
- `docs/11-implementation-integration-specification.md` Sections 4.3.4, 5.2, 5.3, 6.3, 9.1, 12.2
- `query.ts` — full file understanding required; focus on `getSystemPrompt` call site and `queryLoop`
- `services/tools/toolExecution.ts` — full file understanding required; focus on `executeTool` and pre-tool-hooks
- `services/compact/compact.ts` — `buildPostCompactMessages` function (for mission attachment insertion)
- `services/mission/index.ts` (from M1-008) — `MissionService` API
- `services/mission/missionContext.ts` (from M1-008) — `getMissionContextForSystemPrompt`, `createMissionAttachmentIfNeeded`
- `services/riskPolicy/index.ts` (from M1-009) — `RiskEvaluator.evaluateToolAction`

**What to change in `query.ts`**:

In the system prompt construction path (where `getSystemPrompt(...)` is called):

```typescript
if (isMissionEngineEnabled()) {
  const activeMission = toolUseContext.getAppState().activeMission
  if (activeMission) {
    const missionContext = getMissionContextForSystemPrompt(activeMission)
    // Append to system prompt segments
  }
}
```

This MUST be feature-gated so that when `MISSION_ENGINE` feature flag is off, the system prompt is completely unchanged.

**What to change in `services/tools/toolExecution.ts`**:

After pre-tool hooks run and before the permission check:

```typescript
if (isRiskPolicyEnabled()) {
  const riskDecision = riskEvaluator.evaluateToolAction(
    tool.name,
    toolInput,
    { mission: appState.activeMission, permissionContext }
  )
  // Risk engine cannot weaken a hook denial
  if (hookResult.behavior === 'deny') {
    // Skip risk evaluation outcome — hook denial wins
  } else {
    // Translate riskDecision.decisionMode to permission behavior
  }
}
```

**What to change in `services/compact/compact.ts`**:

In `buildPostCompactMessages`, after existing post-compact attachments:

```typescript
if (isMissionEngineEnabled()) {
  const missionAttachment = createMissionAttachmentIfNeeded(
    toolUseContext.getAppState().activeMission,
    toolUseContext
  )
  if (missionAttachment) {
    postCompactMessages.push(missionAttachment)
  }
}
```

**Acceptance criteria**:
- [ ] With `MISSION_ENGINE` disabled: query loop, tool execution, and compaction behave IDENTICALLY to pre-change behavior (zero behavioral diff)
- [ ] With `MISSION_ENGINE` enabled but no active mission: behavior is identical (no system prompt additions, no risk evaluation)
- [ ] With `MISSION_ENGINE` enabled and active mission: system prompt includes mission context, risk evaluation runs before permission check
- [ ] Risk engine does NOT weaken hook-based denials (doc 11 Section 6.3)
- [ ] Compaction preserves active mission context via post-compact attachment
- [ ] All existing tests pass unchanged
- [ ] No new imports in `query.ts` or `toolExecution.ts` when `MISSION_ENGINE` feature is off (use conditional dynamic `import()` or `require()` gated by `feature()`)

**CRITICAL CONSTRAINTS**:
- Do NOT add `mission` to `ToolUseContext` type — access via `getAppState().activeMission` (doc 11 Section 4.3.2)
- Do NOT modify `QueryEngineConfig` type — access via `getAppState()` (doc 11 Section 4.3.3)
- Do NOT modify `buildSystemPromptBlocks` in `services/api/claude.ts` — inject at the `getSystemPrompt` call site (doc 11 Section 4.3.4)

**Approaches**:
- **Approach A (recommended)**: Minimal insertion points — one call site in `query.ts` for system prompt, one call site in `toolExecution.ts` for risk evaluation, one call site in `compact.ts` for mission attachment. Each insertion is a self-contained `if (isEnabled()) { ... }` block. Maximum isolation from existing code.
- **Approach B**: Create a middleware/interceptor pattern that wraps the tool execution pipeline. Cleaner separation but higher structural change risk — too much for Phase 1.

---

### Ticket M1-013: Extend Hook Events — 5-Site Update

**Priority**: P0  
**Estimated effort**: Medium  
**Package**: PKG-A2

**Context**: Add 10 new hook events for A-F enhancements. Doc 11 Section 6.4 documents exactly which 5 files must be updated atomically.

**Files to modify (ALL must be updated together)**:

1. `entrypoints/sdk/coreTypes.ts` — add to `HOOK_EVENTS` array
2. `entrypoints/sdk/coreSchemas.ts` — add to `HOOK_EVENTS` array AND add input schemas to `HookInputSchema` union
3. `types/hooks.ts` — add hook input types (if needed for type narrowing)
4. `utils/plugins/loadPluginHooks.ts` — add to `convertPluginHooksToMatchers` record literal

**Files to read before starting**:
- `docs/11-implementation-integration-specification.md` Section 6.2 (new events list), Section 6.4 (all 5 sites), Section 6.5 (hook input types)
- `entrypoints/sdk/coreTypes.ts` lines 25-53 — current `HOOK_EVENTS`
- `entrypoints/sdk/coreSchemas.ts` lines 355-383 — second `HOOK_EVENTS` copy
- `entrypoints/sdk/coreSchemas.ts` lines 767-797 — `HookInputSchema` union
- `utils/plugins/loadPluginHooks.ts` lines 31-59 — record literal

**New events to add** (from doc 11 Section 6.2):
```
MissionCreated, MissionStateChanged, MissionCompleted, MissionAborted,
VerificationStarted, VerificationCompleted,
RiskPolicyEvaluated, RiskApprovalRequired,
ContractValidated, ArbitrationTriggered
```

**For each new event, in `coreSchemas.ts`**, create a corresponding hook input schema:
```typescript
export const MissionCreatedHookInputSchema = lazySchema(() =>
  BaseHookInputSchema().and(
    z.object({
      hook_event_name: z.literal('MissionCreated'),
      mission_id: z.string(),
      objective: z.string(),
      state: z.string(),
    }),
  ),
)
```

**Acceptance criteria**:
- [ ] All 5 sites updated
- [ ] `HOOK_EVENTS` arrays in both `coreTypes.ts` and `coreSchemas.ts` are identical
- [ ] Every new event has a corresponding `*HookInputSchema` in `coreSchemas.ts`
- [ ] Every new event is a key in `convertPluginHooksToMatchers` record
- [ ] `HookInputSchema` union includes all new input schemas
- [ ] Existing hook tests pass unchanged
- [ ] TypeScript compiles with zero errors

---

### Ticket M1-014: Phase 1 Compatibility Regression Verification

**Priority**: P0  
**Estimated effort**: Medium  
**Package**: PKG-A2

**What to produce**:
- Run the full mode regression baseline (from M0-002) with all Milestone 1 code landed
- Produce `artifacts/phase-1/compatibility-regression-report.md`
- Produce `artifacts/phase-1/phase-exit-gate-package.md`

**Acceptance criteria**:
- [ ] All baseline mode regression tests pass with enhancement flags OFF
- [ ] All baseline mode regression tests pass with enhancement flags ON but no active mission
- [ ] At least one end-to-end test with an active mission in each mode
- [ ] No regression in transcript size, system prompt token count, or permission prompt latency beyond ±10%
- [ ] Phase exit package documents all deviations (if any)

---

## Milestone 2: Assurance — Verification Engine and Confidence Envelope

**Packages**: PKG-B1, PKG-B2  
**Phase**: 2  
**Dependencies**: Milestone 1 complete  
**Gaps addressed**: G-002 (completion confidence)  
**Goal**: Implement verification checks, proof artifacts, and confidence scoring that gate mission completion.

---

### Ticket M2-001: Create Verification Service Module

**Priority**: P1  
**Estimated effort**: Large  
**Package**: PKG-B1

**Context**: The Verification Engine runs checks (test, lint, typecheck, semantic, custom) against mission success criteria and produces structured results.

**Files to read before starting**:
- `docs/11-implementation-integration-specification.md` Sections 3.2, 12.1, 12.3
- `types/verification.ts` (from M1-003) — verification types
- `services/verification/verificationEnabled.ts` (from M1-007) — feature gate
- `services/mission/index.ts` (from M1-008) — mission state machine (verification triggers state transitions)

**What to produce**:

Create `services/verification/`:

1. `services/verification/index.ts` — `VerificationEngine`:
   - `runChecks(criteria: MissionSuccessCriterion[], cwd: string) → VerificationResult`
   - `createBundle(criteria) → VerificationBundle`
   - `executeCheck(check: VerificationCheck) → VerificationCheck` (with updated status)

2. `services/verification/checkRunners.ts` — individual check type runners:
   - `runTestCheck(command: string, cwd: string) → CheckOutput`
   - `runLintCheck(cwd: string) → CheckOutput`
   - `runTypecheckCheck(cwd: string) → CheckOutput`
   - `runCustomCheck(command: string, cwd: string) → CheckOutput`

3. `services/verification/confidenceScorer.ts`:
   - `calculateConfidence(result: VerificationResult) → ConfidenceSummary`
   - Confidence formula: `passedChecks / totalChecks` weighted by check type importance, with uncertainty adjustments for waived/skipped checks

4. `services/verification/proofBuilder.ts`:
   - `buildProofArtifact(result: VerificationResult, missionId: MissionId) → ProofArtifact`

**Acceptance criteria**:
- [ ] `runChecks` executes each check type using the appropriate runner
- [ ] Check runners use existing shell execution patterns (study `tools/BashTool/` for subprocess execution)
- [ ] Failed checks produce structured error output, not just a boolean
- [ ] `calculateConfidence` never returns confidence > 0.95 if any check was waived
- [ ] `buildProofArtifact` includes all check outputs and timing data
- [ ] Gated by `isVerificationEnabled()`
- [ ] TypeScript compiles with zero errors

**Approaches**:
- **Approach A (recommended)**: Sequential check execution with structured output capture. Simple and predictable.
- **Approach B**: Parallel check execution for speed. Better performance but harder to debug failures and harder to attribute resource usage per check.

---

### Ticket M2-002: Integrate Verification into Mission State Machine

**Priority**: P1  
**Estimated effort**: Medium  
**Package**: PKG-B1

**Files to modify**:
- `services/mission/stateMachine.ts` (from M1-008) — add verification trigger on `executing → verifying` transition
- `services/mission/index.ts` (from M1-008) — call verification engine when entering `verifying` state

**Acceptance criteria**:
- [ ] Transitioning mission to `verifying` automatically triggers `VerificationEngine.runChecks`
- [ ] Mission cannot reach `completed` without verification pass or explicit waiver
- [ ] Failed verification transitions mission back to `executing` (retry) or `failed` based on retry policy
- [ ] Verification results are stored in `AppState.verificationState`
- [ ] `VerificationStarted` and `VerificationCompleted` hook events fire at appropriate times

---

### Ticket M2-003: Verification Transcript Persistence

**Priority**: P1  
**Estimated effort**: Small  
**Package**: PKG-B2

**Context**: Write `VerificationResultEntry` to transcript after each verification run. Write `ProofArtifact` to sidecar file.

**Files to modify**:
- `services/verification/index.ts` — append entries after verification completes
- Write sidecar files per doc 11 Section 8.4 naming convention

**Acceptance criteria**:
- [ ] `VerificationResultEntry` written to transcript JSONL after each verification
- [ ] `ProofArtifact` written to `${sessionId}.verification-proofs.jsonl` sidecar
- [ ] Entries load correctly on session resume

---

### Ticket M2-004: Verification Progress UI

**Priority**: P1  
**Estimated effort**: Medium  
**Package**: PKG-B2

**Files to create**:
- `components/verification/VerificationProgress.tsx`
- `components/verification/ConfidenceDisplay.tsx`

**Files to read before starting**:
- `docs/11-implementation-integration-specification.md` Section 10.2, 10.3, 10.4
- `components/Spinner/types.ts` — `SpinnerMode` type (add `'verifying'`)
- `components/StatusLine.tsx` — existing status line pattern

**Acceptance criteria**:
- [ ] `VerificationProgress` shows a checklist of verification checks with pass/fail status
- [ ] `ConfidenceDisplay` shows the confidence score inline with completion message
- [ ] `SpinnerMode` type extended with `'verifying'`
- [ ] Components are gated by `feature('VERIFICATION_RUNTIME')`
- [ ] Components follow existing Ink component patterns

---

### Ticket M2-005: Risk Approval UI — Multi-Mode Implementation

**Priority**: P1  
**Estimated effort**: Large  
**Package**: PKG-B1 (depends on M1-009)

**Context**: This is the multi-mode permission design from doc 11 Section 10.3. Risk approval must work in REPL, SDK/headless, and remote modes.

**Files to create**:
- `components/permissions/RiskApprovalPrompt.tsx` (REPL mode only)

**Files to modify**:
- `services/tools/toolExecution.ts` — risk approval integration point (from M1-012, may need refinement)
- `cli/structuredIO.ts` — extend SDK permission result with risk fields
- `entrypoints/sdk/coreSchemas.ts` — extend `can_use_tool` schema with optional risk fields

**Files to read before starting**:
- `docs/11-implementation-integration-specification.md` Section 10.3 — all three modes
- `components/permissions/PermissionRequest.tsx` lines 47-82 — `permissionComponentForTool` dispatch
- `cli/structuredIO.ts` lines 550-580 — SDK permission flow
- `remote/RemoteSessionManager.ts` lines 189-210 — remote permission flow

**Mode A (REPL) implementation**:
- `RiskApprovalPrompt` renders risk information (risk class, factors, rationale) as an additional section within the existing permission dialog
- It does NOT replace the existing tool-specific permission component — it augments it
- Integration point: in `PermissionRequest.tsx`, when risk data is present on the permission context, render `RiskApprovalPrompt` above the action buttons

**Mode B (SDK/headless) implementation**:
- Extend the `PermissionResult` or `can_use_tool` response type with optional `riskClass`, `riskFactors`, `riskRationale` fields
- R3 in fully non-interactive mode → block with error (safety critical)

**Mode C (remote) implementation**:
- Extend `SDKControlRequest` for `can_use_tool` with optional risk fields
- Remote client displays risk information if it understands the fields; otherwise falls back to normal permission

**Acceptance criteria**:
- [ ] Risk information displayed in REPL permission prompt when risk evaluation produces R2/R3
- [ ] SDK permission response includes risk metadata
- [ ] Remote permission request includes risk metadata
- [ ] R1 actions never show risk UI (auto-approved)
- [ ] R3 actions in non-interactive modes are blocked (not silently approved)
- [ ] Existing permission flow works identically when risk policy is disabled

---

### Ticket M2-006: Phase 2 Exit — Verification and Confidence

**Priority**: P1  
**Estimated effort**: Medium

**What to produce**:
- `artifacts/phase-2/verification-policy-schema.md`
- `artifacts/phase-2/proof-artifact-envelope-spec.md`
- `artifacts/phase-2/confidence-uncertainty-model.md`
- Compatibility regression report update

**Acceptance criteria**:
- [ ] End-to-end test: create mission → execute steps → trigger verification → get confidence score → mission completes/fails based on verification
- [ ] Proof artifact persisted and loadable on resume
- [ ] No regression in baseline metrics

---

## Milestone 3: Scale — Multi-Agent Contract Framework

**Packages**: PKG-F1, PKG-F2  
**Phase**: 3  
**Dependencies**: Milestone 1 + 2 complete  
**Gaps addressed**: G-006 (multi-agent governance)  
**Goal**: Establish subagent contracts, coordinator validation, and arbitration for parallel agent execution.

---

### Ticket M3-001: Create Agent Governance Service Module

**Priority**: P1  
**Estimated effort**: Large  
**Package**: PKG-F1

**Files to read before starting**:
- `docs/11-implementation-integration-specification.md` Sections 3.6, 11.3, 12.7
- `types/agentGovernance.ts` (from M1-006)
- `tools/AgentTool/` — existing agent tool implementation
- `tasks/types.ts` — `TaskState` union, `InProcessTeammateTaskState`
- `utils/task/framework.ts` — task lifecycle patterns

**What to produce**:

Create `services/agentGovernance/`:

1. `services/agentGovernance/index.ts` — `ContractCoordinator`:
   - `createContract(agentType, objective, budgetLimit, toolAllowlist) → SubagentContract`
   - `validateOutput(contractId, output) → ContractValidationResult`
   - `arbitrate(results: ContractValidationResult[]) → ArbitrationDecision`
   - `canMerge(decision: ArbitrationDecision) → MergeDecision`

2. `services/agentGovernance/contractValidator.ts`:
   - Schema validation: output matches expected type
   - Budget validation: agent didn't exceed allocated budget
   - Tool validation: agent only used allowed tools
   - Scope validation: output is relevant to contracted objective

3. `services/agentGovernance/arbitrator.ts`:
   - Conflict detection between multiple agent outputs
   - Resolution strategy: latest-wins, confidence-weighted, or escalate

**Acceptance criteria**:
- [ ] `createContract` generates branded `SubagentContractId`
- [ ] `validateOutput` checks all 4 validation dimensions (schema, budget, tool, scope)
- [ ] `arbitrate` detects conflicting outputs and applies resolution strategy
- [ ] `canMerge` returns `false` for unvalidated outputs (safety invariant from doc 11 Section 12.7)
- [ ] `ContractValidated` and `ArbitrationTriggered` hook events fire
- [ ] Gated by `isAgentGovernanceEnabled()`

---

### Ticket M3-002: Integrate Agent Governance with Existing Agent Tool

**Priority**: P1  
**Estimated effort**: Large  
**Package**: PKG-F2

**Context**: The existing `AgentTool` spawns subagents. When agent governance is enabled, subagent spawning must create a contract and subagent completion must validate against it.

**Files to modify**:
- Agent spawning path in `tools/AgentTool/` — wrap with contract creation
- Agent completion/result path — wrap with validation

**CRITICAL**: Existing agent behavior must be IDENTICAL when `AGENT_GOVERNANCE` is disabled.

**Acceptance criteria**:
- [ ] Agent spawned with governance enabled → contract created before execution
- [ ] Agent result with governance enabled → validated before merge
- [ ] Unvalidated output is not merged into main context
- [ ] Agent spawned with governance disabled → existing behavior unchanged
- [ ] Budget overrun detected and logged

---

### Ticket M3-003: Phase 3 Exit — Agent Governance

**Priority**: P1  
**Estimated effort**: Medium

**What to produce**:
- `artifacts/phase-3/subagent-contract-schema.md`
- `artifacts/phase-3/coordinator-validation-flow.md`
- `artifacts/phase-3/arbitration-policy-spec.md`
- `artifacts/phase-3/phase-exit-gate-package.md`

**Acceptance criteria**:
- [ ] Multi-agent scenario: 2+ agents spawned → contracts created → outputs validated → conflicts arbitrated → merge decision made
- [ ] Governance-off regression: existing agent tests pass unchanged

---

## Milestone 4: Optimization — Cost Planner and Memory Graph

**Packages**: PKG-D1, PKG-D2, PKG-E1, PKG-E2  
**Phase**: 4  
**Dependencies**: Milestones 1 + 2 complete  
**Gaps addressed**: G-004 (cost planning), G-005 (long-horizon memory)  
**Goal**: Add intelligent cost management and evidence-linked memory graph.

---

### Ticket M4-001: Create Cost Planner Service Module

**Priority**: P2  
**Estimated effort**: Large  
**Package**: PKG-D1

**Files to read before starting**:
- `docs/11-implementation-integration-specification.md` Sections 3.4, 12.5
- `types/costPlanner.ts` (from M1-004)
- `bootstrap/state.ts` — `totalCostUSD`, `modelUsage` tracking
- `services/api/claude.ts` — model selection, cost tracking

**What to produce**:

Create `services/costPlanner/`:

1. `services/costPlanner/index.ts` — `CostPlanner`:
   - `createPreflightPlan(mission, costBand) → PreflightPlan`
   - `recordStepCost(stepId, actualCost) → void`
   - `checkBudgetExhaustion(mission) → { exhausted: boolean, remaining: number }`
   - `adaptStrategy(mission, currentCost, progress) → AdaptationEvent | null`

2. `services/costPlanner/estimator.ts`:
   - `estimateStepCost(stepType, model, estimatedTokens) → StepCostEstimate`
   - Uses model pricing data from `services/api/claude.ts`

3. `services/costPlanner/costBandPolicy.ts`:
   - `cheap`: smaller models, aggressive compaction, shorter context
   - `balanced`: default model, normal compaction
   - `thorough`: largest model, extended context, minimal compaction

**Acceptance criteria**:
- [ ] `createPreflightPlan` produces cost estimates before mission execution
- [ ] Budget exhaustion detection triggers before spending exceeds limit
- [ ] `adaptStrategy` can downgrade cost band mid-mission when budget is at risk
- [ ] Cost band policy does NOT modify `ThinkingConfig` (doc 11 Section 9.3)
- [ ] Gated by `isCostPlannerEnabled()`

---

### Ticket M4-002: Create Memory Graph Service Module

**Priority**: P2  
**Estimated effort**: Large  
**Package**: PKG-E1

**Files to read before starting**:
- `docs/11-implementation-integration-specification.md` Sections 3.5, 12.6
- `types/memoryGraph.ts` (from M1-005)
- `memdir/memdir.ts` — existing memory system
- `services/SessionMemory/sessionMemory.ts` — session memory patterns
- `services/teamMemorySync/index.ts` — team memory sync

**What to produce**:

Create `services/memoryGraph/`:

1. `services/memoryGraph/index.ts` — `MemoryGraphService`:
   - `addNode(type, content, evidence?, source?) → MemoryNode`
   - `addEdge(from, to, relation) → MemoryEdge`
   - `query(predicate) → MemoryNode[]`
   - `evaluateFreshness(nodeId) → FreshnessEvaluation`
   - `pruneStale() → MemoryNode[]` (returns pruned nodes)

2. `services/memoryGraph/freshnessPolicy.ts`:
   - Default TTL by node type: `fact` = 7 days, `preference` = 30 days, `tool_outcome` = 1 day, `context` = session-only
   - Freshness evaluation considers: age, number of confirmations, contradiction count

3. `services/memoryGraph/evidenceLinker.ts`:
   - `linkToEvidence(nodeId, evidenceRef) → MemoryEdge`
   - Evidence refs point to: file paths, tool use IDs, verification proof IDs

4. Storage: `${projectRoot}/.claude/memory-graph.json` (project-scoped, per doc 11 Section 8.4)

**Acceptance criteria**:
- [ ] Memory graph persists to `.claude/memory-graph.json`
- [ ] Freshness policy auto-decays nodes based on TTL
- [ ] `pruneStale` removes nodes past their TTL with no confirmations
- [ ] Evidence links traceable from node to source
- [ ] Existing `memdir` memory system is NOT modified
- [ ] Gated by `isMemoryGraphEnabled()`

---

### Ticket M4-003: Cost Planner UI — Cost Band Selection

**Priority**: P2  
**Estimated effort**: Small  
**Package**: PKG-D1

**Files to create**:
- `components/mission/CostBandSelector.tsx`

**Acceptance criteria**:
- [ ] Presents cheap/balanced/thorough options via notification (REPL)
- [ ] SDK mode accepts cost band as parameter (no UI needed)
- [ ] Selection updates `AppState.costPlannerState.currentBand`

---

### Ticket M4-004: Mission Status UI Components

**Priority**: P2  
**Estimated effort**: Medium  
**Package**: PKG-D1

**Files to create**:
- `components/mission/MissionStatusIndicator.tsx`
- `components/mission/MissionProgressPanel.tsx`

**Files to modify**:
- `components/StatusLine.tsx` — add mission indicator when active
- `components/tasks/BackgroundTasksDialog.tsx` — add mission progress view

**Acceptance criteria**:
- [ ] Mission indicator shows `[M: executing 3/5]` format in status line
- [ ] Mission progress panel shows step-by-step progress in Shift+Down dialog
- [ ] Components gated by `feature('MISSION_ENGINE')`
- [ ] No visible change when no mission is active

---

### Ticket M4-005: Adaptive Cost Strategy Integration

**Priority**: P2  
**Estimated effort**: Medium  
**Package**: PKG-D2

**Context**: Integrate cost planner adaptation into the mission execution loop. When budget is at risk, the planner can suggest cost band downgrade.

**Files to modify**:
- `services/mission/index.ts` — check budget after each step
- `services/costPlanner/index.ts` (from M4-001) — adaptation logic

**Acceptance criteria**:
- [ ] Budget checked after each mission step completion
- [ ] If remaining budget < estimated remaining cost, adaptation event fires
- [ ] Adaptation can downgrade cost band (e.g., `thorough` → `balanced`)
- [ ] User notification when adaptation occurs
- [ ] Mission can be aborted if budget is fully exhausted

---

### Ticket M4-006: Evidence-Linked Memory Retrieval

**Priority**: P2  
**Estimated effort**: Medium  
**Package**: PKG-E2

**Context**: When the system retrieves memory for context or decision-making, it should prefer evidence-linked nodes and mark stale nodes.

**Files to modify**:
- `services/memoryGraph/index.ts` (from M4-002) — add retrieval ranking

**Acceptance criteria**:
- [ ] Evidence-linked nodes rank higher in retrieval results
- [ ] Stale nodes are marked with freshness warning
- [ ] Retrieval results include evidence refs for traceability
- [ ] Dream consolidation outputs (from `DreamTaskState`) can be captured as memory nodes

---

### Ticket M4-007: Phase 4 Exit

**Priority**: P2  
**Estimated effort**: Medium

**What to produce**:
- `artifacts/phase-4/cost-band-planner-spec.md`
- `artifacts/phase-4/memory-graph-freshness-and-evidence-spec.md`
- `artifacts/phase-4/phase-exit-gate-package.md`

**Acceptance criteria**:
- [ ] Cost planner end-to-end: mission with budget → cost tracked → adaptation triggered when needed
- [ ] Memory graph end-to-end: nodes created → freshness evaluated → stale pruned → evidence linked
- [ ] No regression in baseline metrics

---

## Milestone 5: Hardening — Cross-Mode Compatibility and Launch Readiness

**Packages**: PKG-H1, PKG-H2  
**Phase**: 5  
**Dependencies**: All previous milestones complete  
**Gaps addressed**: G-008 (cross-mode parity)  
**Goal**: Validate all enhancements work correctly across all runtime modes and prepare for production launch.

---

### Ticket M5-001: Cross-Mode Compatibility Testing

**Priority**: P0  
**Estimated effort**: Large  
**Package**: PKG-H1

**Context**: Every A-F enhancement must work in all 4 modes. This is the most critical quality gate.

**Test matrix**:

| Feature | REPL | Headless/SDK | Remote/CCR | Bridge |
|---|---|---|---|---|
| Mission create/execute/complete | Test | Test | Test | Test |
| Risk evaluation R1/R2/R3 | Test | Test | Test | Test |
| Risk approval prompt | Visual test | Schema test | WS test | Passthrough |
| Verification run | Test | Test | Test | Test |
| Confidence display | Visual test | JSON output | Event test | Passthrough |
| Cost band selection | Visual test | Param test | Elicitation | Passthrough |
| Agent governance | Test | Test | Test | Test |
| Memory graph | Test | Test | Test | Test |
| Compaction with mission | Test | Test | Test | Test |
| Session resume with mission | Test | Test | Test | Test |

**Acceptance criteria**:
- [ ] Full matrix covered (40 cells minimum)
- [ ] Each cell has a documented pass/fail result
- [ ] All failures investigated and fixed
- [ ] Report at `artifacts/phase-5/full-compatibility-matrix-report.md`

---

### Ticket M5-002: Rollback Drill Execution

**Priority**: P0  
**Estimated effort**: Medium  
**Package**: PKG-H2

**Context**: Test that every enhancement can be cleanly disabled via feature flag without leaving orphaned state.

**Drill scenarios**:
1. Disable `MISSION_ENGINE` mid-session → verify no crash, existing session continues
2. Disable `RISK_POLICY_ENGINE` → verify permissions revert to pre-enhancement behavior
3. Disable `VERIFICATION_RUNTIME` → verify missions complete without verification
4. Disable `AGENT_GOVERNANCE` → verify agents spawn/complete normally
5. Disable `COST_PLANNER` → verify default cost behavior
6. Disable `MEMORY_GRAPH` → verify no crash, memory falls back to `memdir`

**Acceptance criteria**:
- [ ] All 6 drills pass
- [ ] No orphaned state after flag disable
- [ ] No data corruption in transcripts
- [ ] Report at `artifacts/phase-5/rollback-drill-report.md`

---

### Ticket M5-003: Operational Runbook

**Priority**: P0  
**Estimated effort**: Medium  
**Package**: PKG-H2

**What to produce**: `artifacts/phase-5/operational-runbook-v1.md` covering:
1. Feature flag toggle procedures for each enhancement
2. Monitoring and alerting setup for mission/verification failures
3. Incident response for: mission stuck in state, verification false positive/negative, risk engine miscategorization
4. Support procedures for: session with corrupted mission state, transcript size growth

**Acceptance criteria**:
- [ ] Every enhancement has a "how to disable" procedure
- [ ] Every known failure mode has a response procedure
- [ ] Runbook reviewed by someone other than the author

---

### Ticket M5-004: Launch Readiness Review

**Priority**: P0  
**Estimated effort**: Small  
**Package**: PKG-H2

**What to produce**: `artifacts/phase-5/launch-readiness-review.md` containing:
1. Phase exit evidence from all phases
2. Compatibility matrix summary
3. Rollback drill results
4. Outstanding risks and mitigations
5. Go/no-go recommendation

**Acceptance criteria**:
- [ ] All phase exit gates passed
- [ ] No open P0 bugs
- [ ] Rollback drills all passed
- [ ] Decision record created for launch/no-launch

---

## Appendix A: Ticket Dependency Graph

```
M0-001 ──┐
M0-002 ──┤
M0-003 ──┼──► M0-004 (Phase 0 Gate)
         │
         ▼
M1-001 ──┐
M1-002 ──┤
M1-003 ──┤
M1-004 ──┤
M1-005 ──┤
M1-006 ──┼──► M1-007 ──► M1-008 ──┐
         │                M1-009 ──┤
         │                         ├──► M1-010 ──► M1-011 ──► M1-012 ──► M1-013 ──► M1-014 (Phase 1 Gate)
         │                         │
         ▼                         ▼
                              M2-001 ──► M2-002 ──► M2-003 ──┐
                              M2-005 ──────────────────────── ┤
                                                              ├──► M2-004 ──► M2-006 (Phase 2 Gate)
                                                              │
                                                              ▼
                                                         M3-001 ──► M3-002 ──► M3-003 (Phase 3 Gate)
                                                              │
                                                              ▼
                                                    M4-001 ──► M4-003 ──► M4-005 ──┐
                                                    M4-002 ──► M4-006 ──────────── ┤
                                                    M4-004 ──────────────────────── ┼──► M4-007 (Phase 4 Gate)
                                                                                    │
                                                                                    ▼
                                                                               M5-001 ──► M5-002 ──► M5-003 ──► M5-004 (Phase 5 Gate / Launch)
```

## Appendix B: Quick-Reference File Map for AI Agents

When an AI agent picks up a ticket, it should read these files for context:

| Domain | Critical Files |
|---|---|
| Entry/boot | `entrypoints/cli.tsx`, `entrypoints/init.ts`, `main.tsx`, `setup.ts` |
| Query loop | `query.ts`, `QueryEngine.ts` |
| Tool system | `Tool.ts`, `tools.ts`, `services/tools/toolExecution.ts`, `services/tools/toolOrchestration.ts` |
| State | `bootstrap/state.ts`, `state/AppStateStore.ts` |
| Persistence | `types/logs.ts`, `utils/sessionStorage.ts` |
| Compaction | `services/compact/compact.ts`, `services/compact/snipProjection.ts` |
| Hooks | `entrypoints/sdk/coreTypes.ts`, `entrypoints/sdk/coreSchemas.ts`, `types/hooks.ts`, `utils/plugins/loadPluginHooks.ts` |
| Permissions | `components/permissions/PermissionRequest.tsx`, `hooks/toolPermission/PermissionContext.ts` |
| SDK/headless | `cli/print.ts`, `cli/structuredIO.ts` |
| Remote | `remote/RemoteSessionManager.ts`, `bridge/bridgeMain.ts` |
| MCP | `services/mcp/types.ts`, `services/mcp/client.ts` |
| Memory | `memdir/memdir.ts`, `services/SessionMemory/sessionMemory.ts` |
| Tasks/agents | `tasks/types.ts`, `tools/AgentTool/` |
| Feature flags | `bridge/bridgeEnabled.ts` (canonical pattern), `services/analytics/growthbook.ts` |
| UI | `screens/REPL.tsx`, `components/StatusLine.tsx`, `components/Spinner/types.ts` |

## Appendix C: Documentation Cross-Reference

| Ticket | Primary Doc Reference | Key Section |
|---|---|---|
| M1-001 | `docs/11-implementation-integration-specification.md` | Section 3.1 |
| M1-002 | `docs/11-implementation-integration-specification.md` | Section 3.3 |
| M1-007 | `docs/11-implementation-integration-specification.md` | Section 7 |
| M1-008 | `docs/11-implementation-integration-specification.md` | Sections 3.1, 4.1, 5.2 |
| M1-009 | `docs/11-implementation-integration-specification.md` | Sections 3.3, 6.3 |
| M1-010 | `docs/11-implementation-integration-specification.md` | Section 4.3 |
| M1-011 | `docs/11-implementation-integration-specification.md` | Sections 8.2, 8.3 |
| M1-012 | `docs/11-implementation-integration-specification.md` | Sections 4.3.4, 5.3, 6.3, 9.1 |
| M1-013 | `docs/11-implementation-integration-specification.md` | Section 6.4 |
| M2-001 | `docs/11-implementation-integration-specification.md` | Section 3.2 |
| M2-005 | `docs/11-implementation-integration-specification.md` | Section 10.3 |
| M3-001 | `docs/11-implementation-integration-specification.md` | Section 3.6 |
| M4-001 | `docs/11-implementation-integration-specification.md` | Section 3.4 |
| M4-002 | `docs/11-implementation-integration-specification.md` | Section 3.5 |

---

This document is the authoritative ticket plan for A-F enhancement implementation. Each ticket is designed to be self-contained: an AI agent or developer should be able to read the ticket, read the referenced files, and produce correct implementation without external guidance.
