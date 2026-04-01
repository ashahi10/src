# RFC: Unified Risk Policy Engine

Status: Proposed (implementation-ready spec)  
Owner: Safety / Policy  
Target Phase: Phase 1 (interface), extended Phase 2+  
Related: C (Unified Risk Policy Engine), G-003

## 1) Objective

Centralize runtime risk evaluation and approval decisioning into one policy engine that scores actions/action-chains and outputs deterministic approval requirements with auditable records.

## 2) Problem Statement

Current policy and permission logic exists but is distributed across layers. This can create:

- inconsistent enforcement paths
- duplicated or diverging risk logic
- harder auditing and forensic reconstruction
- ambiguity in high-risk approval behavior

## 3) Non-Goals

- replacing all existing permission UX immediately
- removing existing hook/policy functionality in phase-1
- introducing breaking changes to tool/command contracts

## 4) Existing System Anchors

Key integration anchors:

- permission context: `hooks/toolPermission/PermissionContext.ts`, `hooks/useCanUseTool.tsx`
- policy limits/settings: `services/policyLimits/index.ts`, `services/remoteManagedSettings/index.ts`
- tool execution: `services/tools/toolExecution.ts`
- permission telemetry: `hooks/toolPermission/permissionLogging.ts`
- remote approval path: `remote/RemoteSessionManager.ts`, `server/directConnectManager.ts`

## 5) Functional Requirements

1. Risk scoring must use at least:
   - data sensitivity
   - blast radius
   - reversibility
   - environment criticality
2. Engine must output standardized risk class: `R1`, `R2`, or `R3`.
3. Engine must map to approval mode:
   - `R1`: auto-run
   - `R2`: scoped confirmation
   - `R3`: explicit approval
4. Every decision must emit audit record with factors and rationale.
5. Engine behavior must be mode-consistent across interactive/headless/remote/bridge.

## 6) Policy Engine Model

## 6.1 Input model (logical)

- action descriptor (tool/command/operation)
- parsed inputs and target scope
- execution context (mode, environment, session flags)
- historical context (recent denials/failures if policy-relevant)

## 6.2 Output model

- `riskClass` (`R1/R2/R3`)
- `decisionMode` (`auto/scoped_ask/explicit_ask`)
- `policyReasons[]`
- `requiredApprovers` (if applicable)
- `auditRecordRef`

## 6.3 Policy versioning

- policy profiles must be versioned
- decision records must include profile/version ID
- rollbacks can pin to prior known-good policy version

## 7) Integration Architecture

## 7.1 Decision source of truth

Risk engine becomes the primary decision source; existing permission flows remain delivery channels.

## 7.2 Backward compatibility

- no abrupt removal of existing checks
- current hooks/policies continue, but are normalized via central decision output
- adapter layer translates engine outputs into existing prompt/deny behavior

## 7.3 Remote/bridge parity

Remote and bridge permission loops must consume equivalent risk classes and decision semantics to avoid drift.

## 8) Audit Trail Contract

Every policy decision record must contain:

- timestamp
- actor/session/mission correlation IDs
- action descriptor
- risk factors and computed class
- decision mode and outcome
- source version (policy profile ID)

Audit rules:

- append-oriented records
- queryable for gate and postmortem analysis
- no silent drop of high-impact decision events

## 9) Failure Modes and Fallback Behavior

1. policy engine unavailable
2. scoring failure due to malformed action metadata
3. policy profile load failure

Fallback principles:

- fail-safe for high-risk ambiguity (do not auto-run uncertain high-impact actions)
- explicit user-visible fallback behavior
- emit fallback audit event

## 10) Security and Abuse-Resistance

1. prevent risk downgrading by malformed inputs through strict normalization
2. require explicit approvals for `R3` regardless of local optimization pressure
3. protect against policy bypass in subagent/delegated paths
4. enforce immutable decision logs for high-impact operations

## 11) Rollout Strategy

1. shadow mode:
   - compute risk class, no enforcement
2. advisory mode:
   - surface class/decision recommendations
3. enforcement mode:
   - apply decision outputs with ring-scoped rollout

Promotion prerequisites:

- high agreement between new and baseline decisions in safe domains
- no approval integrity regressions
- stable remote/bridge parity behavior

## 12) Validation Requirements

Must validate:

- deterministic scoring outputs for equivalent inputs
- class-to-approval mapping correctness
- decision parity across modes
- policy profile version rollback behavior
- audit record completeness

## 13) Risks and Mitigations

1. **Over-blocking actions**
   - Mitigation: policy tuning windows + explicit profile versions
2. **Under-classification risk**
   - Mitigation: conservative defaults + safety-owner review
3. **Mode divergence**
   - Mitigation: parity tests in all modes
4. **Audit gaps**
   - Mitigation: required audit event checks in gate evidence

## 14) Bounded-Risk Constraints

Launch-signoff remains blocked if `U-001`/`U-002` unresolved where dependencies exist.

## 15) Acceptance Criteria

1. risk model and output contract approved
2. adapter integration preserves existing permission UX semantics
3. mode parity and auditability validated
4. rollback/policy-version pin strategy tested
5. rollout gates and kill-switch controls defined

## 16) Decision Log Entry

| Decision ID | Date (UTC) | Owner | Context / Problem | Options Considered | Chosen Option | Rationale | Compatibility Impact | Risk Class (`R1/R2/R3`) | Verification Plan | Rollback Plan | Evidence Links | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DEC-RFC-C-001 | 2026-03-31 | Safety/policy owner | Need consistent risk decisions and approval boundaries across runtime modes | keep distributed checks; partial centralization; full centralized decision source with adapters | centralized decision source with adapters | improves consistency/auditability while preserving compatibility channels | additive integration with existing permission flows | R2 | scoring determinism + parity + audit tests | policy version rollback + enforcement disable path | `docs/05-execution-model-and-operating-principles.md`, `docs/09-metrics-observability-and-auditability.md` | proposed |

---

This RFC defines the production-grade centralized risk policy engine model for safe runtime governance.
