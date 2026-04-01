# Implementation Integration Specification

Status: Normative implementation-integration baseline for transformation delivery
Scope: `/Users/adityashahi/Downloads/src` transformation program
Purpose: Bridge the gap between architecture/governance docs and production code by specifying concrete TypeScript types, module placement, system integration points, persistence formats, UI strategy, and feature flag assignments grounded in existing codebase patterns.

## 1) Inputs and Authority

This document operationalizes:

1. `docs/01-current-state-architecture.md` (contract/evidence baseline)
2. `docs/02-vision-and-guardrails.md` (guardrails and compatibility rules)
3. `docs/03-gap-analysis-and-target-architecture.md` (gap/target/dependencies)
4. `docs/04-migration-plan-and-rollout.md` (phase/ring/gate model)
5. `docs/05-execution-model-and-operating-principles.md` (runtime decision loops)
6. `docs/06-program-execution-rules-and-principles.md` (program governance)
7. `docs/07-rfc-roadmap-and-implementation-packages.md` (package roadmap)
8. `docs/08-validation-and-test-strategy.md` (validation evidence)
9. `docs/09-metrics-observability-and-auditability.md` (telemetry and audit)
10. `docs/10-risk-register-and-closure-plan.md` (risk governance)
11. All six RFCs (`RFC-Mission-Engine.md` through `RFC-MultiAgent-Contracts.md`)
12. `docs/12-implementation-governance-and-change-management.md` (change controls)

Authority:

- normative for file placement, type definitions, integration insertion points, persistence format, UI strategy, compaction interaction, hook system extensions, feature flag assignments, and API layer impact
- supersedes any prior "logical schema" in RFCs where concrete TypeScript definitions are provided here

## 2) Type Definition Strategy and Conventions

## 2.1 Existing codebase type patterns (code-grounded)

From source analysis:

- **Domain types** use plain TypeScript `type` aliases and discriminated unions with string `type` fields (e.g., `TaskState` in `tasks/types.ts`, `Command` in `types/command.ts`, `Entry` in `types/logs.ts`, `ThinkingConfig` in `utils/thinking.ts`)
- **Branded types** where type safety requires nominal distinction (e.g., `SystemPrompt` in `utils/systemPromptType.ts`)
- **Zod schemas** are used for external protocol boundaries:
  - hook response schemas in `types/hooks.ts` (`z.object({...})` with `z.infer`)
  - MCP config schemas in `services/mcp/types.ts` (`McpServerConfigSchema`)
  - SDK control schemas in `entrypoints/sdk/controlSchemas.ts` (`SDKControl*Schema`)
  - service response schemas in `services/policyLimits/types.ts`, `services/remoteManagedSettings/types.ts`
- **Co-located types** are standard: service-specific types live in `services/<feature>/types.ts`; shared/cross-cutting types live in `types/`

## 2.2 Type strategy for A-F enhancements

Rule: follow existing conventions exactly.

1. **Internal domain models** (mission state, verification result, risk decision, cost plan, memory node): plain TypeScript `type` with discriminated unions where applicable
2. **External/serialized boundaries** (persistence format, hook payloads, SDK control extensions): Zod schemas with `z.infer` for derived types
3. **Cross-cutting shared types** that multiple services consume: `types/mission.ts`, `types/verification.ts`, `types/riskPolicy.ts`
4. **Service-local types** that only one module uses: co-located `types.ts` within the service directory
5. **Branded types** for IDs that must not be accidentally mixed: `MissionId`, `VerificationId`, `RiskDecisionId`

## 3) TypeScript Type Definitions for A-F (Concrete)

## 3.1 Mission Engine types (A)

Location: `types/mission.ts` (shared), `services/mission/types.ts` (service-internal)

```typescript
// types/mission.ts

import type { SessionId } from './ids.js'

export type MissionId = string & { readonly __brand: 'MissionId' }
export type MissionStepId = string & { readonly __brand: 'MissionStepId' }

export const MISSION_STATES = [
  'created',
  'planned',
  'executing',
  'verifying',
  'completed',
  'aborted',
  'failed',
  'rolled_back',
] as const
export type MissionState = (typeof MISSION_STATES)[number]

export type MissionBudgetPolicy = {
  maxCostUsd?: number
  costBand: 'cheap' | 'balanced' | 'thorough'
  maxDurationMs?: number
}

export type MissionRollbackStrategy = {
  type: 'git_revert' | 'file_restore' | 'manual' | 'none'
  checkpointRef?: string
}

export type MissionSuccessCriterion = {
  criterionId: string
  description: string
  checkType: 'test' | 'lint' | 'typecheck' | 'semantic' | 'manual' | 'custom'
  checkCommand?: string
  status: 'pending' | 'passed' | 'failed' | 'waived'
  evidenceRef?: string
}

export type MissionStep = {
  stepId: MissionStepId
  intent: string
  actionType: 'tool' | 'command' | 'subagent' | 'manual_boundary'
  actionRef?: string
  expectedOutcome: string
  actualOutcome?: string
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped'
  evidenceRefs: string[]
  riskClass?: 'R1' | 'R2' | 'R3'
  startedAt?: number
  endedAt?: number
}

export type Mission = {
  missionId: MissionId
  sessionId: SessionId
  parentMissionId?: MissionId
  objective: string
  constraints: string[]
  budgetPolicy: MissionBudgetPolicy
  riskPolicyRef?: string
  successCriteria: MissionSuccessCriterion[]
  rollbackStrategy: MissionRollbackStrategy
  state: MissionState
  steps: MissionStep[]
  verificationSummary?: VerificationSummary
  confidenceSummary?: ConfidenceSummary
  createdAt: number
  updatedAt: number
  checkpointIndex: number
}

export type MissionTransitionEvent = {
  missionId: MissionId
  fromState: MissionState
  toState: MissionState
  timestamp: number
  correlationId: string
  reason?: string
}
```

## 3.2 Verification types (B)

Location: `types/verification.ts`

```typescript
// types/verification.ts

import type { MissionId, MissionStepId } from './mission.js'

export type VerificationId = string & { readonly __brand: 'VerificationId' }

export type CheckStatus = 'pass' | 'fail' | 'skipped' | 'timeout' | 'error'

export type VerificationCheckResult = {
  checkId: string
  checkType: 'test' | 'lint' | 'typecheck' | 'policy' | 'semantic' | 'custom'
  status: CheckStatus
  evidenceRef?: string
  durationMs: number
  errorSummary?: string
}

export type VerificationWaiver = {
  waiverId: string
  scope: string
  owner: string
  justification: string
  riskClass: 'R1' | 'R2' | 'R3'
  expiresAt: number
  decisionId: string
}

export type VerificationPolicy = {
  policyId: string
  objectiveClass: string
  requiredChecks: Array<{
    checkType: VerificationCheckResult['checkType']
    required: boolean
    timeoutMs?: number
  }>
  passCriteria: 'all_required_pass' | 'percentage_threshold'
  passThreshold?: number
  allowWaivers: boolean
}

export type ProofArtifact = {
  verificationId: VerificationId
  missionId?: MissionId
  stepId?: MissionStepId
  checks: VerificationCheckResult[]
  waivers: VerificationWaiver[]
  unresolved: string[]
  verdict: 'pass' | 'fail' | 'waived_pass'
  confidence: ConfidenceScore
  timestamp: number
}

export type ConfidenceScore = {
  value: number
  reasons: ConfidenceReason[]
}

export type ConfidenceReason = {
  category: 'missing_evidence' | 'bounded_risk' | 'partial_validation' |
    'waived_failure' | 'environment_mismatch' | 'stale_context' | 'full_coverage'
  description: string
  severity: 'info' | 'warning' | 'critical'
}

export type ConfidenceSummary = {
  overall: ConfidenceScore
  perStep: Array<{ stepId: MissionStepId; confidence: ConfidenceScore }>
}

export type VerificationSummary = {
  proofArtifact: ProofArtifact
  confidenceSummary: ConfidenceSummary
}
```

