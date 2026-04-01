# RFC: Cost-Intelligent Planner

Status: Approved  
Package: `@tengu/cost-planner-server`  
Type: MCP Server (stdio transport)

## 1) Objective

Add objective-level preflight planning that balances cost, quality, and risk through explicit cost bands and phase-aware execution strategy — delivered as a standalone MCP server.

## 2) Problem Statement

Agent systems lack global objective planning for:

- predictable cost envelopes before execution
- explicit quality/risk tradeoff selection
- adaptive phase strategy with governance controls
- reusable verified intermediates at scale

## 3) Non-Goals

- replacing agent-internal model routing
- unbounded automation that bypasses safety controls
- optimizing cost at the expense of correctness

## 4) MCP Tools Exposed

| Tool | Description |
|---|---|
| `planner.preflight` | Generate band options with cost envelopes and phase strategy for an objective |
| `planner.select_band` | Confirm band selection and lock budget envelope |
| `planner.record_adaptation` | Log a phase-level strategy adaptation with rationale |
| `planner.check_reusable` | Look up verified reusable artifacts for a semantic key |
| `planner.invalidate_cache` | Invalidate cached artifacts when policy/version changes |
| `planner.get_summary` | Get cost tracking summary for current or past objectives |

## 5) Planning Model

### 5.1 Preflight bands

- **cheap**: minimize cost, accept lower quality/depth, minimal verification
- **balanced**: moderate cost, standard quality, standard verification
- **thorough**: higher cost, comprehensive quality, full verification suite

### 5.2 Phase-aware execution

Three phases: discovery, synthesis, critical verification. Each phase has its own cost envelope and key actions.

### 5.3 Adaptation controls

- Adaptation shifts strategy by phase, not arbitrarily per step
- Adaptation cannot downgrade required verification/safety controls
- All adaptation actions are logged with rationale and impact

### 5.4 Verified reuse

- Cache only verified intermediate artifacts
- Validate freshness and compatibility before reuse
- Invalidate on contract/policy/version change boundaries

## 6) Storage

SQLite via `better-sqlite3`. Database at `~/.tengu/cost-planner.db` (configurable via `TENGU_COST_DB`).

## 7) Failure Modes

1. Bad estimate quality — conservative default to `balanced`, explicit uncertainty disclosure
2. Adaptation oscillation — hysteresis and guard thresholds
3. Stale cache reuse — strict freshness checks and version-aware invalidation

## 8) Type Definitions

All types from `@tengu/shared-types`: `CostBand`, `ExecutionPhase`, `BudgetEnvelope`, `PreflightInput`, `BandOption`, `PreflightOutput`, `AdaptationRecord`, `ReusableArtifact`.
