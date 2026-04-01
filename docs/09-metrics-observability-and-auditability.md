# Metrics, Observability, and Auditability

Status: Normative telemetry and audit baseline for transformation delivery  
Scope: `/Users/adityashahi/Downloads/src` transformation program  
Purpose: Define what must be measured, how signals are emitted and interpreted, and what audit trail guarantees are required before phase/ring promotion and launch approval.

## 1) Inputs and Authority

This document operationalizes and extends:

1. `docs/01-current-state-architecture.md` (baseline contracts, invariants, failure modes, unknowns)
2. `docs/04-migration-plan-and-rollout.md` (gate/ring/phase model)
3. `docs/05-execution-model-and-operating-principles.md` (execution loop semantics)
4. `docs/06-program-execution-rules-and-principles.md` (governance and incident rules)
5. `docs/08-validation-and-test-strategy.md` (validation evidence standards)
6. `docs/11-implementation-integration-specification.md` (persistence format, hook events, telemetry integration points)

Code-grounded observability anchors in this workspace slice include:

- analytics entry and queueing: `services/analytics/index.ts`
- analytics routing/sampling/killswitch behavior: `services/analytics/sink.ts`
- 1P export and resilient retry storage: `services/analytics/firstPartyEventLoggingExporter.ts`
- OTel event emission and prompt correlation: `utils/telemetry/events.ts`
- telemetry/state counters and providers: `bootstrap/state.ts`
- permission decision telemetry fanout: `hooks/toolPermission/permissionLogging.ts`
- transcript/session persistence and chain integrity: `utils/sessionStorage.ts`

Authority:

- normative for metrics definitions, emission requirements, evidence windows, and auditability constraints.

## 2) Observability Goals

1. Provide reliable evidence for gate decisions (`GATE-C/B/S/P/O`).
2. Detect regressions quickly and attribute root causes by phase/ring/package.
3. Preserve privacy and safety boundaries while collecting useful diagnostics.
4. Guarantee decision accountability via auditable event trails.
5. Prevent metric ambiguity by requiring source + window + cohort context.

## 3) Signal Model and Data Planes

## 3.1 Data planes

1. **Analytics event plane**
   - event API with queued pre-init behavior and sink routing
2. **OTel event/log plane**
   - structured event records with prompt and sequence correlation
3. **Metrics/counters plane**
   - attributed counters and stats store values tied to runtime behaviors
4. **Persistence evidence plane**
   - session transcripts and operation artifacts for replayability/audit

## 3.2 Required correlation identifiers

Every production-significant signal should include, where available:

- session ID
- prompt ID / turn correlation
- package/phase/ring context
- tool/operation identifier
- timestamp and event sequence

Correlation rule:

- gate evidence packages must cross-link at least one identifier across analytics, telemetry, and artifact records.

## 4) Metrics Taxonomy (Normative)

## 4.1 Reliability metrics

- mission completion rate
- mission abort/fail/rollback rates
- tool execution success/failure ratio by class
- remote/bridge reconnect success rate
- verification-gated completion pass rate

## 4.2 Safety and policy metrics

- risk decision distribution (`R1/R2/R3`)
- approval latency and deny rate
- policy decision correctness incidents
- high-risk action approval integrity violations
- permission decision event coverage

## 4.3 Compatibility metrics

- contract regression count by surface:
  - command
  - tool
  - query/headless stream
  - MCP
  - session/transcript
  - remote/bridge control
- backward-compat pass percentage by mode

## 4.4 Performance and cost metrics

- p50/p95 latency (turn/objective and key sub-steps)
- API/tool duration aggregates
- objective cost vs selected cost band
- cost variance distribution by ring

## 4.5 Quality and governance metrics

- gate pass/fail rate by category
- incident rate by class (`I1`..`I4`)
- rollback drill success rate
- exception/waiver aging and expiry compliance
- decision-record latency

## 5) Event and Counter Requirements

## 5.1 Event emission requirements

Required event classes:

1. mission lifecycle transitions
2. risk policy decisions and approval outcomes
3. verification gate results and waivers
4. completion envelope confidence/uncertainty output
5. rollback invocations and recovery outcomes

## 5.2 Counter/measurement requirements

Required counter classes:

1. usage and cost totals
2. tool/hook/classifier duration and counts
3. policy decision counters
4. compatibility regression counters (from validation pipeline)

## 5.3 Prompt and session correlation

From current telemetry behavior:

- OTel events should include prompt correlation where available (`utils/telemetry/events.ts`).
- Event sequencing should remain monotonic within a session.

Requirement:

- all major phase-gate evidence must show at least one prompt-correlated trace sample.

## 6) Privacy, Data-Minimization, and Redaction Controls

Rules:

1. General-access telemetry must avoid raw code/path leakage unless explicitly approved and protected.
2. Sensitive fields must follow existing redaction/segregation pathways (for example `_PROTO_*` handling and sink stripping rules).
3. Prompt/body logging should be controllable and explicitly disclosed when enabled.
4. Any new metric metadata field requires privacy review before rollout beyond `Ring-0`.

Minimum privacy checks per package:

- metadata field inventory
- redaction/segregation confirmation
- sink-specific exposure review

## 7) Audit Trail Contract

## 7.1 Auditability minimum

For every high-impact decision/action chain, audit records must include:

- actor/runtime context
- decision/action type
- reason or source class
- timestamp
- correlation ID(s)
- outcome (approved/denied/failed/retried)