## 3.3 Risk Policy Engine types (C)

Location: `types/riskPolicy.ts`

```typescript
// types/riskPolicy.ts

export type RiskDecisionId = string & { readonly __brand: 'RiskDecisionId' }

export type RiskClass = 'R1' | 'R2' | 'R3'
export type DecisionMode = 'auto' | 'scoped_ask' | 'explicit_ask'

export type RiskFactors = {
  dataSensitivity: 'none' | 'low' | 'medium' | 'high' | 'critical'
  blastRadius: 'local_file' | 'directory' | 'project' | 'system' | 'external'
  reversibility: 'fully_reversible' | 'partially_reversible' | 'irreversible'
  environmentCriticality: 'development' | 'staging' | 'production' | 'unknown'
}

export type RiskEvaluationInput = {
  actionDescriptor: string
  toolName?: string
  parsedInputs?: Record<string, unknown>
  executionContext: {
    mode: 'interactive' | 'headless' | 'remote' | 'bridge' | 'daemon'
    environment?: string
    sessionFlags?: Record<string, boolean>
  }
  historicalContext?: {
    recentDenials: number
    recentFailures: number
  }
}

export type RiskEvaluationOutput = {
  decisionId: RiskDecisionId
  riskClass: RiskClass
  decisionMode: DecisionMode
  riskFactors: RiskFactors
  policyReasons: string[]
  policyVersionId: string
  timestamp: number
  correlationId: string
}

export type RiskAuditRecord = {
  decisionId: RiskDecisionId
  evaluationInput: RiskEvaluationInput
  evaluationOutput: RiskEvaluationOutput
  approvalOutcome: 'approved' | 'denied' | 'pending' | 'timeout'
  approvedBy?: string
  missionId?: string
  sessionId: string
}

export type RiskPolicyProfile = {
  profileId: string
  version: string
  rules: RiskPolicyRule[]
  defaultClass: RiskClass
  updatedAt: number
}

export type RiskPolicyRule = {
  ruleId: string
  matcher: {
    toolNames?: string[]
    actionPatterns?: string[]
    environmentPatterns?: string[]
  }
  overrideClass?: RiskClass
  overrideMode?: DecisionMode
  reason: string
}
```

## 3.4 Cost-Intelligent Planner types (D)

Location: `services/costPlanner/types.ts`

```typescript
// services/costPlanner/types.ts

import type { MissionId } from '../../types/mission.js'

export type CostBand = 'cheap' | 'balanced' | 'thorough'

export type CostEstimate = {
  minUsd: number
  expectedUsd: number
  maxUsd: number
  uncertaintyPercent: number
}

export type PreflightPlan = {
  missionId?: MissionId
  selectedBand: CostBand
  costEstimate: CostEstimate
  phaseStrategy: PhaseStrategy
  verificationDepth: 'minimal' | 'standard' | 'comprehensive'
  uncertaintyReasons: string[]
  timestamp: number
}

export type PhaseStrategy = {
  discovery: { modelTier: 'fast' | 'standard' | 'strong'; toolBudget: number }
  synthesis: { modelTier: 'fast' | 'standard' | 'strong'; toolBudget: number }
  verification: { modelTier: 'fast' | 'standard' | 'strong'; toolBudget: number }
}

export type AdaptationEvent = {
  missionId?: MissionId
  fromPhase: string
  toPhase: string
  reason: string
  costImpact: CostEstimate
  timestamp: number
}

export type ReuseCacheEntry = {
  cacheKey: string
  artifactRef: string
  verificationStatus: 'verified' | 'unverified'
  freshnessScore: number
  createdAt: number
  lastAccessedAt: number
  invalidatedAt?: number
}
```

## 3.5 Memory 2.0 types (E)

Location: `services/memoryGraph/types.ts`

```typescript
// services/memoryGraph/types.ts

export type MemoryNodeId = string & { readonly __brand: 'MemoryNodeId' }
export type MemoryEdgeId = string & { readonly __brand: 'MemoryEdgeId' }

export const MEMORY_NODE_TYPES = [
  'user_preference',
  'architecture_decision',
  'incident',
  'constraint',
  'repo_landmark',
  'tool_outcome',
  'project_context',
] as const
export type MemoryNodeType = (typeof MEMORY_NODE_TYPES)[number]

export type MemoryNode = {
  nodeId: MemoryNodeId
  nodeType: MemoryNodeType
  content: string
  confidence: number
  freshnessScore: number
  createdAt: number
  updatedAt: number
  evidenceRefs: EvidenceRef[]
  sourceScope: 'session' | 'project' | 'team'
  decayPolicy?: DecayPolicy
}

export type EvidenceRef = {
  type: 'transcript' | 'tool_result' | 'verification_artifact' |
    'code_anchor' | 'decision_record'
  path: string
  timestamp: number
  validUntil?: number
}

export const MEMORY_EDGE_TYPES = [
  'supports',
  'contradicts',
  'depends_on',
  'supersedes',
  'related_to',
] as const
export type MemoryEdgeType = (typeof MEMORY_EDGE_TYPES)[number]

export type MemoryEdge = {
  edgeId: MemoryEdgeId
  fromNodeId: MemoryNodeId
  toNodeId: MemoryNodeId
  relationType: MemoryEdgeType
  weight: number
  createdAt: number
}

export type DecayPolicy = {
  halfLifeMs: number
  minFreshness: number
  refreshOnAccess: boolean
}

export type MemoryQueryResult = {
  nodes: MemoryNode[]
  edges: MemoryEdge[]
  staleFlagged: MemoryNodeId[]
  conflictFlagged: Array<{ nodeA: MemoryNodeId; nodeB: MemoryNodeId }>
}
```

## 3.6 Multi-Agent Contract types (F)

Location: `types/agentContract.ts`

```typescript
// types/agentContract.ts

import type { MissionId } from './mission.js'
import type { ConfidenceScore } from './verification.js'

export type ContractId = string & { readonly __brand: 'ContractId' }

export type SubagentContract = {
  contractId: ContractId
  agentType: string
  objectiveScope: string
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  toolAllowlist: string[]
  budgetPolicy: {
    maxCostUsd?: number
    maxDurationMs?: number
    maxToolCalls?: number
  }
  acceptanceTests: AcceptanceTest[]
  riskPolicyRef?: string
  timeoutMs: number
  missionId?: MissionId
}

export type AcceptanceTest = {
  testId: string
  description: string
  checkType: 'schema_validation' | 'assertion' | 'test_command' | 'semantic'
  checkCommand?: string
  expectedOutcome?: string
}

export type ContractExecutionResult = {
  contractId: ContractId
  executionStatus: 'completed' | 'failed' | 'timeout' | 'aborted'
  outputPayload: Record<string, unknown>
  validationStatus: 'valid' | 'invalid' | 'partial'
  acceptanceResults: Array<{
    testId: string
    status: 'pass' | 'fail' | 'skipped'
    evidenceRef?: string
  }>
  confidence: ConfidenceScore
  evidenceRefs: string[]
  mergeEligible: boolean
}

export type ArbitrationInput = {
  contractId: ContractId
  conflictingResults: ContractExecutionResult[]
}

export type ArbitrationOutput = {
  selectedResultIndex: number
  rationale: string
  verificationWeight: number
  confidenceWeight: number
  recencyWeight: number
  escalateToHuman: boolean
}
```

