# Program Execution Rules and Principles

Status: Normative governance baseline for transformation delivery  
Scope: `/Users/adityashahi/Downloads/src` transformation program  
Purpose: Define enforceable program rules, decision rights, and operating principles so implementation proceeds with high reliability, predictable quality, and controlled risk.

## 1) Inputs and Position in Document Stack

This document operationalizes and enforces:

1. `docs/01-current-state-architecture.md` (contract and baseline constraints)
2. `docs/02-vision-and-guardrails.md` (non-negotiable transformation guardrails)
3. `docs/03-gap-analysis-and-target-architecture.md` (gap and target dependency model)
4. `docs/04-migration-plan-and-rollout.md` (phase/ring/gate execution plan)
5. `docs/05-execution-model-and-operating-principles.md` (runtime execution semantics)
6. `docs/11-implementation-integration-specification.md` (concrete integration points and feature flag assignments)

Role of this document:

- defines how teams execute the program, not how code internals are implemented
- defines mandatory governance mechanics for all phases and rollout rings
- defines escalation and exception controls to prevent drift and avoid unsafe shortcuts

## 2) Rule Hierarchy and Precedence

Precedence order (highest to lowest):

1. Safety and compliance constraints
2. Contract compatibility constraints
3. Phase gate criteria and rollout controls
4. Schedule and throughput objectives
5. Local team convenience

Conflict rule:

- if schedule conflicts with compatibility/safety, schedule loses by default.

## 3) Program-Level Non-Negotiables

1. **No silent contract breakage** across command/tool/query/MCP/session/remote-bridge surfaces.
2. **No "done" without evidence**: completion claims require artifacts and gate outcomes.
3. **No bypass of approval policy**: high-risk actions require explicit approval path.
4. **No ring promotion without gate package approval**.
5. **No mid-phase regression budget drift** unless approved decision record supersedes prior budget.
6. **No unresolved Sev-1 safety issue in active promotion path**.

## 4) Decision Rights and Accountability

## 4.1 Required roles per phase

Each phase must have named:

- Technical Owner
- Safety Owner
- Verification Owner
- Rollout Approver

No owner role may be left unassigned at phase entry.

## 4.2 Decision authority boundaries

Technical Owner can approve:

- implementation detail choices within approved contracts
- non-breaking additive schema evolution

Safety Owner can veto:

- any change that weakens approval boundaries or auditability

Verification Owner can block:

- phase exit when gate evidence is insufficient or invalid

Rollout Approver can authorize:

- ring promotion and rollback initiation after reviewing gate package

## 4.3 Mandatory decision records

All major decisions must use the exact table format defined in `docs/02-vision-and-guardrails.md` Section `13.2`.

Minimum decisions to record:

1. phase-entry approval
2. phase-exit gate disposition
3. compatibility exception/waiver approval
4. rollback invocation and recovery path
5. ring promotion approval

## 5) Phase Execution Rules

These rules apply to every phase in `docs/04-migration-plan-and-rollout.md`.

## 5.1 Entry rules

A phase may start only when:

1. prior phase exit criteria are satisfied
2. phase scope and non-goals are documented
3. acceptable regression budget is pre-declared
4. required owners are assigned
5. verification plan and artifact checklist are acknowledged

## 5.2 In-phase rules

1. Every material change maps to explicit gap/workstream objective.
2. Any emerging scope change must be logged as decision record before execution.
3. Risk-class policy (`R1/R2/R3`) must be applied consistently.
4. If unknowns `U-001` or `U-002` are touched, output must carry `bounded-risk` tag.
5. No phase may redefine acceptance thresholds ad hoc.

## 5.3 Exit rules

Phase exit is valid only when:

1. all phase exit criteria are met
2. required phase artifacts exist (per `04` Section `4.7`)
3. owner sign-off template is fully completed
4. gate evidence package includes objective go/no-go recommendation

## 6) Rollout and Promotion Rules

## 6.1 Ring governance

Rollout rings must follow sequence:

- `Ring-0` -> `Ring-1` -> `Ring-2` -> `Ring-3`

Skipping rings requires explicit approved decision record with risk justification.

## 6.2 Promotion criteria

Promotion requires:

1. `GATE-C/B/S/P/O` pass in target cohort
2. rollback drill success in current ring
3. no unresolved critical incidents lacking approved mitigation
4. post-fix stabilization window completion
5. no `repeated I2` event in the same stabilization window (`repeated I2` = 2 or more distinct `I2` incidents in one window for the same ring/cohort)

## 6.3 Promotion freeze triggers

Immediate promotion freeze on:

- safety/approval integrity defect (`I1`)
- repeated compatibility regressions (`I2`) in stabilization window
- inability to execute rollback path within agreed recovery target

## 7) Exception and Waiver Policy

## 7.1 Allowed exception types

1. temporary verification waiver
2. temporary compatibility shim extension
3. bounded-risk proceed decision pending upstream closure

## 7.2 Exception minimum requirements

Every exception must define:

- scope and duration
- affected contracts/modes
- risk class and mitigation
- explicit expiry condition
- owner and verifier

No exception is valid without a decision record and expiry condition.

## 7.3 Expired exception behavior

