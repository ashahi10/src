# RFC: Multi-Agent Contract Framework

Status: Proposed (implementation-ready spec)  
Owner: Agent Orchestration / Governance  
Target Phase: Phase 3  
Related: F (Multi-Agent Contract Framework), G-006

## 1) Objective

Introduce a formal contract and governance framework for subagent execution so delegated work is safe, verifiable, and mergeable without degrading existing runtime guarantees.

## 2) Problem Statement

Current multi-agent/task capabilities are strong but lack a universal formal contract for:

- subagent I/O expectations
- allowed tool and budget boundaries
- acceptance-test requirements
- disagreement arbitration
- merge gating for unvalidated outputs

This increases risk of inconsistent delegated outputs and hidden quality drift.

## 3) Non-Goals

- replacing existing task and agent tooling from scratch
- removing non-contract mode immediately
- forcing heavy contracts for trivial local actions in early phases

## 4) Existing System Anchors

Primary anchors:

- agent tooling: `tools/AgentTool/*`
- task model and framework: `tasks/*`, `utils/task/framework.ts`, `tasks/stopTask.ts`
- permission/policy surfaces: `hooks/toolPermission/PermissionContext.ts`, policy services
- verification and confidence outputs from B-layer integration

## 5) Functional Requirements

1. Every contract-mode subagent run must declare:
   - input schema
   - output schema
   - budget constraints
   - allowed tool set
   - acceptance tests
2. Coordinator must validate outputs before merge into primary context.
3. Unvalidated outputs must be non-mergeable by default.
4. Arbitration policy must handle conflicting outputs deterministically.
5. Contract and arbitration results must be auditable.

## 6) Contract Model

## 6.1 Subagent contract schema (logical)

- `contractId`
- `agentType`
- `objectiveScope`
- `inputSchemaRef`
- `outputSchemaRef`
- `toolAllowlist`
- `budgetPolicy`
- `acceptanceTests[]`
- `riskPolicyRef`
- `timeoutPolicy`

## 6.2 Execution result schema

- `contractId`
- `executionStatus`
- `outputPayload`
- `validationStatus`
- `acceptanceResults[]`
- `confidenceSummary`
- `uncertaintySummary`
- `evidenceRefs[]`

## 6.3 Merge eligibility

Merge eligible only when:

1. contract validation passes
2. acceptance tests pass or approved waiver exists
3. risk policy constraints are respected

## 7) Coordinator Validation Pipeline

Pipeline stages:

1. contract compile/validate
2. execution monitoring
3. output schema validation
4. acceptance test evaluation
5. merge decision
6. audit record emission

Coordinator behaviors:

- hard block on schema mismatch
- hard block on prohibited tool usage
- soft/hard block per acceptance policy profile

## 8) Arbitration Policy

When outputs disagree:

1. evaluate verification strength
2. evaluate confidence and uncertainty reasons
3. apply policy weighting:
   - verification strength (highest weight)
   - confidence quality (secondary)
   - recency/context relevance (tertiary)

If tie persists:

- escalate to explicit human-governed resolution path.

Arbitration output must include rationale trace.

## 9) Integration Strategy

Integration principles:

1. add contract mode on top of existing agent/task infrastructure
2. preserve current behavior for non-contract mode during rollout
3. keep policy and permission boundaries intact
4. keep output envelopes additive

## 10) Safety and Security Controls

1. subagent cannot exceed declared tool/budget boundaries
2. high-risk delegated actions still require central risk policy decisions
3. coordinator must prevent silent merge of unverified outputs
4. all contract and merge decisions require audit events

## 11) Failure Modes and Recovery

1. contract parsing/validation failure
2. acceptance test infrastructure failure
3. arbitration deadlock
4. coordinator failure during merge decision

Recovery:

- fail closed for merge decisions
- return explicit non-mergeable status
- support retry with corrected contract/input
- preserve evidence for incident analysis

## 12) Observability and Audit Requirements

Required signals:

- contract pass/fail rates
- acceptance test pass/fail rates
- non-mergeable output counts and reasons
- arbitration event counts and outcomes
- delegated risk-policy violations

Audit requirements:

- contract ID links from request through merge decision
- rationale for each blocked or merged output

## 13) Rollout Strategy

1. shadow contract validation (observe only)
2. advisory mode (non-blocking merge advisories)
3. enforcement mode for selected cohorts/use-cases
4. broader default-on after quality and safety thresholds stabilize

Controls:

- feature flags
- ringed rollout
- kill switch to non-contract path

## 14) Validation Requirements

Must validate:

- contract schema enforcement
- tool/budget boundary enforcement
- acceptance test correctness
- arbitration determinism
- compatibility with existing task lifecycle and remote modes

## 15) Risks and Mitigations

1. **Excessive strictness reducing throughput**
   - Mitigation: profile-based contracts and phased enforcement
2. **Contract quality variance**
   - Mitigation: RFC-quality templates and validation linting
3. **Arbitration opacity**
   - Mitigation: required rationale traces and audit records
4. **Coordinator bottleneck risk**
   - Mitigation: bounded pipeline SLAs and fallback escalation paths

## 16) Bounded-Risk Constraints

Any unresolved dependency involving `U-001`/`U-002` must remain `bounded-risk` and blocks final launch sign-off where applicable.

## 17) Acceptance Criteria

1. contract schema and validation pipeline are approved
2. merge eligibility rules are explicit and enforced
3. arbitration policy is deterministic and auditable
4. compatibility and mode-parity validation are complete
5. rollout and rollback controls are explicit

## 18) Decision Log Entry

| Decision ID | Date (UTC) | Owner | Context / Problem | Options Considered | Chosen Option | Rationale | Compatibility Impact | Risk Class (`R1/R2/R3`) | Verification Plan | Rollback Plan | Evidence Links | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DEC-RFC-F-001 | 2026-03-31 | Agent orchestration owner | Need scalable delegation quality without breaking existing task/agent behavior | unrestricted merge; manual-only review; contract + coordinator validation + arbitration | contract + coordinator validation + arbitration | ensures safe delegated outputs with explicit accountability | additive mode layered on existing surfaces | R2 | contract enforcement + arbitration + compatibility test suites | disable contract enforcement and route to legacy non-contract mode | `docs/03-gap-analysis-and-target-architecture.md`, `docs/07-rfc-roadmap-and-implementation-packages.md` | proposed |

---

This RFC defines the production-grade multi-agent contract framework for safe delegation and merge governance.