## 4) Module Placement Plan

## 4.1 Directory structure for new modules

Following existing conventions (`services/<feature>/index.ts` + `types.ts` pattern):

```
src/
├── types/
│   ├── mission.ts                    # shared mission types (A)
│   ├── verification.ts               # shared verification types (B)
│   ├── riskPolicy.ts                 # shared risk policy types (C)
│   └── agentContract.ts              # shared multi-agent contract types (F)
├── services/
│   ├── mission/
│   │   ├── index.ts                  # MissionService: create/plan/execute/verify/commit/abort/resume
│   │   ├── types.ts                  # service-internal types
│   │   ├── stateMachine.ts           # mission state transition validator
│   │   ├── checkpoint.ts             # checkpoint persistence and restoration
│   │   ├── missionContext.ts         # mission context assembly for system prompt injection
│   │   └── missionEnabled.ts         # feature flag gate (build-time + runtime pattern)
│   ├── riskPolicy/
│   │   ├── index.ts                  # RiskPolicyEngine: evaluate, decide, audit
│   │   ├── types.ts                  # service-internal types and default policy profile
│   │   ├── scorer.ts                 # risk factor scoring logic
│   │   ├── auditLog.ts              # append-only risk decision audit records
│   │   └── riskPolicyEnabled.ts      # feature flag gate
│   ├── verification/
│   │   ├── index.ts                  # VerificationEngine: run checks, produce proof artifacts
│   │   ├── types.ts                  # service-internal types and policy defaults
│   │   ├── checkerOrchestrator.ts    # orchestrate test/lint/type/semantic checks
│   │   ├── confidenceCalculator.ts   # compute confidence score from check results
│   │   ├── waiverManager.ts          # waiver lifecycle and expiry enforcement
│   │   └── verificationEnabled.ts    # feature flag gate
│   ├── costPlanner/
│   │   ├── index.ts                  # CostPlanner: preflight planning and adaptation
│   │   ├── types.ts                  # service-internal types
│   │   ├── estimator.ts             # cost estimation logic
│   │   ├── reuseCache.ts            # verified intermediate reuse cache
│   │   └── costPlannerEnabled.ts     # feature flag gate
│   ├── memoryGraph/
│   │   ├── index.ts                  # MemoryGraphService: store, query, decay, refresh
│   │   ├── types.ts                  # service-internal types
│   │   ├── graphStore.ts            # graph persistence (file-based, memdir-compatible)
│   │   ├── freshnessPolicy.ts       # decay/refresh logic
│   │   ├── evidenceLinker.ts        # link memory nodes to code/runtime evidence
│   │   └── memoryGraphEnabled.ts    # feature flag gate
│   └── agentGovernance/
│       ├── index.ts                  # ContractCoordinator: validate, arbitrate, merge
│       ├── types.ts                  # service-internal types
│       ├── contractValidator.ts      # schema/budget/tool validation
│       ├── arbitrator.ts            # conflict resolution logic
│       └── agentGovernanceEnabled.ts # feature flag gate
```

## 4.2 Placement rationale

- `types/` for shared cross-cutting types matches existing `types/command.ts`, `types/hooks.ts`, `types/logs.ts` patterns
- `services/<feature>/` for service modules matches existing `services/policyLimits/`, `services/remoteManagedSettings/`, `services/mcp/` patterns
- `*Enabled.ts` files for feature flag gates match existing `bridge/bridgeEnabled.ts`, `voice/voiceModeEnabled.ts` patterns
- No top-level files added (existing convention: top-level files are reserved for core orchestrators like `query.ts`, `tools.ts`, `commands.ts`)

## 4.3) Runtime State Ownership — Threading Mission/Risk/Verification State Through Carriers

**Problem**: The docs assume mission, risk, and verification state is "available" at compaction time, system-prompt assembly, tool execution, and UI rendering. But none of the three runtime state carriers expose it today:

- `AppState` (`state/AppStateStore.ts` line ~89) has no mission/risk/verification fields
- `ToolUseContext` (`Tool.ts` line ~158) has no mission accessor
- `QueryEngineConfig` (`QueryEngine.ts` line ~130) has no mission plumbing

Without resolving this, implementation will immediately hit a "where does mission state live?" roadblock. This section defines the canonical answer.

### 4.3.1 Primary carrier: `AppState`

Active mission/risk/verification state lives in `AppState`. Rationale:

- `AppState` is already the dual-carrier for both UI state (React rendering) and runtime state (tool execution reads it via `toolUseContext.getAppState()`)
- Tasks already live outside `DeepImmutable<{}>` in `AppState` (the `tasks` field). Mission state follows the same pattern — it contains mutable subobjects that should not be deeply frozen
- `AppState` changes are visible to both REPL UI components and headless/SDK paths via `getAppState()`

Add to `AppState` (after the `tasks` field, outside `DeepImmutable<{}>` for the same reason as `tasks`):

```typescript
export type AppState = DeepImmutable<{
  // ... existing fields ...
}> & {
  tasks: { [taskId: string]: TaskState }
  // ... existing mutable fields ...

  // Enhancement A-F runtime state (outside DeepImmutable — contains mutable nested objects)
  activeMission?: Mission       // from types/mission.ts — active mission for this session
  riskPolicyState?: {           // from types/riskPolicy.ts
    activePolicyRef: string
    sessionDecisionLog: RiskDecision[]
  }
  verificationState?: {         // from types/verification.ts
    activeBundle?: VerificationBundle
    lastResult?: VerificationResult
  }
  costPlannerState?: {          // from types/costPlanner.ts
    currentBand: 'cheap' | 'balanced' | 'thorough'
    sessionBudgetUsed: number
    sessionBudgetLimit?: number
  }
}
```

### 4.3.2 Access from `ToolUseContext`

`ToolUseContext` already carries `getAppState()` and `setAppState()`. No new fields on `ToolUseContext` are needed. Mission-aware tool code accesses state via:

```typescript
const mission = toolUseContext.getAppState().activeMission
if (mission) {
  // mission-aware behavior
}
```

This is the same pattern existing code uses (e.g., `toolUseContext.getAppState().tasks`). No change to `ToolUseContext` type definition required.

### 4.3.3 Access from `QueryEngineConfig`

`QueryEngineConfig` already carries `getAppState` and `setAppState`. Same as `ToolUseContext` — no new fields needed. The query loop in `query.ts` accesses mission state via:

```typescript
const appState = params.toolUseContext.getAppState()
const activeMission = appState.activeMission
```

### 4.3.4 System prompt assembly access

`buildSystemPromptBlocks` in `services/api/claude.ts` does NOT have direct access to `AppState`. System prompt assembly currently receives a pre-built `SystemPrompt` (branded `string[]`). Mission context injection must happen BEFORE the API call, in the code that constructs the system prompt.

The correct injection point is in `query.ts` where `getSystemPrompt(...)` is called. This function already receives multiple context parameters. Add:

```typescript
const missionContext = appState.activeMission
  ? getMissionContextForSystemPrompt(appState.activeMission)
  : undefined

const systemPrompt = getSystemPrompt({
  // ... existing params ...
  missionContext, // new optional parameter
})
```

`getSystemPrompt` appends mission context as an additional segment. This keeps `buildSystemPromptBlocks` unmodified — it just sees more segments in the `SystemPrompt` array.

