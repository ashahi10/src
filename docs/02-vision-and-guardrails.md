# Vision and Guardrails (Transformation Charter)

Status: Approved for architecture planning under bounded risk carry-forward from `01-current-state-architecture.md`  
Scope: `/Users/adityashahi/Downloads/src`  
Purpose: Define the target product direction, non-negotiable guardrails, and execution boundaries for A-F enhancements without destabilizing existing systems.

## 1) Document Intent and Authority

This document is the authoritative transformation charter for "what we will change" and "what we must not break" before implementation begins.

It is normative for:

- enhancement intent and boundaries
- risk and approval guardrails
- compatibility preservation rules
- evidence requirements for future RFCs and implementation plans

It is not an implementation spec; detailed design and code-level migration steps belong to later documents.

## 1.1 Out of scope for this document (scope lock)

To prevent scope creep while producing `03` and later docs, this document does not define:

1. exact class/module/file implementations for A-F
2. final rollout calendar, staffing assignments, or sprint sequencing
3. CI/CD release mechanics not visible in this workspace slice (`bounded-risk`, linked to `U-002`)
4. generated SDK control type parity details not present in this slice (`bounded-risk`, linked to `U-001`)
5. code-level migration scripts and per-file change lists (reserved for implementation-phase docs)

## 2) Inputs and Traceability Chain

Primary inputs:

1. `docs/01-current-state-architecture.md` (authoritative current-state baseline)
2. Existing runtime contracts evidenced in source (`types/command.ts`, `Tool.ts`, `query.ts`, `QueryEngine.ts`, `services/mcp/types.ts`, `utils/sessionStorage.ts`, remote/bridge modules)
3. Strategic enhancement goals A-F defined by product direction

Traceability policy:

- Any future architecture or implementation claim must map to:
  - source evidence (code/schemas) OR
  - explicit design decision record (with owner/date)
- "Assumed" claims are prohibited unless tagged `bounded-risk` with closure conditions.

## 3) North-Star Vision

Build an agentic software engineering runtime that is:

- **reliable by construction**: mission-driven execution with explicit verification gates
- **safe by default**: centralized risk scoring and approval policy for side effects
- **cost-intelligent**: adaptive planning/runtime economics instead of static model usage
- **context-aware over time**: memory linked to evidence, freshness controls, and incidents
- **scalable via multi-agent contracts**: explicit handoff, accountability, and arbitration

The transformed system must preserve current operational strengths (tooling breadth, mode flexibility, extension ecosystem, remote capabilities) while reducing variance and hidden risk across long-horizon tasks.

## 4) Non-Negotiable Operating Guardrails

## 4.1 Anti-regression guardrails

1. No silent contract breaks for:
   - command model
   - tool permission semantics
   - query stream ordering
   - MCP transport/config behavior
   - transcript/session compatibility
   - remote/bridge control envelopes
2. Any unavoidable break requires:
   - migration shim
   - explicit deprecation window
   - compatibility tests covering old + new behaviors

## 4.2 Anti-fabrication guardrails

1. No architecture section can claim behavior without evidence references or explicit bounded-risk tags.
2. No "complete" status is allowed where unknowns are still open without an accepted proceed-anyway rule.
3. Metrics statements must include source and collection window (static snapshot vs runtime telemetry).

## 4.3 Safety guardrails

1. Side-effectful operations must route through explicit policy checks.
2. High-risk actions require explicit user approval; no implicit escalation.
3. Approval/audit records must be retained in an immutable or append-only form suitable for forensic review.

## 4.4 Reliability guardrails

1. Long-running objectives require resumable lifecycle state.
2. Verification gates are mandatory for completion claims.
3. Final responses must surface confidence + residual uncertainty.

## 4.5 Delivery guardrails

1. No implementation phase starts without a scoped RFC and test strategy.
2. Each enhancement must ship behind controlled rollout mechanisms.
3. Cross-enhancement dependencies must be explicit; no hidden coupling.

## 5) Strategic Gap-to-Vision Alignment

| Gap Theme | Current-State Limitation | Target Direction |
|---|---|---|
| Reliability/determinism | Per-turn resilience is stronger than multi-hour mission correctness | Mission transaction model with lifecycle, invariants, rollback |
| Awareness/context | Context is strong per conversation but weaker as long-horizon world model | Evidence-linked memory graph with freshness and incident linkage |
| Security/trust | Guardrails exist but policy is distributed | Unified risk policy engine with centralized decisioning |
| Cost efficiency | Local optimizations exist; global objective economics are limited | Cost-intelligent planner with phase-aware strategy |
| Complex real-world orchestration | Strong local code ops; weaker SLA/dependency governance | Multi-agent contracts + milestones + arbitration |