- expired exceptions auto-convert to blockers for phase exit and ring promotion.

## 8) Quality and Verification Rules

## 8.1 Evidence standards

Each gate package must contain:

1. test execution evidence
2. metrics evidence with source and window
3. known issues with severity and mitigation
4. sign-off table completion

## 8.2 Verification depth expectations

- high-risk paths require scenario-based verification, not only unit evidence
- compatibility-critical paths require backward-compat checks
- remote/bridge and MCP flows require mode-specific validation evidence

## 8.3 Uncertainty disclosure

Any unresolved uncertainty impacting behavior must be:

1. listed explicitly
2. tied to mitigation or closure plan
3. reflected in go/no-go recommendation

## 9) Risk, Incident, and Recovery Rules

## 9.1 Incident classification alignment

Use incident classes defined in `05`:

- `I1` safety/approval integrity
- `I2` compatibility regression
- `I3` performance/cost regression
- `I4` non-blocking quality issue

## 9.2 Recovery time expectations

Each ring must predefine:

- detection-to-triage target
- triage-to-containment target
- containment-to-recovery target

Program reports must track adherence to these targets.

Initial default SLA placeholders (tune later per ring/workload):

| SLA Segment | Initial Default Target | Notes |
|---|---|---|
| detection -> triage | <= 15 minutes | alert acknowledged and incident owner assigned |
| triage -> containment | <= 30 minutes | mitigation applied to stop active impact growth |
| containment -> recovery | <= 4 hours | service behavior restored to accepted baseline |

## 9.3 Rollback mandate

If containment cannot be achieved within target for `I1` or repeated `I2`, rollback is mandatory unless explicitly waived via approved decision record.

## 10) Communication and Reporting Cadence

## 10.1 Required cadences

1. Weekly program review:
   - phase status
   - open risks
   - gate readiness
2. Per-promotion readiness review:
   - gate package
   - rollback readiness
   - unresolved issues
3. Incident postmortem review (for `I1` and major `I2`)

## 10.2 Status reporting minimum fields

- phase and workstream status
- gate status by category
- risk/incident summary
- regression budget status
- decision records created/updated
- bounded-risk items touched

## 11) Anti-Patterns (Explicitly Prohibited)

1. Declaring phase complete before artifact package is complete.
2. Reclassifying high-risk action as low-risk to avoid approval.
3. Changing regression thresholds mid-phase without decision approval.
4. Hiding compatibility failures in aggregate metrics.
5. Skipping ring steps due to schedule pressure without risk record.
6. Treating bounded-risk assumptions as verified facts.

## 12) Bounded-Risk Governance

Inherited bounded-risk constraints:

- `U-001` generated SDK control type artifacts unavailable
- `U-002` CI/build/deploy manifest details unavailable

Governance rules:

1. Any deliverable dependent on these unknowns must be explicitly tagged `bounded-risk`.
2. No final launch sign-off while `U-001` and `U-002` closure evidence is missing.
3. Risk acceptance for bounded items must include closure target and owner.

## 13) Program Health Metrics

Minimum program governance metrics:

1. gate pass rate by phase and ring
2. rollback drill success rate
3. compatibility regression escape rate
4. incident rate by class (`I1`..`I4`)
5. exception aging and expiry compliance
6. decision-record latency (time from issue to approved decision)

Reporting rule:

- every metric must include source and time window; no uncited summary metrics.

## 14) Initial Decision Log Entries

| Decision ID | Date (UTC) | Owner | Context / Problem | Options Considered | Chosen Option | Rationale | Compatibility Impact | Risk Class (`R1/R2/R3`) | Verification Plan | Rollback Plan | Evidence Links | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DEC-06-001 | 2026-03-31 | Program governance owner | Need enforceable execution rules across multiple workstreams and rings | advisory-only guidance; team-local rules; centralized normative rules | centralized normative rules with mandatory records and gates | reduces interpretation variance and unsafe local optimizations | none directly; strengthens control over compatible evolution | R2 | verify gate package completeness + sign-off coverage audits | revert to last approved phase/ring state and re-run governance checks | `docs/04-migration-plan-and-rollout.md`, `docs/05-execution-model-and-operating-principles.md` | approved |
| DEC-06-002 | 2026-03-31 | Program governance owner | Need clear handling for bounded unknowns during delivery | ignore until later; block all progress; bounded-risk tagged progress with strict limits | bounded-risk tagged progress with strict limits | allows progress without fabricating certainty | no contract change; affects approval semantics only | R2 | audit bounded-risk tags and closure plans in each phase package | freeze promotion until missing closure evidence is attached | `docs/01-current-state-architecture.md` Section 14, this document Section 12 | approved |

## 15) Definition of Done for This Document

`06` is complete when all are true:

1. rule hierarchy and precedence are explicit.
2. role-based decision rights and mandatory records are explicit.
3. phase/ring execution rules are enforceable and auditable.
4. exception policy includes expiry and blocking behavior.
5. anti-patterns are explicit and prohibited.
6. bounded-risk governance is explicit and consistent with `01-05`.
7. program health metrics are defined with reporting rules.

---

This file is the authoritative program execution rules-and-principles baseline for transformation delivery governance.