### 4.3.5 Compaction access

`compactConversation` in `services/compact/compact.ts` receives a `ToolUseContext` parameter (or reconstructs one). Mission state is accessed via `toolUseContext.getAppState().activeMission`. The `createMissionAttachmentIfNeeded` function (Section 5.2) reads from this accessor.

### 4.3.6 Headless/SDK access

`QueryEngine` owns `getAppState` and `setAppState` in its config. When the SDK creates a `QueryEngine`, mission state initialization is passed via `setAppState` before the first `submitMessage`:

```typescript
const engine = new QueryEngine(config)
engine.config.setAppState(prev => ({
  ...prev,
  activeMission: missionFromSDKParams,
}))
```

### 4.3.7 State lifecycle

- **Created**: when user invokes mission start (command or tool), `setAppState` sets `activeMission`
- **Updated**: on each mission state transition, `setAppState` updates `activeMission.state` and `activeMission.steps`
- **Cleared**: on mission completion/abort, `setAppState` sets `activeMission` to `undefined`
- **Persisted**: each state change is also written to the JSONL transcript as a `mission_state` entry (Section 8)
- **Restored**: on `/resume`, `loadTranscriptFile` rebuilds `missionStates` from entries, and the session resume code sets `activeMission` from the latest entry

## 5) Compaction System Integration

## 5.1 Current compaction architecture (code-grounded)

From `services/compact/`:

- **`autoCompactIfNeeded`** triggers when `tokenCountWithEstimation(messages)` exceeds `getAutoCompactThreshold(model)` (effective context window minus 13,000 buffer tokens)
- **`compactConversation`** sends full messages to a summarizer, then builds post-compact messages via `buildPostCompactMessages` with: boundary marker, summary, optional `messagesToKeep`, and post-compact attachments (files, skills, plans, MCP deltas, hooks)
- **`sessionMemoryCompact`** (session-memory experiment path) keeps a configurable tail via `calculateMessagesToKeepIndex` respecting `minTokens` (10k), `minTextBlockMessages` (5), and `maxTokens` (40k) boundaries
- **`microcompactMessages`** applies to `COMPACTABLE_TOOLS` tool results only (targeted cache editing)
- **Snip strategy** (`feature('HISTORY_SNIP')`) proactively drops older history while keeping a protected tail
- **No generic `isCompactSafe` marker exists** in the current system; protection is structural (post-compact attachment reconstruction, boundary messages, API invariant preservation)

## 5.2 Mission-critical data and compaction rules

Mission metadata MUST survive compaction. Without this, resumability breaks. Active mission state is accessed via `toolUseContext.getAppState().activeMission` (see Section 4.3 for the complete runtime state ownership model). Strategy:

1. **Mission state summary is injected as a post-compact attachment** (same pattern as plan/skill/MCP attachments in `compactConversation`):
   - Add `createMissionAttachmentIfNeeded(mission, toolUseContext)` to `compact.ts` post-compact attachment block alongside existing `createPlanAttachmentIfNeeded`, `createSkillAttachmentIfNeeded`
   - This function produces a system message containing active mission ID, current state, step summary, and checkpoint reference

2. **Verification and risk audit records are NOT injected post-compact** (they are historical evidence, not active context):
   - These persist in sidecar artifact files (Section 8) and are queryable but not re-injected
   - Only the latest verification summary and confidence score are part of the mission attachment

3. **Compaction-aware mission metadata markers**:
   - Add optional `missionId?: MissionId` field to `CompactionResult` type
   - `buildPostCompactMessages` checks for active mission and includes mission attachment when present
   - This is purely additive to the existing `CompactionResult` type

4. **`sessionMemoryCompact` integration**:
   - `calculateMessagesToKeepIndex` needs no change — it preserves recent messages by token count
   - Active mission context is restored via the same post-compact attachment mechanism
   - If mission state is large, `truncateSessionMemoryForCompact` should include mission summary in the memory content

5. **Snip integration**:
   - Snip removes older history but active mission context is preserved because it is injected as a post-compact/post-snip attachment, not stored in the message history being snipped

## 5.3 Implementation insertion points

```
services/compact/compact.ts:
  - In buildPostCompactMessages: add createMissionAttachmentIfNeeded call
  - Mission state accessed via toolUseContext.getAppState().activeMission (Section 4.3)
  - In CompactionResult type: add optional missionId field

services/mission/missionContext.ts:
  - Export createMissionAttachmentIfNeeded(activeMission, toolUseContext)
  - Export getMissionContextForSystemPrompt(activeMission) for system prompt injection

query.ts (system prompt assembly):
  - Read activeMission from appState before getSystemPrompt call
  - Pass missionContext to getSystemPrompt as optional parameter (Section 4.3.4)
```

## 6) Hook System Integration

## 6.1 Current hook events (code-grounded, from `entrypoints/sdk/coreTypes.ts`)

Existing 27 `HookEvent` values:

`PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `Notification`, `UserPromptSubmit`, `SessionStart`, `SessionEnd`, `Stop`, `StopFailure`, `SubagentStart`, `SubagentStop`, `PreCompact`, `PostCompact`, `PermissionRequest`, `PermissionDenied`, `Setup`, `TeammateIdle`, `TaskCreated`, `TaskCompleted`, `Elicitation`, `ElicitationResult`, `ConfigChange`, `WorktreeCreate`, `WorktreeRemove`, `InstructionsLoaded`, `CwdChanged`, `FileChanged`

## 6.2 New hook events for A-F enhancements

Add to `HOOK_EVENTS` array in `entrypoints/sdk/coreTypes.ts`:

```typescript
// Mission Engine (A) hooks
'MissionCreated',      // fired when a new mission is created
'MissionStateChanged', // fired on every mission state transition
'MissionCompleted',    // fired when mission reaches completed state
'MissionAborted',      // fired when mission is aborted or rolled back

// Verification (B) hooks
'VerificationStarted',   // fired when verification bundle begins execution
'VerificationCompleted', // fired when verification bundle completes (pass or fail)

// Risk Policy (C) hooks
'RiskPolicyEvaluated',   // fired after risk engine produces a decision
'RiskApprovalRequired',  // fired when R2/R3 decision requires user interaction

// Multi-Agent (F) hooks
'ContractValidated',     // fired after coordinator validates subagent output
'ArbitrationTriggered',  // fired when conflicting outputs require arbitration
```

## 6.3 Hook execution order with risk policy engine

The risk policy engine integrates with existing `PreToolUse` hooks, not as a separate hook:

1. `executePreToolHooks` runs (existing behavior)
2. If hooks do not deny, risk policy engine evaluates the action
3. Risk engine output determines approval mode (`auto` / `scoped_ask` / `explicit_ask`)
4. Existing permission UX handles the approval mode
5. Tool executes
6. `executePostToolHooks` runs (existing behavior)
7. If within a mission, `MissionStateChanged` or mission-related hooks fire

Integration point in `services/tools/toolExecution.ts`:

- Risk engine evaluation is called AFTER `runPreToolUseHooks` returns (so hooks can modify input first)
- Risk engine evaluation runs BEFORE `resolveHookPermissionDecision` (line ~921) is called — risk is NOT a parameter to that function. Instead, risk engine output is translated into the appropriate mode-specific permission flow (REPL flag, SDK fields, or remote metadata) that then feeds into the existing permission resolution (see Section 10.3 and Section 12.4 for the authoritative integration design)
- Risk engine cannot weaken a hook-based denial (hooks deny => denied regardless of risk engine)

## 6.4 Registration pattern — all required modification sites

Adding a new hook event is NOT a single-site change. The following 5 files must all be updated in lockstep for new events to validate end-to-end. Missing any one site will cause silent failures (events not dispatched, plugin hooks not registered, SDK schemas rejecting new event names).

**Site 1: `entrypoints/sdk/coreTypes.ts` — `HOOK_EVENTS` array (line ~25)**

Add the new event string literals to the `HOOK_EVENTS` array. This is the canonical source of hook event names used for runtime type narrowing.

**Site 2: `entrypoints/sdk/coreSchemas.ts` — `HOOK_EVENTS` array (line ~355)**

This file has a **separate copy** of the `HOOK_EVENTS` array used by the SDK schema layer. It MUST be kept in sync with `coreTypes.ts`. This is the array that feeds `HookEventSchema` at line ~385.

**Site 3: `entrypoints/sdk/coreSchemas.ts` — `HookInputSchema` union (line ~767)**

The `HookInputSchema` is a `z.union([...])` that **explicitly enumerates** every hook input schema variant. Each new hook event requires a corresponding `*HookInputSchema()` entry in this union. Without this, Zod validation will reject hook inputs for the new events, breaking plugin hook dispatch and SDK hook registration.

For each new event, define a corresponding schema:

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
// ... repeat for each new hook event
```