## 6) Enhancement Charters (A-F)

Each charter defines mandatory outcomes, hard boundaries, and completion evidence.

### 6.1 A) Mission Engine

**Mandatory outcomes**

- First-class Mission object with:
  - goal
  - constraints
  - budget
  - risk policy
  - success criteria
  - rollback strategy
- Enforced lifecycle:
  - plan contract
  - execute steps
  - verification gates
  - commit/abort decision
- Machine-checkable evidence bundle per step.

**Hard boundaries**

- Must not bypass existing permission and tool safety pathways.
- Must not require users to manually reconstruct mission state after interruption.

**Completion evidence**

- mission schema + state machine spec
- lifecycle invariants and failure transitions
- replayable mission trace artifacts

### 6.2 B) Verification-First Runtime

**Mandatory outcomes**

- Required checks attached to action bundles (tests/lint/type/policy/semantic assertions).
- Proof-of-completion artifact containing:
  - claims
  - supporting evidence
  - uncertainty list
- Confidence score with reason codes.

**Hard boundaries**

- Completion cannot be declared if required checks are missing/failing unless explicitly waived with reason.

**Completion evidence**

- verification policy schema
- checker orchestration flow
- confidence computation contract

### 6.3 C) Unified Risk Policy Engine

**Mandatory outcomes**

- Central risk scoring for actions and chains using:
  - data sensitivity
  - blast radius
  - reversibility
  - environment criticality
- Dynamic approval bands:
  - low-risk auto
  - medium-risk scoped confirmation
  - high-risk explicit approval
- Immutable audit trail for calls, approvals, and policy decisions.

**Hard boundaries**

- No tool-specific override may silently supersede central policy.

**Completion evidence**

- risk taxonomy and scoring rubric
- policy decision API and evaluator
- audit trail schema and retention policy

### 6.4 D) Cost-Intelligent Planner

**Mandatory outcomes**

- Preflight cost bands (`cheap`, `balanced`, `thorough`) with quality/risk expectations.
- Phase-aware strategy (discovery/synthesis/critical verification).
- Reuse of verified intermediates across turns where safe.

**Hard boundaries**

- Cost optimization may not bypass required verification/safety checks.

**Completion evidence**

- planning policy and band definitions
- adaptation rules and guard thresholds
- cache reuse validity criteria

### 6.5 E) System-Aware Memory 2.0

**Mandatory outcomes**

- Hybrid memory graph with typed nodes:
  - user preferences
  - architectural decisions
  - incidents
  - constraints
  - repo landmarks
  - tool outcomes
- Freshness/decay/refresh controls.
- Evidence-linking to code/runtime traces.

**Hard boundaries**

- Stale memory must never be silently treated as high-confidence truth.

**Completion evidence**

- memory node/edge schema
- freshness policy
- evidence-linking protocol

### 6.6 F) Multi-Agent Contract Framework

**Mandatory outcomes**

- Formal subagent contracts:
  - input schema
  - output schema
  - budget
  - allowed tools
  - acceptance tests
- Coordinator validation before merge into primary context.
- Arbitration policy for disagreements (confidence + verification weighted).

**Hard boundaries**

- Unvalidated subagent outputs cannot be merged into final user-facing claims.

**Completion evidence**

- contract schemas
- coordinator validation pipeline
- arbitration rules and tie-break policy

## 7) Cross-Cutting Design Principles

1. **Contract-first**: all surfaces are schema-driven before implementation.
2. **Verification-first**: checks are a required stage, not optional polish.
3. **Policy-centralized**: risk decisions converge to one authoritative engine.
4. **Evidence-linked memory**: memory must point to verifiable artifacts.
5. **Compatibility-preserving**: additive-first evolution with migration shims when needed.
6. **Observability-ready**: each critical stage emits diagnosable lifecycle signals.

## 8) Compatibility Preservation Guardrails

Compatibility-critical surfaces to preserve through transformation:

1. Command contract (`types/command.ts`)
2. Tool contract and permission context (`Tool.ts`, orchestration/execution services)
3. Query streaming and headless control behavior (`query.ts`, `QueryEngine.ts`, `cli/print.ts`)
4. MCP schemas and auth/error semantics (`services/mcp/types.ts`, `services/mcp/client.ts`)
5. Session transcript/metadata compatibility (`utils/sessionStorage.ts`)
6. Remote/bridge control request-response semantics (remote/direct-connect/bridge modules)

