# RFC: Cost-Intelligent Planner

Status: Proposed (implementation-ready spec)  
Owner: Runtime Economics / Planning  
Target Phase: Phase 4  
Related: D (Cost-Intelligent Planner), G-004

## 1) Objective

Add objective-level preflight planning that balances cost, quality, and risk using explicit cost bands and phase-aware execution strategy, without bypassing safety or verification rules.

## 2) Problem Statement

Current runtime has useful local optimizations but lacks a global objective planner for:

- predictable cost envelopes
- explicit quality/risk tradeoff selection
- adaptive phase strategy with governance controls
- reusable verified intermediates at scale

## 3) Non-Goals

- replacing existing model routing primitives in one step
- unbounded automation that bypasses approval/verification
- optimizing at the expense of compatibility or safety

## 4) Existing System Anchors

Primary anchors:

- query/runtime execution: `query.ts`, `QueryEngine.ts`
- tool orchestration and concurrency controls: `services/tools/toolOrchestration.ts`
- cost and usage tracking state: `bootstrap/state.ts`
- analytics/telemetry for metrics: `services/analytics/*`, `utils/telemetry/events.ts`

## 5) Functional Requirements

1. Planner must produce preflight band options:
   - `cheap`
   - `balanced`
   - `thorough`
2. Each band must output:
   - estimated cost range
   - expected quality/risk profile
   - required verification depth
3. Runtime strategy must support phase-aware adaptation:
   - discovery
   - synthesis
   - critical verification
4. Planner must support reuse of verified intermediates with validity checks.
5. Planner decisions must remain subordinate to risk and verification policies.

## 6) Planning Model

## 6.1 Preflight inputs

- objective complexity indicators
- expected tool profile and external dependencies
- risk class baseline
- historical cost/latency references (when available)
- selected policy profile and mode

## 6.2 Preflight outputs

- chosen band (or user-selected band)
- budget envelope (`min/expected/max`)
- phase strategy recommendations
- verification implications
- uncertainty statements on estimates

## 6.3 Adaptation controls

- adaptation can shift strategy by phase, not arbitrarily per step
- adaptation actions must be logged with rationale and impact
- adaptation cannot downgrade required verification/safety controls

## 7) Verified Reuse and Dedupe Strategy

Reuse model:

1. cache only verified intermediate artifacts
2. index by objective-relevant semantic keys
3. validate freshness and compatibility before reuse
4. invalidate on contract/policy/version change boundaries

Reuse guardrails:

- stale or unverifiable artifacts cannot be reused as high-confidence inputs
- reuse decisions must emit evidence records

## 8) Integration Architecture

Planner insertion point:

1. mission/objective intake
2. preflight plan generation
3. execution with phase controls
4. ongoing cost/latency observation
5. adaptation decisions (if needed and policy-compliant)

Compatibility constraints:

- no change to existing external control envelopes required
- planner metadata is additive
- fallback path to baseline execution remains available

## 9) Failure Modes and Safeguards

1. bad estimate quality
2. adaptation oscillation
3. cache misuse / stale reuse
4. metric source gaps

Safeguards:

- conservative default to `balanced` when confidence low
- hysteresis and guard thresholds for adaptation changes
- strict reuse validity checks and freshness policies
- explicit estimate uncertainty disclosure

## 10) Observability and Reporting

Required planner signals:

- band selection frequency and outcomes
- estimate error distribution (actual vs planned)
- adaptation event rate and triggers
- reuse hit rate and validated reuse quality
- cost variance by ring and objective class

Reporting rule:

- each metric claim must include source + window + cohort.

## 11) Rollout Strategy

1. advisory phase:
   - produce plans and estimates, no enforcement
2. guided phase:
   - recommend band and adaptation with user/operator visibility
3. active phase:
   - apply planning controls where validation shows improvements

Promotion rules:

- no regression budget drift mid-phase without approved decision record
- no safety/verification degradation

## 12) Validation Requirements

Must validate:

- estimation quality against baseline windows
- adaptation stability and non-oscillation behavior
- compatibility no-regression on critical surfaces
- enforcement that safety/verification is never bypassed
- reuse correctness and invalidation behavior

## 13) Risks and Mitigations

1. **Underestimation leading to trust loss**
   - Mitigation: confidence intervals + uncertainty reasons
2. **Over-optimization harming quality**
   - Mitigation: verification floors and band policy constraints
3. **Stale cache reuse**
   - Mitigation: freshness checks and version-aware invalidation
4. **Complex policy interaction**
   - Mitigation: explicit precedence (safety > compatibility > cost)

## 14) Bounded-Risk Constraints

Any dependency on unresolved `U-001`/`U-002` remains `bounded-risk` and cannot receive final launch-signoff.

## 15) Acceptance Criteria

1. preflight band model and outputs are approved
2. adaptation policy is deterministic and bounded
3. reuse and invalidation policy is explicit and testable
4. gate and reporting requirements are complete
5. fallback and rollback paths are proven

## 16) Decision Log Entry

| Decision ID | Date (UTC) | Owner | Context / Problem | Options Considered | Chosen Option | Rationale | Compatibility Impact | Risk Class (`R1/R2/R3`) | Verification Plan | Rollback Plan | Evidence Links | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DEC-RFC-D-001 | 2026-03-31 | Runtime economics owner | Need objective-level cost control without harming safety/correctness | static mode-only tuning; aggressive adaptive optimization; phased planner with strict guardrails | phased planner with strict guardrails | enables measurable gains while protecting reliability and policy controls | additive integration; no immediate contract break | R2 | estimate quality + adaptation stability + compatibility tests | disable planner enforcement and revert to baseline execution strategy | `docs/04-migration-plan-and-rollout.md`, `docs/09-metrics-observability-and-auditability.md` | proposed |

---

This RFC defines a production-grade cost-intelligent planning model compatible with existing system constraints.