Then add each schema to the `HookInputSchema` union.

**Site 4: `types/hooks.ts` — hook response types (line ~49)**

If any new hook events have event-specific response handling (beyond the base `syncHookResponseSchema`), add event-specific output schema variants here. For A-F hooks, the base `syncHookResponseSchema` with `continue`, `decision`, `reason`, `systemMessage` fields is sufficient — no new response types are needed.

**Site 5: `utils/plugins/loadPluginHooks.ts` — `convertPluginHooksToMatchers` (line ~31)**

This function constructs a hardcoded `Record<HookEvent, PluginHookMatcher[]>` object literal (lines ~32-58). Every key in this literal MUST include the new hook events, initialized to `[]`. Without this, plugin hooks for new events will fail to register because the record won't have the new key, and `pluginMatchers[hookEvent]` at line ~68 will return `undefined`, skipping the event.

Add to the record literal:

```typescript
MissionCreated: [],
MissionStateChanged: [],
MissionCompleted: [],
MissionAborted: [],
VerificationStarted: [],
VerificationCompleted: [],
RiskPolicyEvaluated: [],
RiskApprovalRequired: [],
ContractValidated: [],
ArbitrationTriggered: [],
```

**Implementation rule**: All 5 sites must be updated in a single atomic commit. A CI check should assert `HOOK_EVENTS.length` matches the `HookInputSchema` union member count and the `convertPluginHooksToMatchers` record key count. This assertion should be added as part of the Phase-0 baseline harness.

## 6.5 Hook input types for new events

Add to `types/hooks.ts`:

```typescript
export type MissionHookInput = {
  missionId: string
  state: string
  previousState?: string
  objective: string
  correlationId: string
}

export type VerificationHookInput = {
  verificationId: string
  missionId?: string
  checks: Array<{ checkType: string; status: string }>
  verdict?: string
  confidence?: number
}

export type RiskPolicyHookInput = {
  decisionId: string
  toolName: string
  riskClass: string
  decisionMode: string
  policyReasons: string[]
}

export type ContractHookInput = {
  contractId: string
  agentType: string
  validationStatus: string
  mergeEligible: boolean
  arbitrationTriggered: boolean
}
```

## 7) Feature Flag Strategy

## 7.1 Flag system overview (code-grounded)

The codebase uses two complementary systems:

1. **Build-time `feature()` macro** from `bun:bundle`: evaluates at bundle time, enables dead code elimination. Must stay inline at use sites. Used for code paths that should not exist in certain build flavors.

2. **Runtime GrowthBook flags** via `services/analytics/growthbook.ts`: checked via `getFeatureValue_CACHED_MAY_BE_STALE`, `getFeatureValue_CACHED_WITH_REFRESH`, `checkGate_CACHED_OR_BLOCKING`. Used for dynamic toggling without rebuilds.

3. **Canonical combined pattern** (from `bridge/bridgeEnabled.ts`, `voice/voiceModeEnabled.ts`):

```typescript
import { feature } from 'bun:bundle'
export function isMyFeatureEnabled(): boolean {
  return feature('MY_FEATURE')
    ? getFeatureValue_CACHED_MAY_BE_STALE('tengu_my_feature_key', false)
    : false
}
```

## 7.2 Flag assignments for A-F enhancements

| Enhancement | Build-time Flag | GrowthBook Key | `*Enabled.ts` File | Rationale |
|---|---|---|---|---|
| A Mission Engine | `MISSION_ENGINE` | `tengu_mission_engine` | `services/mission/missionEnabled.ts` | needs DCE for builds without mission; needs runtime toggle for phased rollout |
| B Verification | `VERIFICATION_RUNTIME` | `tengu_verification_runtime` | `services/verification/verificationEnabled.ts` | same rationale |
| C Risk Policy | `RISK_POLICY_ENGINE` | `tengu_risk_policy` | `services/riskPolicy/riskPolicyEnabled.ts` | same rationale |
| D Cost Planner | `COST_PLANNER` | `tengu_cost_planner` | `services/costPlanner/costPlannerEnabled.ts` | same rationale |
| E Memory Graph | `MEMORY_GRAPH` | `tengu_memory_graph` | `services/memoryGraph/memoryGraphEnabled.ts` | same rationale |
| F Agent Governance | `AGENT_GOVERNANCE` | `tengu_agent_governance` | `services/agentGovernance/agentGovernanceEnabled.ts` | same rationale |

## 7.3 Feature flag gate implementation pattern

Each `*Enabled.ts` follows:

```typescript
// services/mission/missionEnabled.ts
import { feature } from 'bun:bundle'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../../services/analytics/growthbook.js'

export function isMissionEngineEnabled(): boolean {
  return feature('MISSION_ENGINE')
    ? getFeatureValue_CACHED_MAY_BE_STALE('tengu_mission_engine', false)
    : false
}
```

## 7.4 Call site patterns

- **Import gating** (for heavy modules that should be tree-shaken):
  ```typescript
  if (feature('MISSION_ENGINE') && isMissionEngineEnabled()) {
    const { MissionService } = await import('./services/mission/index.js')
    // ...
  }
  ```

- **Inline behavioral gating** (for lightweight checks):
  ```typescript
  if (isMissionEngineEnabled()) {
    missionService.transitionState(missionId, 'verifying')
  }
  ```

- **UI visibility gating** (in components):
  ```typescript
  {feature('MISSION_ENGINE') && isMissionEngineEnabled() && (
    <MissionStatusIndicator mission={activeMission} />
  )}
  ```

## 8) Persistence Format Specification

## 8.1 Current persistence model (code-grounded)

From `utils/sessionStorage.ts` and `types/logs.ts`:

- **Format**: append-only JSONL, one JSON object per line
- **File path**: `${sessionId}.jsonl` under project directory; agent sidechains use `agent-${agentId}.jsonl`
- **Entry union type** (`Entry` in `types/logs.ts`): discriminated by `type` field — includes `TranscriptMessage`, `SummaryMessage`, `FileHistorySnapshotMessage`, `AttributionSnapshotMessage`, `QueueOperationMessage`, `ContentReplacementEntry`, `ContextCollapseCommitEntry`, etc.
- **Read guard**: `MAX_TRANSCRIPT_READ_BYTES = 50 * 1024 * 1024` (50MB)