## 7.2 Append-only and retention behavior

Requirements:

1. decision and event trails must be append-friendly and tamper-evident where feasible.
2. failed-export buffering/retry behavior must not silently drop critical governance events.
3. retention and replayability windows must be declared in operational runbook artifacts.

## 7.3 Gate evidence audit requirements

Every gate package must include:

- event sample references
- metric snapshot with source/window
- sign-off and decision IDs
- unresolved uncertainty list

## 8) Source-of-Truth and Reporting Windows

## 8.1 Reporting source hierarchy

1. code-emitted telemetry/events/counters
2. validation-generated compatibility/performance reports
3. decision-log and sign-off artifacts

Derived dashboards are summaries, not primary evidence.

## 8.2 Mandatory reporting windows

Per metric claim, include:

- pre-change baseline window
- phase stabilization window
- ring promotion decision window
- post-promotion soak window

## 8.3 Cohort attribution

All published metrics must specify:

- ring/cohort
- phase/package context
- mode scope

## 9) Gate-Specific Observability Criteria

## 9.1 `GATE-C`

- compatibility regression metrics by surface
- mode compatibility pass matrix
- contract diff evidence

## 9.2 `GATE-B`

- mission transition and verification outcome traces
- proof-artifact generation coverage
- confidence/uncertainty output integrity checks

## 9.3 `GATE-S`

- risk class distribution and approval latency
- permission decision coverage and denial handling evidence
- safety incident and mitigation telemetry

## 9.4 `GATE-P`

- latency and cost metrics versus predeclared budgets
- threshold verdicts with explicit pass/fail rationale

## 9.5 `GATE-O`

- rollback drill telemetry
- incident response timing evidence
- launch-readiness signal completeness checklist

## 10) Dashboard and Alerting Baseline

## 10.1 Minimum dashboard panels

1. gate health by category and ring
2. compatibility regression trend
3. latency/cost trend vs budget
4. approval/risk policy behavior trend
5. incident and rollback trend

## 10.2 Alert classes

1. safety alerts (approval boundary violations, `I1`)
2. compatibility alerts (regression bursts, repeated `I2`)
3. performance/cost alerts (budget breach trends)
4. telemetry integrity alerts (missing events, exporter failure accumulation)

## 10.3 Alert response requirements

- define owner, escalation path, and target response windows per alert class
- link alert incidents to decision records and postmortems

## 11) Metric Quality Rules

No metric is valid for promotion/launch decisions unless:

1. source system is identified
2. time window is identified
3. cohort/ring is identified
4. numerator/denominator logic is defined (where applicable)
5. collection gaps and uncertainty are disclosed

Anti-fabrication rule:

- estimated or inferred values must be clearly labeled and cannot be reported as measured production values.

## 12) Bounded-Risk Observability Constraints

Inherited unknowns:

- `U-001` generated SDK control type artifacts unavailable
- `U-002` CI/build/deploy manifest details unavailable

Rules:

1. observability claims relying on these missing artifacts must be tagged `bounded-risk`.
2. no final launch sign-off may be approved while `U-001` or `U-002` remains unresolved.
3. closure evidence for these unknowns must include observability impact verification.

## 13) Implementation Guidance for Package Teams

Each package (`PKG-*`) must ship:

1. metric mapping table (metric -> source -> owner)
2. required event list with correlation fields
3. dashboard panel additions/updates
4. alert rules and runbook links
5. gate evidence query/examples

Phase exit requirement:

- package observability deliverables are part of `phase-exit-gate-package.md`.

## 14) Initial Decision Log Entries

| Decision ID | Date (UTC) | Owner | Context / Problem | Options Considered | Chosen Option | Rationale | Compatibility Impact | Risk Class (`R1/R2/R3`) | Verification Plan | Rollback Plan | Evidence Links | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DEC-09-001 | 2026-03-31 | Observability owner | Need one shared metric and audit model across phases/rings/packages | team-local metrics; phase-local metrics; unified normative observability model | unified normative observability model | enables comparable gate decisions and incident triage quality | none directly; strengthens compatibility decision confidence | R2 | gate evidence audits for source/window/cohort completeness | freeze promotion and revert to last validated ring if critical signal integrity fails | `docs/04-migration-plan-and-rollout.md`, `docs/08-validation-and-test-strategy.md` | approved |
| DEC-09-002 | 2026-03-31 | Observability owner | Need privacy-safe telemetry while preserving forensic value | strict minimal logs only; full raw logs; controlled telemetry with redaction and segregated pathways | controlled telemetry with redaction and segregated pathways | balances safety, utility, and governance requirements | no contract break; telemetry policy hardening | R2 | privacy metadata audits + sink route verification + alert validation | disable new telemetry fields/sinks and fall back to baseline telemetry set | `services/analytics/index.ts`, `services/analytics/sink.ts`, `utils/telemetry/events.ts` | approved |

## 15) Definition of Done for This Document

`09` is complete when all are true:

1. metric taxonomy covers reliability, safety, compatibility, performance/cost, and governance.
2. event/counter and audit trail requirements are explicit and enforceable.
3. source/window/cohort reporting rules are explicit.
4. gate-specific observability criteria are mapped (`GATE-C/B/S/P/O`).
5. privacy and redaction controls are explicitly required.
6. bounded-risk constraints and launch restriction rule are explicit.
7. package-team observability deliverables are defined.

---

This file is the authoritative metrics, observability, and auditability baseline for transformation delivery governance.