Required practice for each enhancement:

- declare touched contracts
- classify impact (`additive`, `behavioral`, `breaking`)
- attach migration/compatibility tests before merge

## 9) Risk and Approval Governance Model

## 9.1 Action risk classes

- `R1`: local, reversible, low blast radius
- `R2`: moderate side effects or partial irreversibility
- `R3`: high-impact, potentially irreversible or security-sensitive

## 9.2 Approval policy baseline

- `R1`: auto-run with audit record
- `R2`: scoped confirmation (session/mission scoped where applicable)
- `R3`: explicit per-action approval with enhanced warning context

## 9.3 Auditability minimum

Each policy decision record must include:

- actor/runtime identity
- action/tool details
- risk score + contributing factors
- approval decision and rationale
- timestamp and correlation IDs

## 10) Verification and Quality Gates

No enhancement phase is complete unless all gate classes pass:

1. **Contract gate**
   - schemas/types are explicit
   - backward-compat behavior declared
2. **Behavior gate**
   - mode-wise smoke tests (interactive, headless, remote/bridge)
   - regression suite for touched surfaces
3. **Safety gate**
   - policy and approval paths validated
   - deny/abort handling verified
4. **Evidence gate**
   - proof artifacts attached
   - uncertainty explicitly listed

## 11) Metrics Framework for Transformation Success

Metrics are tracked against baseline windows from `01-current-state-architecture.md`:

- Reliability:
  - mission completion success rate
  - verification-gated completion rate
  - rollback success rate
- Safety:
  - policy decision correctness incidents
  - high-risk action approval integrity
- Cost:
  - objective-level cost variance vs selected band
  - cache reuse hit quality
- Performance:
  - p50/p95 mission step latency
  - remote/bridge recovery latency
- Quality:
  - escaped regression rate on compatibility-critical contracts
  - uncertainty disclosure compliance

Rules:

- No reported value without collection source + time window.
- Static defaults and runtime telemetry must be reported separately.

## 12) Bounded-Risk Carry-Forward Rules

Carry-forward from `01` unknowns (`U-001`, `U-002`) is accepted only for documentation progression.

Mandatory tagging rule:

- Any section dependent on missing generated control artifacts or missing CI/deploy manifests must carry `bounded-risk` until closure evidence is attached.

Prohibited until closure:

- final claims on SDK control type parity
- final release execution playbooks that assume unseen pipeline details

## 13) Decision and Change Control

All major decisions must be logged with:

- decision ID
- date and owner
- context/problem statement
- options considered
- chosen option and rationale
- compatibility impact
- risk impact
- verification plan
- rollback plan

Any deviation from this charter requires explicit decision record approval before implementation.

## 13.1 Decision review status policy

All decision records created during the initial documentation phase carry `Status: approved` as self-approved by the document author. These are architecturally valid but have not undergone independent review. Before any decision record gates a production implementation change:

1. The decision must be reviewed by at least one independent role holder (per Section 4 role assignments).
2. Reviewed decisions update their `Status` to `reviewed-approved` with reviewer name and date.
3. Decisions that remain `approved` (not `reviewed-approved`) at Phase 1 entry must be flagged during Phase 0 readiness review.

This ensures initial velocity is preserved while preventing unreviewed decisions from silently becoming production commitments.

## 13.2 Decision Log Table Template (mandatory)

All future docs in this program must use this exact table format for major decisions:

| Decision ID | Date (UTC) | Owner | Context / Problem | Options Considered | Chosen Option | Rationale | Compatibility Impact | Risk Class (`R1/R2/R3`) | Verification Plan | Rollback Plan | Evidence Links | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DEC-XXX | YYYY-MM-DD | name/role | concise statement | option A; option B; option C | selected option | why this option wins now | additive/behavioral/breaking + touched contracts | R1/R2/R3 | tests/checks/gates to pass | explicit revert/mitigation path | file/schema/doc refs | proposed/approved/superseded |

## 14) Definition of Ready for `03-gap-analysis-and-target-architecture.md`

Move to the next document when all are true:

1. This charter remains consistent with `01` evidence and bounded-risk policy.
2. A-F charters have mandatory outcomes and hard boundaries defined (Sections 6.1-6.6).
3. Compatibility-preservation and quality gates are explicit (Sections 8 and 10).
4. Metrics framework and reporting rules are explicit (Section 11).
5. Bounded-risk carry-forward rules are explicit and enforceable (Section 12).

---

This file is the authoritative vision-and-guardrails charter for the transformation program.