## 8.2 Enhancement artifact persistence strategy

**Primary rule**: mission and verification artifacts are stored as **new entry types in the existing JSONL transcript stream**, following the `Entry` union discriminator pattern.

**CRITICAL**: Adding new entry types to the `Entry` union in `types/logs.ts` is **necessary but NOT sufficient**. The transcript loading path in `utils/sessionStorage.ts` function `loadTranscriptFile` (line ~3625) uses an **explicit `else-if` chain** over `entry.type` values. New entry types that are not handled in this chain will be silently ignored during transcript loading — they will be written to the JSONL file but never indexed or retrievable by any read path.

**Three-site persistence contract** — all must be updated together:

1. **`types/logs.ts` — `Entry` union (line ~297)**: Add new entry type to the discriminated union. This enables TypeScript type safety.

2. **`utils/sessionStorage.ts` — `loadTranscriptFile` else-if chain (line ~3625)**: Add `else if` branches for each new entry type. Each branch must index the entry into appropriate storage structures. For example:

   ```typescript
   } else if (entry.type === 'mission_state') {
     missionStates.set(entry.missionId, entry)
   } else if (entry.type === 'mission_evidence') {
     missionEvidence.push(entry)
   } else if (entry.type === 'verification_result') {
     verificationResults.push(entry)
   } else if (entry.type === 'risk_decision') {
     riskDecisions.push(entry)
   } else if (entry.type === 'cost_decision') {
     costDecisions.set(entry.decisionId, entry)
   } else if (entry.type === 'contract_validation') {
     contractValidations.push(entry)
   }
   ```

   Every entry type in the `Entry` union (Section 8.3) MUST have a corresponding else-if branch. Missing any one type causes silent data loss on transcript read.

3. **`utils/sessionStorage.ts` — return value of `loadTranscriptFile`**: The function's return object must be extended with new collections (e.g., `missionStates`, `verificationResults`, `riskDecisions`) so callers can access the indexed data. Callers include `SessionStorage.loadSessionData`, resume flows, and the `/context` command stats.

**Secondary rule**: large audit/evidence artifacts that would bloat the transcript (e.g., full risk audit logs, reuse cache indices) go in **sidecar files** alongside the transcript. Sidecar files use naming convention `${sessionId}.mission-audit.jsonl` and `${sessionId}.verification-evidence.jsonl`. These are NOT loaded by `loadTranscriptFile` — they have their own dedicated read functions in `services/mission/` and `services/verification/`.

**Backward compatibility**: old transcripts without the new entry types will load correctly — the else-if chain simply won't match, and the new collections will be empty. No migration is needed. The `isTranscriptMessage` function (line ~139) is NOT affected — new entries are metadata, not conversation messages, and must NOT be added to `isTranscriptMessage` (they don't participate in the message chain).

## 8.3 New `Entry` types for `types/logs.ts`

Add to the `Entry` union:

```typescript
// Mission entries
export type MissionStateEntry = {
  type: 'mission_state'
  missionId: string
  state: string
  previousState: string
  timestamp: string
  correlationId: string
  checkpointIndex: number
  summary: string
}

export type MissionEvidenceEntry = {
  type: 'mission_evidence'
  missionId: string
  stepId: string
  evidenceType: 'tool_result' | 'test_result' | 'file_change' | 'verification'
  evidenceRef: string
  timestamp: string
}

// Verification entries
export type VerificationResultEntry = {
  type: 'verification_result'
  verificationId: string
  missionId?: string
  verdict: string
  confidence: number
  checkCount: number
  passCount: number
  failCount: number
  timestamp: string
}

// Risk policy entries
export type RiskDecisionEntry = {
  type: 'risk_decision'
  decisionId: string
  toolName: string
  riskClass: string
  decisionMode: string
  approvalOutcome: string
  timestamp: string
}
```

Update `Entry` union:

```typescript
export type Entry =
  | TranscriptMessage
  | SummaryMessage
  // ... existing types ...
  | MissionStateEntry
  | MissionEvidenceEntry
  | VerificationResultEntry
  | RiskDecisionEntry
```

## 8.4 Sidecar artifact files

For large audit trails that should not bloat the transcript:

| Artifact | File Pattern | Format | Purpose |
|---|---|---|---|
| Risk audit log | `${sessionId}.risk-audit.jsonl` | JSONL | Full `RiskAuditRecord` entries with factors and rationale |
| Verification proof bundle | `${sessionId}.verification-proofs.jsonl` | JSONL | Full `ProofArtifact` with all check details |
| Cost plan history | `${sessionId}.cost-plans.jsonl` | JSONL | `PreflightPlan` snapshots and `AdaptationEvent` records |
| Memory graph snapshot | `${projectRoot}/.claude/memory-graph.json` | JSON | Persistent memory graph state (project-scoped, not session-scoped) |

Storage directory: same directory as session transcript files. Memory graph uses project-level `.claude/` directory following existing memory file patterns (`memdir/memdir.ts` uses `.claude/memory/`).

## 8.5 Interaction with 50MB transcript guard

- `MAX_TRANSCRIPT_READ_BYTES` applies to transcript load path; new entry types are lightweight summary records (not full evidence blobs)
- Full evidence data lives in sidecar files which have their own read paths
- Estimated per-session transcript size increase from new entries: ~50-200KB for typical missions (negligible relative to 50MB guard)

## 9) API Layer Interaction

## 9.1 System prompt injection (code-grounded)

From `services/api/claude.ts`:

- System prompt is a branded `SystemPrompt` (readonly `string[]`)
- `buildSystemPromptBlocks` converts to `TextBlockParam[]` with optional `cache_control`
- `splitSysPromptPrefix` assigns `cacheScope` (`null`, `'org'`, `'global'`) to different segments

Mission context injection strategy (active mission accessed via `appState.activeMission` — see Section 4.3 for runtime state ownership):

1. **Mission context is injected as an additional segment in the system prompt array** using `getMissionContextForSystemPrompt(mission)` from `services/mission/missionContext.ts`
2. Injection point: AFTER the main system prompt, BEFORE any advisor/chrome sections (preserves existing prompt cache boundaries)
3. Mission context segment receives `cacheScope: null` (dynamic per-mission, should not be cached across sessions)
4. Content includes: active mission objective, current state, step summary, active constraints, and risk policy reference
5. This segment is only included when `isMissionEngineEnabled()` returns true and an active mission exists

## 9.2 Beta header and prompt cache impact

- No new beta headers required for A-F enhancements (these are internal runtime capabilities, not API features)
- Prompt cache impact is minimized by placing mission context AFTER the static system prompt segments (static segments remain cache-eligible)
- Existing `lastAPIRequest` and `lastAPIRequestMessages` tracking in `bootstrap/state.ts` does not need mission-specific changes — mission metadata flows through the standard message/system-prompt path

## 9.3 ThinkingConfig and speed parameter interaction

- No changes to `ThinkingConfig` type or behavior
- Cost planner (D) influences model selection and `speed` parameter but does NOT modify thinking config — those are separate concerns
- Phase-aware strategy from cost planner translates to model tier selection, which maps to existing model routing in `services/api/claude.ts` without modifying the API call structure

## 10) UI/TUI Integration Strategy

## 10.1 Current UI patterns (code-grounded)

From `components/` analysis:

