# RFC: Verification-First Runtime

Status: Approved  
Package: `@tengu/verification-server`  
Type: MCP Server (stdio transport)

## 1) Objective

Make verification a first-class stage: required check bundles, proof artifacts, and confidence/uncertainty scoring — delivered as a standalone MCP server that any agent can call before declaring work "done."

## 2) Problem Statement

Agent systems treat verification as an afterthought:

- no structured pre/post verification checks
- no proof artifacts for completion claims
- no confidence scoring with explicit uncertainty reasons
- silent high-confidence outputs despite critical gaps

## 3) Non-Goals

- replacing agent-internal testing frameworks
- blocking all actions without verification (trivial actions exempt)

## 4) MCP Tools Exposed

| Tool | Description |
|---|---|
| `verification.run_checks` | Run a bundle of verification checks against an objective |
| `verification.get_proof` | Retrieve the proof artifact for a completed verification |
| `verification.compute_confidence` | Calculate confidence score with uncertainty reasons |
| `verification.request_waiver` | Request a governed waiver for a failed check |
| `verification.get_policy` | Retrieve verification policy for a given objective class |

## 5) Verification Model

### 5.1 Verification policy

Defines required check bundles per objective class. Each check specifies type, required/optional, and timeout.

### 5.2 Check results

Each check produces: checkId, checkType, status (pass/fail/skipped/timeout/error), evidence reference, duration.

### 5.3 Proof artifacts

A proof artifact bundles: all check results, waivers, unresolved items, final verdict (pass/fail/waived_pass), and confidence score.

### 5.4 Confidence scoring

Confidence is derived from: coverage, check quality, unresolved risks, stability. Uncertainty reasons are categorized (missing evidence, bounded risk, partial validation, waived failure, etc.).

## 6) Waivers

Waivers are explicit, auditable, time-bounded, and scope-bounded. They record owner, justification, risk class, expiry, and decision ID.

## 7) Storage

SQLite via `better-sqlite3`. Database at `~/.tengu/verification.db` (configurable via `TENGU_VERIFICATION_DB`).

## 8) Type Definitions

All types from `@tengu/shared-types`: `VerificationPolicy`, `VerificationCheckResult`, `ProofArtifact`, `ConfidenceScore`, `ConfidenceReason`, `VerificationWaiver`, `VerificationSummary`.
