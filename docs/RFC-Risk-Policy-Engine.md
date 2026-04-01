# RFC: Unified Risk Policy Engine

Status: Approved  
Package: `@tengu/risk-server`  
Type: MCP Server (stdio transport)

## 1) Objective

Centralize runtime risk evaluation into one policy engine that scores actions and outputs deterministic approval requirements (R1/R2/R3) with auditable records — delivered as a standalone MCP server.

## 2) Problem Statement

Agent systems lack centralized risk scoring:

- inconsistent enforcement across different tool/action types
- no standardized risk classification
- harder auditing and forensic reconstruction
- ambiguity in high-risk approval behavior

## 3) Non-Goals

- replacing all agent-internal permission UX
- blocking all high-risk actions without recourse

## 4) MCP Tools Exposed

| Tool | Description |
|---|---|
| `risk.evaluate` | Score an action and return risk class, decision mode, and policy reasons |
| `risk.explain` | Get detailed breakdown of scoring dimensions for a given action |
| `risk.batch_evaluate` | Evaluate multiple actions in a single call |
| `risk.get_policy` | Retrieve the current active policy profile |
| `risk.list_audit` | Query audit records by time range, risk class, or correlation ID |

## 5) Risk Model

### 5.1 Scoring dimensions

1. **Data sensitivity** — what data does the action touch?
2. **Blast radius** — how many systems/files/users are affected?
3. **Reversibility** — can the action be undone?
4. **Environment criticality** — production vs staging vs local?

### 5.2 Risk classes

- `R1`: Low risk — auto-approve
- `R2`: Medium risk — scoped confirmation recommended
- `R3`: High risk — explicit approval required

### 5.3 Policy versioning

Policy profiles are versioned. Every decision record includes the profile version used.

## 6) Audit Trail

Every decision record contains: timestamp, correlation IDs, action descriptor, risk factors, computed class, decision mode, outcome, policy version.

Audit records are append-only and queryable.

## 7) Storage

SQLite via `better-sqlite3`. Database at `~/.tengu/risk.db` (configurable via `TENGU_RISK_DB`).

## 8) Failure Modes

1. Policy engine error — fail-safe: treat as R3 (do not auto-run uncertain actions)
2. Malformed action metadata — reject with validation error
3. Policy profile load failure — fall back to built-in conservative defaults

## 9) Type Definitions

All types from `@tengu/shared-types`: `RiskClass`, `DecisionMode`, `RiskScoringDimension`, `RiskEvaluationInput`, `RiskEvaluationOutput`, `RiskPolicyProfile`, `RiskAuditRecord`.