- **Status display**: `components/StatusLine.tsx` shows model, permission mode, cwd
- **Progress**: `SpinnerMode` type from `components/Spinner/types.ts`, set via `setStreamMode` in `screens/REPL.tsx`
- **Notifications**: `useNotifications()` from `context/notifications.tsx` providing `addNotification` with `TextNotification | JSXNotification`
- **Permissions**: `components/permissions/PermissionRequest.tsx` with `permissionComponentForTool` mapping tools to specific permission UI components
- **Background tasks**: `components/tasks/BackgroundTask.tsx`, `BackgroundTaskStatus.tsx` (footer pill), `BackgroundTasksDialog.tsx` (Shift+Down dialog)

## 10.2 New UI components for A-F

Following existing component organization (`components/<feature>/`):

| Component | Location | Purpose | Pattern |
|---|---|---|---|
| `MissionStatusIndicator` | `components/mission/MissionStatusIndicator.tsx` | Show active mission state in status line | Extends `StatusLine.tsx` pattern |
| `MissionProgressPanel` | `components/mission/MissionProgressPanel.tsx` | Mission step progress (in Shift+Down dialog) | Extends `BackgroundTasksDialog` pattern |
| `VerificationProgress` | `components/verification/VerificationProgress.tsx` | Check execution progress during verification phase | Spinner + check list using `SpinnerMode` pattern |
| `ConfidenceDisplay` | `components/verification/ConfidenceDisplay.tsx` | Show confidence score and uncertainty reasons in output | Inline message component |
| `RiskApprovalPrompt` | `components/permissions/RiskApprovalPrompt.tsx` | Risk-class-aware approval dialog for R2/R3 actions | Extends existing `PermissionRequest` pattern |
| `CostBandSelector` | `components/mission/CostBandSelector.tsx` | Preflight cost band selection UI | Notification-based selection (like existing model picker) |

## 10.3 Integration approach

1. **Mission status in StatusLine**: add mission indicator when active mission exists, gated by `feature('MISSION_ENGINE') && isMissionEngineEnabled()`

2. **Risk approval — multi-mode permission design**: Risk approval CANNOT simply "plug into" `permissionComponentForTool`. The existing permission architecture has **three distinct modes** that all must be addressed:

   **Mode A: REPL (interactive terminal)**
   - `permissionComponentForTool` in `components/permissions/PermissionRequest.tsx` (line ~47) dispatches by **tool object identity** (switch on the tool reference, not a string name). Risk approval is NOT tool-specific — it applies to any tool based on risk classification.
   - Solution: Risk approval is injected as a **wrapper layer** around the existing permission flow, not as a tool-specific component. In `services/tools/toolExecution.ts`, after pre-tool hooks and before the existing `canUseTool` call, the risk engine evaluates the action. If the risk engine requires explicit approval (`decisionMode: 'explicit_ask'`), it sets a `riskApprovalRequired` flag on the permission context. The existing `PermissionRequest.tsx` renders `RiskApprovalPrompt` as an **additional section** within the existing permission dialog (below the tool-specific content, above the action buttons) when this flag is present. This means the risk information is shown **alongside** the normal tool permission prompt, not as a separate dialog.

   **Mode B: Headless/SDK (non-interactive)**
   - `cli/structuredIO.ts` (line ~561) handles permission requests via `canUseTool` which returns `PermissionResult` to the SDK host. The SDK host (e.g., VS Code extension) shows its own UI.
   - Solution: When risk engine requires approval, the `PermissionResult` returned to the SDK host includes additional fields: `riskClass`, `riskFactors`, `riskRationale`. The existing SDK protocol's `can_use_tool` request type is extended with these optional fields. SDK hosts that don't understand risk fields treat it as a normal permission prompt. SDK hosts that do understand risk fields can render risk-aware UI.
   - For fully non-interactive SDK mode (`permissionMode: 'acceptEdits'` or similar), risk policy is enforced server-side: R1 auto-approves, R2 follows the permission mode's existing rules, R3 always blocks with an error result (safety critical — cannot be silently auto-approved even in accept-all mode).

   **Mode C: Remote (CCR/bridge)**
   - `remote/RemoteSessionManager.ts` (line ~189) handles `can_use_tool` control requests via WebSocket. Permission requests are forwarded to the remote client.
   - Solution: The `SDKControlRequest` for `can_use_tool` is extended with optional `risk_class`, `risk_factors`, `risk_rationale` fields. The remote client receives these and can display risk-aware UI. If the remote client doesn't understand risk fields, it falls back to normal permission display. R3 blocking behavior in non-interactive remote sessions follows the same rule as Mode B.

   **All modes share the same risk engine call site**: `services/tools/toolExecution.ts`, in the permission resolution flow, AFTER hooks and BEFORE the mode-specific permission prompt. The risk engine produces a `RiskDecision` which is then translated into the appropriate mode-specific representation.

3. **Verification progress**: uses existing `SpinnerMode` mechanism — add `'verifying'` to `SpinnerMode` type and set it via `setStreamMode` when verification bundle executes

4. **Cost band selection**: presented as a notification via `addNotification` with action buttons (cheap/balanced/thorough), consistent with existing interactive notification patterns. In SDK/headless mode, cost band is passed as a parameter in the initial prompt or `QueryEngineConfig`. In remote mode, cost band selection uses the existing elicitation flow.

5. **Mission progress in background tasks**: `MissionProgressPanel` is added to `BackgroundTasksDialog` as a new task type display, following the `DreamDetailDialog` pattern

## 10.4 Screen real estate and information density

- Mission indicator in `StatusLine` is a single compact badge (e.g., `[M: executing 3/5]`)
- Verification and confidence output appears inline with the assistant's completion message, not as a separate panel
- Risk approval renders within the existing permission prompt area — it adds risk context to the existing tool permission dialog, not a separate modal
- No new full-screen views are introduced in Phase 1-2 rollout

## 11) Plugin, Skill, and MCP Tool Interaction

## 11.1 Plugin commands and mission lifecycle

- Plugin commands continue to work as-is within missions — they are executed as mission steps when a mission is active
- Plugin hooks registered via `loadPluginHooks.ts` automatically participate in new hook events (e.g., `MissionStateChanged`) if they register for them
- No plugin API changes required — new hook events are additive string values in `HOOK_EVENTS`

## 11.2 Skills and verification requirements

- Skills can declare verification requirements by including `verificationPolicy` metadata in their skill definition
- During mission execution, skill-provided verification policies merge with mission-level policies using the more restrictive rule
- Skills that do not declare verification requirements inherit the mission's default policy
- This is purely additive to the existing skill loading mechanism in `skills/loadSkillsDir.ts`

## 11.3 MCP tools and risk policy engine

- MCP tools from external servers pass through the risk policy engine like any other tool
- The risk engine treats MCP tools with higher default `dataSensitivity` and `blastRadius` scores because they execute on external servers with less visibility
- MCP tool risk evaluation uses existing `MCPServerConnection` status and config to inform scoring
- MCP tools with `needs-auth` status are automatically classified as `R2` minimum
- This integrates with existing `filterToolsByDenyRules` — risk engine is a complementary layer, not a replacement for deny rules

## 11.4 DreamTaskState interaction

- `DreamTaskState` (auto-dream memory consolidation) runs as a background task with its own lifecycle
- Dreams that fire during an active mission respect the mission's risk policy (dream-initiated file changes go through the risk engine)
- Dream consolidation results can feed into the memory graph (E) as `tool_outcome` nodes with evidence links
- No changes to `DreamTask.ts` implementation required — dream tasks continue operating independently, and memory graph captures their outputs passively

## 12) Cross-Enhancement Dependency Integration Points

## 12.1 A -> B (Mission -> Verification)

