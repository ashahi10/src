# Validation and Test Strategy

Status: Normative validation baseline for transformation implementation and rollout  
Scope: `/Users/adityashahi/Downloads/src` transformation program  
Purpose: Define concrete validation strategy, test matrix, evidence requirements, and quality thresholds to ensure compatibility preservation and trustworthy launch readiness.

## 1) Inputs and Authority

This strategy enforces requirements from:

1. `docs/01-current-state-architecture.md` (current contracts, invariants, failure paths)
2. `docs/02-vision-and-guardrails.md` (anti-regression, anti-fabrication, safety rules)
3. `docs/03-gap-analysis-and-target-architecture.md` (gap and dependency model)
4. `docs/04-migration-plan-and-rollout.md` (phase/ring/gate structure)
5. `docs/05-execution-model-and-operating-principles.md` (runtime decision loops)
6. `docs/06-program-execution-rules-and-principles.md` (program governance and promotion rules)
7. `docs/07-rfc-roadmap-and-implementation-packages.md` (package-level implementation roadmap)
8. `docs/11-implementation-integration-specification.md` (types, integration points, persistence format, compaction rules)

Authority:

- this document is normative for test and validation requirements across all phases/rings.

## 2) Validation Objectives

Primary objectives:

1. preserve compatibility-critical contracts across migration
2. verify mission/risk/verification semantics before completion claims
3. detect regressions early in each ring with actionable evidence
4. ensure rollback and incident response are operationally real, not theoretical
5. prevent metric ambiguity through source+window reporting discipline

## 3) Validation Scope and Out-of-Scope

In scope:

- phase validation requirements and exit evidence
- gate-specific test requirements (`GATE-C/B/S/P/O`)
- mode matrix testing (interactive/headless/remote-bridge/daemon)
- package-level validation mapping (`PKG-*`)
- incident/rollback drill validation

Out of scope:

- detailed test implementation code per module
- CI pipeline internals not visible in this workspace slice (`bounded-risk`, `U-002`)
- generated SDK type parity proof execution before artifact availability (`bounded-risk`, `U-001`)

## 4) Test Taxonomy (Required Layers)

Every phase/package must include relevant layers:

1. **Contract tests**
   - schemas, envelopes, backward compatibility behavior
2. **Behavioral integration tests**
   - end-to-end flow assertions for lifecycle transitions and outputs
3. **Mode smoke tests**
   - startup and key-path sanity in each runtime mode
4. **Safety/policy tests**
   - risk classes, approval enforcement, deny/abort branches
5. **Persistence/invariant tests**
   - session/transcript integrity, state transition correctness
6. **Performance/cost tests**
   - latency and cost behavior vs declared budgets
7. **Operational readiness tests**
   - rollback drills and incident runbook exercises

## 5) Gate-to-Test Mapping

| Gate | Mandatory Validation | Minimum Evidence |
|---|---|---|
| `GATE-C` Contract/compatibility | command/tool/query/MCP/session/remote-bridge compatibility tests | compatibility report + regression diff summary |
| `GATE-B` Behavioral correctness | mission lifecycle, verification enforcement, completion envelope tests | behavior test run logs + scenario coverage table |
| `GATE-S` Safety/governance | risk classification, approval flows, deny/abort behavior, audit records | policy test logs + approval/audit evidence |
| `GATE-P` Performance/cost | latency and cost against predeclared budgets | metric window report with source + threshold verdict |
| `GATE-O` Operational readiness | runbooks, rollback drills, promotion readiness checks | drill report + sign-off table + decision record |

Gate rule:

- A gate may pass only with explicit evidence package; implied pass is invalid.

## 6) Mode Validation Matrix

## 6.1 Mandatory modes

1. interactive REPL
2. headless/print SDK
3. remote session control/viewer
4. bridge host mode
5. daemon/background worker paths

## 6.2 Mode matrix template

| Mode | Startup Pass | Core Execution Pass | Policy Pass | Persistence Pass | Recovery Pass | Notes |
|---|---|---|---|---|---|---|
| Interactive REPL | pass/fail | pass/fail | pass/fail | pass/fail | pass/fail | |
| Headless/SDK | pass/fail | pass/fail | pass/fail | pass/fail | pass/fail | |
| Remote | pass/fail | pass/fail | pass/fail | pass/fail | pass/fail | |
| Bridge | pass/fail | pass/fail | pass/fail | pass/fail | pass/fail | |
| Daemon/worker | pass/fail | pass/fail | pass/fail | pass/fail | pass/fail | |

## 7) Package-to-Validation Mapping (from `07`)

| Package Group | Validation Focus | Required Gates |
|---|---|---|
| PKG-00 | baseline compatibility harness | C, B |
| PKG-A* + PKG-C1 | mission/risk foundation correctness | C, B, S, O (as applicable) |
| PKG-B* | verification enforcement + confidence artifacts | B, S, O |
| PKG-F* | subagent contract validation + arbitration safety | C, B, S, O |
| PKG-D* + PKG-E* | cost/memory optimization correctness and guardrails | P, B, S, O (as applicable) |
| PKG-H* | full-system parity and launch readiness | all gates + O final |

## 8) Phase Validation Requirements

## 8.1 Phase 0

Must validate:

- contract freeze baseline
- mode baseline harness coverage

Exit evidence:

- `artifacts/phase-0/mode-regression-baseline-matrix.md`
- `artifacts/phase-0/go-no-go-checklist-v1.md`

## 8.2 Phase 1

Must validate:

- mission lifecycle transitions
- centralized risk policy behavior
- compatibility across command/tool/query/session/MCP/remote-bridge

Exit evidence:

- `artifacts/phase-1/compatibility-regression-report.md`
- `artifacts/phase-1/phase-exit-gate-package.md`

## 8.3 Phase 2

Must validate:

- mandatory verification gating
- proof artifact and confidence/uncertainty output correctness

Exit evidence:

- `artifacts/phase-2/proof-artifact-envelope-spec.md`
- `artifacts/phase-2/phase-exit-gate-package.md`

## 8.4 Phase 3

Must validate:

- subagent contract enforcement
- arbitration outcomes and non-mergeability of unvalidated outputs

Exit evidence:

- `artifacts/phase-3/coordinator-validation-flow.md`
- `artifacts/phase-3/phase-exit-gate-package.md`

## 8.5 Phase 4

Must validate:

- cost band adherence and budget behavior
- memory freshness and evidence-link integrity

Exit evidence:

- `artifacts/phase-4/cost-band-planner-spec.md`
- `artifacts/phase-4/phase-exit-gate-package.md`

## 8.6 Phase 5

Must validate:

- full cross-mode parity
- launch readiness and rollback drills

Exit evidence:

- `artifacts/phase-5/full-compatibility-matrix-report.md`
- `artifacts/phase-5/rollback-drill-report.md`

## 9) Regression Budget and Threshold Policy

Rules:

1. acceptable regression budget must be declared at phase entry
2. budgets cannot be redefined mid-phase without approved decision record
3. thresholds must be reported with baseline window and cohort context

Minimum threshold categories:

- latency (p50/p95)
- cost per objective vs selected band
- compatibility regressions by contract surface
- policy decision latency and error rates

## 10) Incident and Rollback Validation

## 10.1 Drill requirements

Each ring must execute:

1. at least one soft rollback (`L1`) drill
2. at least one functional rollback (`L2`) drill
3. release rollback (`L3`) validation where pipeline visibility allows (`bounded-risk` until `U-002` closure)

## 10.2 Incident response validation

For incident classes `I1`..`I4`, validate:

- detection path
- owner assignment
- containment actions
- recovery confirmation
- postmortem completion for `I1` and major `I2`

## 10.3 SLA validation defaults

Initial default placeholders from `06` (tune later):

- detection -> triage: <= 15 minutes
- triage -> containment: <= 30 minutes
- containment -> recovery: <= 4 hours

Validation requirement:

- report actual achieved times versus declared defaults per ring.

## 11) Evidence Package Standard

Each phase gate package must contain:

1. test run inventory and outcomes
2. mode matrix results
3. metrics with source and time window
4. known defects and mitigation status
5. owner sign-off table completion
6. go/no-go recommendation with rationale

Evidence quality criteria:

- reproducible (commands/config noted)
- attributable (owner and timestamped)
- scoped (ring/cohort/mode explicit)
- auditable (linked to decision IDs)

## 12) Bounded-Risk Validation Rules

Inherited unknowns:

- `U-001` generated SDK control artifacts unavailable
- `U-002` CI/build/deploy manifests unavailable

Rules:

1. validation claims depending on these unknowns must be tagged `bounded-risk`.
2. no final launch sign-off may be approved while `U-001` or `U-002` remains unresolved.
3. closure evidence for `U-001` and `U-002` must be attached before final launch approval package.

## 13) Reporting Cadence and Dashboards

Minimum cadence:

1. per-phase validation review
2. per-ring promotion readiness review
3. incident validation review after major events

Required dashboard fields:

- gate status by category
- mode pass/fail matrix
- regression budget status
- incident counts by class (`I1`..`I4`)
- rollback drill completion status
- bounded-risk open items

## 14) Initial Decision Log Entries

| Decision ID | Date (UTC) | Owner | Context / Problem | Options Considered | Chosen Option | Rationale | Compatibility Impact | Risk Class (`R1/R2/R3`) | Verification Plan | Rollback Plan | Evidence Links | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DEC-08-001 | 2026-03-31 | Validation strategy owner | Need one validation framework across all packages/phases/rings | package-specific ad-hoc tests; phase-only matrix; unified gate+mode+package validation strategy | unified gate+mode+package validation strategy | reduces blind spots and makes promotions auditable | none directly; improves consistency in compatibility checks | R2 | gate mapping compliance audits + phase evidence package checks | freeze promotion and revert to last passing ring if evidence is insufficient | `docs/04-migration-plan-and-rollout.md`, `docs/07-rfc-roadmap-and-implementation-packages.md` | approved |
| DEC-08-002 | 2026-03-31 | Validation strategy owner | Need clear handling for unknown-source validations | ignore unknowns; block all validation; bounded-risk tagging with launch gate restriction | bounded-risk tagging with launch gate restriction | allows iterative progress without claiming false certainty | no contract change; governance strengthening only | R2 | bounded-risk tag audit in every phase package | block final launch sign-off until closure evidence attached | `docs/01-current-state-architecture.md` Section 14, this document Section 12 | approved |

## 15) Definition of Done for This Document

`08` is complete when all are true:

1. gate-to-test mapping is explicit and enforceable.
2. mode validation matrix is defined.
3. package/phase validation requirements are complete and aligned to `04` and `07`.
4. regression budget policy is explicit and immutable mid-phase unless approved.
5. incident/rollback validation requirements are explicit.
6. evidence package quality rules are explicit and auditable.
7. bounded-risk handling and launch restriction rule are explicit.

---

This file is the authoritative validation and test strategy baseline for transformation delivery.
