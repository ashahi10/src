# RFC: Verification-First Runtime

Status: Proposed (implementation-ready spec)  
Owner: Verification / Runtime  
Target Phase: Phase 2 (after mission foundation)  
Related: B (Verification-First Runtime), G-002

## 1) Objective

Make verification a first-class runtime stage for completion claims by enforcing required checks, generating proof artifacts, and emitting confidence + uncertainty outputs.

## 2) Problem Statement

Current execution can provide strong outcomes but completion semantics are not uniformly verification-gated. Without mandatory verification:

- "done" claims can be ambiguous
- failures may be discovered late
- confidence signaling is inconsistent
- rollout decisions become less reliable

## 3) Non-Goals

- replacing existing test/lint/type tools
- changing baseline command/tool protocol contracts
- forcing one fixed verification profile for all objective types

## 4) Existing System Anchors

Integration anchors:

- tool execution and hooks: `services/tools/toolExecution.ts`, `services/tools/toolHooks.ts`, `utils/hooks.ts`
- query/runtime flow: `query.ts`, `QueryEngine.ts`
- persistence for artifacts/metadata: `utils/sessionStorage.ts`
- telemetry and evidence: `services/analytics/*`, `utils/telemetry/events.ts`

## 5) Functional Requirements

1. Verification policy must define required check bundles per objective class.
2. Runtime must block completion when required checks are missing/failing unless waiver is approved.
3. Runtime must produce proof-of-completion artifact for each completion claim.
4. Final outputs must include confidence score and uncertainty reason set.
5. Waivers must be explicit, auditable, and time/scoped.

## 6) Verification Model

## 6.1 Verification policy schema (logical)

Policy fields:

- `policyId`
- `objectiveClass`
- `requiredChecks[]` (e.g., test/lint/type/policy/semantic)
- `optionalChecks[]`
- `waiverRules`
- `passCriteria`
- `timeoutPolicy`

## 6.2 Check result model

Each check result:

- `checkId`
- `status` (`pass`/`fail`/`skipped`/`timeout`)
- `evidenceRef`
- `durationMs`
- `errorSummary` (if any)

## 6.3 Proof artifact model

Proof artifact includes:

- mission/objective identifiers
- required checks and outcomes
- evidence pointers
- unresolved items
- waiver records (if any)
- final verdict

## 7) Confidence and Uncertainty Framework

## 7.1 Confidence score

Confidence should be computed from:

- verification coverage completeness
- check quality and consistency
- unresolved risk count/severity
- stability indicators across modes

## 7.2 Uncertainty reasons

Uncertainty must be explicit and categorized, for example:

- missing evidence
- bounded-risk dependency unresolved
- partial environmental validation
- waived failure

No high-confidence claim is allowed with unresolved critical uncertainty.

## 8) Runtime Integration Approach

1. Execute objective/steps through existing runtime.
2. Run required verification bundle.
3. Construct proof artifact.
4. Compute confidence + uncertainty.
5. Allow commit only on pass/approved waiver.

Compatibility rule:

- verification metadata is additive and does not reorder existing message/event contracts.

## 9) Waiver Governance

Waiver must include:

- scope
- owner
- justification
- expiry
- risk class
- linked decision record

Rules:

- waivers cannot be implicit
- expired waivers become blockers
- waivers for critical safety checks require governance + safety approval

## 10) Failure Modes and Recovery

1. checker execution failure
2. verification timeout
3. artifact persistence failure
4. confidence calculator failure

Recovery behavior:

- default to conservative outcome (no auto-complete)
- record explicit failure reason
- allow retry/re-run path
- route to abort/fail state when unresolved

## 11) Observability and Auditability

Required signals:

- verification start/end and status
- pass/fail rates by check type
- waiver usage and expiry tracking
- confidence distribution and uncertainty categories

Audit requirements:

- each completion claim links to proof artifact
- all waivers link to decision IDs

## 12) Rollout Strategy

1. advisory mode: compute and report verification without blocking
2. limited blocking mode: selected objective classes/rings
3. default blocking mode for safe domains after metrics prove stability

Controls:

- feature flags
- ring-based rollout
- kill switch

## 13) Validation Requirements

Must validate:

- required-check enforcement semantics
- waiver enforcement and expiry behavior
- confidence/uncertainty output correctness
- compatibility regression across critical surfaces
- mode consistency (interactive/headless/remote/bridge/daemon)

## 14) Risks and Mitigations

1. **False positives/negatives in checks**
   - Mitigation: policy versioning + controlled rollout + calibration
2. **Performance overhead**
   - Mitigation: objective-class policies and phased enforcement
3. **Waiver abuse risk**
   - Mitigation: strict approval chain + expiry blockers
4. **User confusion from confidence output**
   - Mitigation: standardized reason taxonomy and UI/message guidance

## 15) Bounded-Risk Constraints

`U-001` and `U-002` remain launch-signoff blockers where applicable.

## 16) Acceptance Criteria

1. verification policy schema is approved
2. runtime completion gate behavior is deterministic and tested
3. proof artifact model is implemented and auditable
4. confidence + uncertainty semantics are explicit and validated
5. waiver controls meet governance requirements
6. rollout and rollback plans are explicit

## 17) Decision Log Entry

| Decision ID | Date (UTC) | Owner | Context / Problem | Options Considered | Chosen Option | Rationale | Compatibility Impact | Risk Class (`R1/R2/R3`) | Verification Plan | Rollback Plan | Evidence Links | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DEC-RFC-B-001 | 2026-03-31 | Verification owner | Need deterministic completion criteria and confidence signaling | optional checks only; mandatory checks without waivers; mandatory checks with governed waivers | mandatory checks with governed waivers | balances safety, practicality, and auditability | additive metadata; no contract break required | R2 | enforcement + waiver + compatibility suite | revert to advisory mode via feature flags | `docs/05-execution-model-and-operating-principles.md`, `docs/08-validation-and-test-strategy.md` | proposed |

---

This RFC defines the production-grade verification-first runtime model for trustworthy completion behavior.