- Mission `verifying` state transition triggers `VerificationEngine.runChecks(mission.successCriteria)`
- Mission cannot transition to `completed` without verification pass or explicit waiver
- Integration point: `services/mission/stateMachine.ts` calls `services/verification/index.ts`

## 12.2 A -> C (Mission -> Risk Policy)

- Each mission step's tool calls route through risk policy engine
- Mission-level risk policy reference is passed to risk engine for context-aware scoring
- Integration point: `services/mission/index.ts` provides `riskPolicyRef` to tool execution context

## 12.3 B -> A (Verification -> Mission)

- Verification results update mission's `verificationSummary` and `confidenceSummary`
- Integration point: `services/verification/index.ts` returns `VerificationSummary` to mission service

## 12.4 C -> existing permissions (Risk Policy -> Permission System)

- Risk engine evaluation runs BEFORE `resolveHookPermissionDecision` is called — it is NOT an input parameter to that function. The live `resolveHookPermissionDecision` signature (`toolHooks.ts` line ~332) accepts `hookPermissionResult`, `tool`, `input`, `toolUseContext`, `canUseTool`, `assistantMessage`, `toolUseID` — no risk input exists there.
- The risk engine call site is in `services/tools/toolExecution.ts`, positioned AFTER pre-tool hooks and BEFORE the `resolveHookPermissionDecision` call (line ~921). The risk engine translates its `decisionMode` into the appropriate mode-specific permission flow:
  - **REPL**: sets `riskApprovalRequired` flag on the permission context, rendered by `RiskApprovalPrompt` within the existing permission dialog
  - **SDK/headless**: extends `PermissionResult` with optional `riskClass`, `riskFactors`, `riskRationale` fields
  - **Remote/CCR**: extends `SDKControlRequest` `can_use_tool` with optional risk metadata fields
- Hook denials always win over risk engine approvals (strictest-wins principle) — if hooks deny, risk evaluation outcome is ignored regardless of risk class
- If risk engine requires `explicit_ask` but hooks already approved, the risk engine's higher-friction approval requirement takes precedence (strictest-wins in both directions)
- See Section 10.3 for the authoritative multi-mode permission integration design

## 12.5 D -> A (Cost Planner -> Mission)

- Cost planner produces `PreflightPlan` during mission `planned` state
- Mission `budgetPolicy` is informed by selected cost band
- Integration point: `services/costPlanner/index.ts` called during mission planning phase

## 12.6 E -> A, B (Memory Graph -> Mission, Verification)

- Memory graph provides context during mission planning (relevant past decisions, constraints)
- Verification evidence links are stored as memory graph evidence refs
- Integration point: `services/memoryGraph/index.ts` queried during mission context assembly

## 12.7 F -> A, B, C (Agent Governance -> Mission, Verification, Risk)

- Subagent contracts reference parent mission and inherit its risk policy
- Subagent outputs must pass verification before merge into parent context
- Risk engine evaluates subagent tool calls using the contract's `riskPolicyRef`
- Integration point: `services/agentGovernance/index.ts` coordinates with mission, verification, and risk services

## 13) Bounded-Risk Constraints

Inherited unknowns:

- `U-001` generated SDK control type artifacts unavailable
- `U-002` CI/build/deploy manifests unavailable

Rules for this document:

1. Type definitions and module placement are valid for architecture and implementation now.
2. Build-time feature flag names (`MISSION_ENGINE`, etc.) require bundle configuration not visible in this slice (`bounded-risk`).
3. GrowthBook feature key registration requires access to GrowthBook dashboard not visible in this slice (`bounded-risk`).
4. `HookEvent` array extension requires coordination with SDK type generation (`bounded-risk`, linked to `U-001`).

## 14) Initial Decision Log Entries

| Decision ID | Date (UTC) | Owner | Context / Problem | Options Considered | Chosen Option | Rationale | Compatibility Impact | Risk Class (`R1/R2/R3`) | Verification Plan | Rollback Plan | Evidence Links | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DEC-11-001 | 2026-03-31 | Implementation spec owner | Need concrete type definitions before coding to prevent structural ambiguity | ad-hoc types per developer; centralized type spec with codebase pattern conformance | centralized type spec with codebase pattern conformance | reduces structural drift and ensures consistency with existing 800+ file codebase | additive-only; new files, no existing type modification | R1 | type compilation checks + import resolution tests | remove new type files and revert imports | `types/command.ts`, `types/hooks.ts`, `types/logs.ts` (pattern evidence) | approved |
| DEC-11-002 | 2026-03-31 | Implementation spec owner | Need compaction-safe mission context to prevent resumability failures | ignore compaction; protect all mission data from compaction; post-compact attachment injection | post-compact attachment injection | follows proven pattern (plan/skill/MCP attachments), minimal compaction system changes | additive to `buildPostCompactMessages` | R2 | compaction + resume tests with active missions | remove mission attachment function call from compact.ts | `services/compact/compact.ts` (pattern evidence) | approved |
| DEC-11-003 | 2026-03-31 | Implementation spec owner | Need feature flag strategy matching existing dual-flag system | runtime-only flags; build-only flags; dual build+runtime following existing pattern | dual build+runtime following existing pattern | preserves DCE benefits while enabling live toggling | no existing flag behavior changes | R1 | flag gate behavior tests + DCE verification | disable runtime flag to deactivate feature | `bridge/bridgeEnabled.ts`, `voice/voiceModeEnabled.ts` (pattern evidence) | approved |
| DEC-11-004 | 2026-03-31 | Implementation spec owner | Need persistence format for new artifacts | separate files per artifact; new JSONL transcript entry types + sidecar files | new JSONL transcript entry types + sidecar files | lightweight summaries in transcript (existing pattern), large evidence in sidecars | 3-site change required: `Entry` union in `types/logs.ts`, `loadTranscriptFile` else-if chain in `utils/sessionStorage.ts`, and return value extension (see Section 8.2); old transcripts without new types load correctly (backward compatible) | R2 | transcript load/scan tests with new entry types; verify old transcripts load unchanged; verify new entries are indexed and retrievable | remove new entry types from Entry union and corresponding else-if branches | `types/logs.ts` Entry union pattern, `utils/sessionStorage.ts` loadTranscriptFile | approved |
| DEC-11-005 | 2026-03-31 | Implementation spec owner | Need risk engine integration without breaking existing permission UX | replace permission system; add risk engine as additional signal source | risk engine as additional signal source with strictest-wins | preserves all existing permission behavior; risk engine adds capability without removing any | additive integration in toolExecution.ts | R2 | permission behavior parity tests across modes | disable risk engine flag; existing permission path unaffected | `services/tools/toolExecution.ts`, `hooks/toolPermission/PermissionContext.ts` | approved |

## 15) Definition of Done for This Document

`11` is complete when all are true:

1. TypeScript type definitions for all A-F enhancements are concrete and codebase-pattern-conformant.
2. Module placement plan specifies exact directory paths following existing conventions.
3. Compaction system integration is explicit with preservation strategy and insertion points.
4. Hook system extension is explicit with new events, execution order, and input types.
5. Feature flag assignments use dual build+runtime pattern with specific flag names.
6. API layer interaction is explicit with system prompt injection and cache impact.
7. Persistence format is specified with new Entry types and sidecar file patterns.
8. UI/TUI integration strategy specifies components, locations, and existing pattern conformance.
9. Plugin/skill/MCP tool and DreamTaskState interactions are addressed.
10. Cross-enhancement dependency integration points are explicitly mapped.

---

This file is the authoritative implementation integration specification for production code development.
