# RFC: Mission Engine

Status: Approved  
Package: `@tengu/mission-server`  
Type: MCP Server (stdio transport)

## 1) Objective

Provide AI agents with structured goal tracking through a deterministic lifecycle state machine: plan contract, execute steps, verification gates, commit/abort — delivered as a standalone MCP server.

## 2) Problem Statement

AI agents lack structured mission tracking:

- no explicit lifecycle for complex multi-step objectives
- no verification gates before declaring "done"
- no rollback strategy when things fail mid-execution
- no budget or constraint tracking per objective

## 3) Non-Goals

- replacing agent-internal task decomposition
- forcing mission structure on trivial single-step actions

## 4) MCP Tools Exposed

| Tool | Description |
|---|---|
| `mission.create` | Create a new mission with objective, constraints, budget, and success criteria |
| `mission.plan` | Transition mission to planned state with defined steps |
| `mission.execute_step` | Execute and record a mission step with evidence |
| `mission.verify` | Run verification against success criteria |
| `mission.complete` | Mark mission as completed (requires verification pass or waiver) |
| `mission.abort` | Abort a mission with reason |
| `mission.resume` | Resume an interrupted mission from last checkpoint |
| `mission.get` | Retrieve current mission state |

## 5) State Machine

```
created -> planned -> executing -> verifying -> completed
                                             -> failed
                                  -> aborted
                       -> aborted
            -> aborted
                                             -> rolled_back
```

Transition guards:
- No `completed` without verification pass or approved waiver
- No shortcut `executing -> completed` (must pass through `verifying`)
- Resume from last consistent checkpoint on interruption

## 6) Mission Model

Core types from `@tengu/shared-types`: `Mission`, `MissionStep`, `MissionState`, `MissionBudgetPolicy`, `MissionRollbackStrategy`, `MissionSuccessCriterion`, `MissionTransitionEvent`.

## 7) Storage

SQLite via `better-sqlite3`. Database at `~/.tengu/missions.db` (configurable via `TENGU_MISSION_DB`).

## 8) Failure Modes

1. State transition violation — reject with clear error, no silent state corruption
2. Verification infrastructure failure — mission stays in `verifying`, does not auto-complete
3. Storage failure — graceful error, mission state preserved on disk
