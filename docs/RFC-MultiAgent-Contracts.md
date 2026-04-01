# RFC: Multi-Agent Contract Framework

Status: Approved  
Package: `@tengu/contracts-server`  
Type: MCP Server (stdio transport)

## 1) Objective

Provide a formal contract and governance framework for subagent delegation so work is bounded, validated, and mergeable with arbitration when outputs disagree — delivered as a standalone MCP server.

## 2) Problem Statement

Multi-agent systems lack formal delegation contracts:

- no declared I/O expectations for subagent runs
- no tool/budget boundaries on delegated work
- no acceptance-test requirements before merging outputs
- no deterministic arbitration for conflicting results
- unvalidated outputs silently merged into primary context

## 3) Non-Goals

- replacing agent-internal task decomposition
- forcing heavy contracts for trivial local actions
- removing non-contract delegation mode

## 4) MCP Tools Exposed

| Tool | Description |
|---|---|
| `contract.create` | Create a subagent contract with schemas, budget, tool allowlist, and acceptance tests |
| `contract.validate` | Validate a contract definition for completeness and consistency |
| `contract.submit_result` | Submit execution result for a contract |
| `contract.check_merge` | Check whether a result is eligible for merge |
| `contract.merge` | Merge a validated result into primary context |
| `contract.arbitrate` | Resolve conflicts between competing results |
| `contract.get` | Retrieve contract details and current status |

## 5) Contract Model

### 5.1 Subagent contract

Declares: input/output schemas, tool allowlist, budget policy, acceptance tests, risk policy reference, timeout policy.

### 5.2 Execution result

Contains: contract ID, execution status, output payload, validation status, acceptance results, confidence summary, uncertainty summary, evidence references.

### 5.3 Merge eligibility

Merge requires: contract validation pass, acceptance tests pass (or approved waiver), risk constraints respected.

### 5.4 Arbitration

When outputs conflict, weigh: verification strength (highest) > confidence quality > recency/relevance. Ties escalate to human resolution. All arbitration outputs include rationale trace.

## 6) Coordinator Validation Pipeline

1. Contract compile/validate
2. Execution monitoring
3. Output schema validation
4. Acceptance test evaluation
5. Merge decision
6. Audit record emission

## 7) Storage

SQLite via `better-sqlite3`. Database at `~/.tengu/contracts.db` (configurable via `TENGU_CONTRACTS_DB`).

## 8) Failure Modes

1. Contract validation failure — reject with clear errors
2. Acceptance test infrastructure failure — mark result as non-mergeable
3. Arbitration deadlock — escalate to human path
4. Storage failure — graceful error, contract state preserved

## 9) Type Definitions

All types from `@tengu/shared-types`: `SubagentContract`, `ExecutionResult`, `MergeDecision`, `ArbitrationInput`, `ArbitrationOutput`, `AcceptanceTest`, `AcceptanceResult`, `TimeoutPolicy`.
