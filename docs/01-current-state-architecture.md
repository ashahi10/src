# Current-State Architecture and Implementation Blueprint (Production Baseline)

Status: Baseline v2 (evidence-traceable, not final-complete)  
Scope: `/Users/adityashahi/Downloads/src`  
Purpose: Provide an implementation-accurate baseline that can be safely used for enhancement engineering without breaking existing systems.

## 1) Claim-to-Evidence Traceability Register

Confidence labels:

- `VERIFIED`: directly confirmed in code read during this pass
- `INFERRED`: conclusion from multiple references, but not fully traced end-to-end
- `NEEDS_VERIFICATION`: dependent file/type not present in this repository slice

| Claim ID | Claim | Evidence (file -> symbol) | Confidence |
|---|---|---|---|
| C-001 | Startup is fast-path first, full CLI loaded only when needed | `entrypoints/cli.tsx` -> `main()` dynamic imports and fast-path branches | VERIFIED |
| C-002 | Initialization is memoized and config/trust/telemetry aware | `entrypoints/init.ts` -> `init`, `initializeTelemetryAfterTrust` | VERIFIED |
| C-003 | Setup orchestrates cwd/session/worktree/hook initialization | `setup.ts` -> `setup` | VERIFIED |
| C-004 | Query loop is async-generator driven with iterative state transitions | `query.ts` -> `QueryParams`, `query`, `queryLoop` | VERIFIED |
| C-005 | Headless/non-interactive path uses `QueryEngine` abstraction | `QueryEngine.ts` -> `QueryEngine`, `ask` | VERIFIED |
| C-006 | Tool model is contract-driven with shared tool context | `Tool.ts` -> `Tool`, `ToolUseContext`, `ToolPermissionContext`, `Tools` | VERIFIED |
| C-007 | Tool orchestration batches by concurrency safety | `services/tools/toolOrchestration.ts` -> `partitionToolCalls`, `runTools` | VERIFIED |
| C-008 | Tool pool is feature/env/permission shaped | `tools.ts` -> `getAllBaseTools`, `getTools`, `filterToolsByDenyRules` | VERIFIED |
| C-009 | Commands are composed from built-in + skills + plugins + workflows | `commands.ts` -> `getCommands`, `loadAllCommands`, `getSkillToolCommands` | VERIFIED |
| C-010 | Command contract supports prompt/local/local-jsx with availability gating | `types/command.ts` -> `Command`, `PromptCommand`, `LocalCommand`, `LocalJSXCommand` | VERIFIED |
| C-011 | Runtime maintains separate process-global and app-level state | `bootstrap/state.ts` -> `State`; `state/AppStateStore.ts` -> `AppState` | VERIFIED |
| C-012 | MCP supports multiple transport/config schemas and typed connection statuses | `services/mcp/types.ts` -> `McpServerConfigSchema`, `MCPServerConnection` | VERIFIED |
| C-013 | MCP client includes explicit auth/session-expiry failure semantics | `services/mcp/client.ts` -> `McpAuthError`, `isMcpSessionExpiredError` | VERIFIED |
| C-014 | Memory system is file-based with entrypoint truncation controls | `memdir/memdir.ts` -> `truncateEntrypointContent`, `MAX_ENTRYPOINT_LINES`, `MAX_ENTRYPOINT_BYTES` | VERIFIED |
| C-015 | Session persistence uses JSONL transcript and explicit chain-participant rules | `utils/sessionStorage.ts` -> `recordTranscript`, `loadTranscriptFromFile`, `isTranscriptMessage`, `isChainParticipant` | VERIFIED |
| C-016 | Remote session flow includes WebSocket lifecycle + permission request relay | `remote/RemoteSessionManager.ts` -> `RemoteSessionManager` | VERIFIED |
| C-017 | Remote websocket has reconnect policy and close-code handling | `remote/SessionsWebSocket.ts` -> `SessionsWebSocket`, `handleClose` | VERIFIED |
| C-018 | Bridge mode runs long-lived polling/heartbeat/session-spawn orchestration | `bridge/bridgeMain.ts` -> `runBridgeLoop`, `heartbeatActiveWorkItems` | VERIFIED |
| C-019 | Direct-connect mode uses control-request/response framing over WS | `server/directConnectManager.ts` -> `DirectConnectSessionManager` | VERIFIED |
| C-020 | SDK control protocol is schema-defined (initialize/permission/model/control operations) | `entrypoints/sdk/controlSchemas.ts` -> `SDKControl*Schema` family | VERIFIED |
| C-021 | Generated SDK/runtime/control TypeScript types are fully available in this slice | `entrypoints/sdk/controlTypes.ts` missing; generated files partially referenced | NEEDS_VERIFICATION |
| C-022 | Full test/deploy CI contracts are visible from this slice | missing root build/CI manifests in current workspace slice | NEEDS_VERIFICATION |
| C-023 | Task subsystem is polymorphic across local/remote/teammate/workflow/monitor/dream tasks | `tasks/types.ts` -> `TaskState` union | VERIFIED |
| C-024 | Hook execution is lifecycle-wide and trust-gated with async/background support | `utils/hooks.ts` -> `shouldSkipHookDueToTrust`, async hook execution paths | VERIFIED |
| C-025 | Policy limits subsystem is fail-open with eligibility, cache, and background polling | `services/policyLimits/index.ts` -> module header and exported loading/eligibility APIs | VERIFIED |
| C-026 | Remote managed settings subsystem is fail-open and checksum/polling based | `services/remoteManagedSettings/index.ts` -> module header and loading APIs | VERIFIED |
| C-027 | Team memory sync uses server-delta checksums and explicit sync state | `services/teamMemorySync/index.ts` -> `SyncState`, API sync semantics comments/types | VERIFIED |
| C-028 | Keybinding system is schema-driven with context/action registries | `keybindings/schema.ts` -> `KEYBINDING_CONTEXTS`, `KEYBINDING_ACTIONS`, `KeybindingsSchema` | VERIFIED |
| C-029 | Vim subsystem is state-machine based | `vim/transitions.ts` -> `transition`, `TransitionContext`, state dispatch | VERIFIED |
| C-030 | Voice enablement is auth + GrowthBook kill-switch gated | `voice/voiceModeEnabled.ts` -> `isVoiceModeEnabled` | VERIFIED |
| C-031 | CCR upstreamproxy is explicit container-side relay wiring with fail-open behavior | `upstreamproxy/upstreamproxy.ts` -> `initUpstreamProxy`, module header contract | VERIFIED |
| C-032 | Migration subsystem performs idempotent settings/data migrations | `migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.ts` -> migration function pattern | VERIFIED |
| C-033 | `docs/claude doc.md` is conversational export and not canonical architecture source | `docs/claude doc.md` content type; no executable/runtime contract symbols | VERIFIED |

## 2) Runtime Mode Matrix (Behavior Differences)

| Mode | Entry path | Primary loop | IO channel | Tool/command shape | Persistence behavior | Key risk |
|---|---|---|---|---|---|---|
| Interactive REPL | `entrypoints/cli.tsx` -> `main.tsx` -> `launchRepl` | `query.ts` via REPL flow | Ink/TUI | full dynamic set; REPL-mode filtering applies | transcript/session storage enabled unless disabled | UI/state coupling complexity |
| Headless print/SDK | `main.tsx`/CLI dispatch -> `cli/print.ts` | `QueryEngine.ask` + structured processing | stream-json/stdout control | tool pool assembled/filtered for non-interactive path | transcript + metadata persisted when enabled | strict control framing + non-interactive permission handling |
| Remote session viewer/control | remote startup path + `RemoteSessionManager` | remote side session loop; local relay | WS + HTTP session event APIs | bridge-safe/remote-safe command filtering in command layer | local metadata + remote session identity linked | network partitions and permission round-trip drift |
| Bridge environment (remote-control host) | `entrypoints/cli.tsx` bridge fast-path -> `bridgeMain` | bridge poll/heartbeat/spawn loop | bridge API + session ingress | not a normal REPL command runtime; worker/session orchestration | session handles/worktree/session ids tracked per bridge loop | reconnection/error-budget correctness |
| Daemon/background worker paths | `entrypoints/cli.tsx` daemon fast-paths | worker-specific loop(s) | process supervisor interfaces | minimal/startup-lean worker behavior | session registry + task metadata dependent | process lifecycle and orphan cleanup |
| Feature-gated branches | all above | branch-dependent | varies | command/tool/mode surfaces dynamically altered by flags | can alter behavior matrix mid-release | regression via gate interaction |

Evidence anchors: `entrypoints/cli.tsx`, `main.tsx`, `replLauncher.tsx`, `cli/print.ts`, `remote/RemoteSessionManager.ts`, `bridge/bridgeMain.ts`, `commands.ts`, `tools.ts`.

## 3) Integration Contracts Inventory

### 3.1 Command contract

- Contract file: `types/command.ts`
- Core symbols: `Command`, `CommandBase`, `PromptCommand`, `LocalCommand`, `LocalJSXCommand`, `getCommandName`, `isCommandEnabled`
- Compatibility requirement: enhancements must preserve command kind semantics (`prompt` vs `local` vs `local-jsx`) and availability gating behavior.

### 3.2 Tool contract

- Contract file: `Tool.ts`
- Core symbols: `Tool`, `ToolUseContext`, `ToolPermissionContext`, `Tools`, `findToolByName`
- Compatibility requirement: preserve permission context shape and tool call lifecycle semantics consumed by orchestration and query loop.

### 3.3 Query input/output contract

- Core symbols: `query.ts` -> `QueryParams`, `query` (async generator)
- Headless wrapper: `QueryEngine.ts` -> `ask`, `QueryEngineConfig`, `QueryEngine`
- Compatibility requirement: do not break streamed event/message sequencing expected by CLI/SDK/remote channels.

### 3.4 MCP contract

- Config and status schema: `services/mcp/types.ts` -> `McpServerConfigSchema`, `MCPServerConnection`, `ServerResource`
- Runtime semantics: `services/mcp/client.ts` -> auth/session errors, transport handling
- SDK control schemas touching MCP: `entrypoints/sdk/controlSchemas.ts` -> status and set-server operations
- Compatibility requirement: preserve transport/config schema compatibility and auth failure semantics.

### 3.5 Session persistence contract

- File: `utils/sessionStorage.ts`
- Core symbols: `recordTranscript`, `flushSessionStorage`, `loadTranscriptFromFile`, `restoreSessionMetadata`, `saveAgentSetting`, `saveMode`, `isTranscriptMessage`
- Compatibility requirement: preserve transcript chain integrity and backwards compatibility with legacy progress entries.

### 3.6 Remote/bridge control message contract

- Schema source: `entrypoints/sdk/controlSchemas.ts` (`SDKControl*Schema`)
- WS/session relay implementations: `remote/SessionsWebSocket.ts`, `remote/RemoteSessionManager.ts`, `server/directConnectManager.ts`
- Compatibility requirement: preserve `control_request` / `control_response` behavior for permission, interrupt, and init flows.

## 4) State Invariants and Synchronization Rules

| Invariant ID | Invariant | Source of truth | Mutation points | Mismatch handling |
|---|---|---|---|---|
| S-001 | Session identity must remain consistent for storage and runtime references | `bootstrap/state.ts` (`sessionId` and related accessors) | bootstrap setters, session switch operations | if drift occurs, persistence/read path inconsistency risk |
| S-002 | `cwd` used by runtime operations should be set before hooks/config that depend on cwd | `setup.ts` + `utils/Shell` path state | `setup()` (`setCwd`), controlled transitions | setup hard-orders operations to reduce drift |
| S-003 | Transcript chain must only include chain participants | `utils/sessionStorage.ts` (`isChainParticipant`) | transcript write path | legacy progress entries bridged/skipped on load |
| S-004 | App interaction state and process-global state are distinct domains | `state/AppStateStore.ts` vs `bootstrap/state.ts` | store updates and bootstrap setters | no single auto-reconciler visible; discipline required |
| S-005 | MCP connection state is explicit (`connected`/`failed`/`needs-auth`/...) | `services/mcp/types.ts` (`MCPServerConnection`) | MCP client connect/reconnect/update flows | caller must branch on typed status |
| S-006 | In-progress tool IDs must be updated around tool execution | `toolOrchestration.ts` | orchestration enter/exit points | IDs removed on completion paths |

Note: S-004 and cross-state sync behavior are partially inferred; no global invariant engine was found in the explored slice.

## 5) Failure Modes and Recovery Map

| Failure class | Detection point | Recovery/fallback path | User-visible behavior | Confidence |
|---|---|---|---|---|
| Model/API failure in query loop | `query.ts` error/recovery logic and API error paths | retry/fallback paths (including token/output handling) | streamed error/system messaging | INFERRED |
| Tool execution error | `services/tools/toolExecution.ts` | error classification + tool_result error propagation | tool error messages and/or denial messaging | VERIFIED |
| Permission denied | permission decision paths in tool execution and command safety filters | deny branch + hook execution (`executePermissionDeniedHooks`) | explicit deny outcome surfaced | VERIFIED |
| MCP auth failure | `services/mcp/client.ts` (`McpAuthError`) | mark needs-auth/cache + reconnect/auth flow | server shown as needs-auth; call fails gracefully | VERIFIED |
| MCP session expiry | `services/mcp/client.ts` (`isMcpSessionExpiredError`) | reconnect client and retry expectation | temporary failure/retry behavior | VERIFIED |
| Remote WS drop | `remote/SessionsWebSocket.ts` (`handleClose`) | limited retries, reconnect schedule, permanent close on certain codes | reconnecting/disconnected callbacks | VERIFIED |
| Bridge heartbeat/session failures | `bridge/bridgeMain.ts` loop handlers | reconnect/requeue/backoff logic | bridge log/status transitions | VERIFIED |
| Persistence failure/large transcript risks | `utils/sessionStorage.ts` thresholds and guarded reads | size caps and guarded reads/rewrites | missing/partial resume data in extreme cases | VERIFIED |

## 6) Security Boundary Model

### 6.1 Trust boundaries by subsystem

- Local side-effect boundary: tool executions (`tools.ts`, orchestration/execution services)
- External server boundary: MCP transports and remote APIs (`services/mcp/client.ts`, remote/bridge modules)
- Control-plane boundary: SDK control requests/responses (`entrypoints/sdk/controlSchemas.ts`, WS managers)
- Persistence boundary: transcript/memory files (`utils/sessionStorage.ts`, `memdir/memdir.ts`)

### 6.2 Side-effect surfaces

- Shell and file mutation tools
- MCP tool invocations on external servers
- Remote session control actions
- Session and metadata writes under local Claude config paths

### 6.3 Approval boundaries

- Tool permission context and decision pathways (`ToolPermissionContext`, permission hooks and checks)
- Remote permission request/response loops (`RemoteSessionManager`, direct connect manager)

### 6.4 Auditability boundaries

- Telemetry/logging events and counters are extensive but distributed (not one central immutable decision ledger in this baseline)
- Session transcripts and metadata provide partial action traceability

### 6.5 Centralized vs scattered policy

- Centralized elements exist (policy limits service, permission context model)
- Enforcement remains distributed across command/tool/runtime layers

## 7) Explicit Unknowns, Out-of-Scope, and Assumptions

### 7.1 Unknowns (cannot be concluded from this slice)

- Complete CI/build/test pipelines (missing root project manifests in this workspace slice)
- Full generated SDK type files and some referenced modules (for example, missing `entrypoints/sdk/controlTypes.ts` in this slice)
- Full deployment topology outside this source export

### 7.2 Out-of-scope for this document

- Deep algorithmic analysis of every individual tool implementation
- Performance profiling and latency benchmarks
- Formal threat model validation with runtime traffic captures

### 7.3 Assumptions carried forward

- Imported but non-present files are part of a larger upstream repo and resolve in full source
- Runtime behavior inferred from strongly typed schemas and managers remains consistent in integrated build

## 8) Testing and Validation Baseline (Preserve Existing Behavior)

Before A-F enhancements, baseline protection should include:

1. Golden path tests
   - interactive prompt -> tool use -> response
   - non-interactive ask/print path
   - bridge/remote permission round-trip
2. Regression suites
   - command availability/isEnabled filtering
   - tool deny-rule filtering and concurrency partition behavior
   - session transcript chain integrity (including legacy progress compatibility)
3. Mode-wise smoke tests
   - REPL startup
   - print/headless run
   - remote WS reconnect behavior
   - bridge loop startup/heartbeat/reconnect path
4. Compatibility checks
   - plugin command loading and cache refresh
   - MCP connect/status/auth transitions
   - remote control message schema compatibility

Status in this document: baseline defined, not yet executed in this workspace slice.

## 9) Objective Definition of Done for This Document

This document is "ready to move to next doc" only when all are true:

- Every core architecture claim is listed in the traceability register with evidence and confidence
- Unknowns/assumptions are explicit
- Runtime mode matrix is complete
- Integration contract inventory is complete
- State invariants and failure/recovery map are explicit
- Security boundary model includes trust/surface/approval/auditability notes
- Validation baseline for "preserve existing behavior" is defined
- Any unresolved unknowns are either closed with evidence OR explicitly accepted as bounded risk with proceed rules

## 10) Documentation Quality Checklist (Objective Status)

Overall status: `SATISFIED_WITH_BOUNDED_RISK`

Closure notes:

1. Architecture coverage is complete for this workspace slice and evidenced in Sections 1, 11, 12, 13, 15.
2. Remaining unknowns are bounded and accepted for architecture-document progression under explicit guardrails in Section 14.2.
3. Progression authorization scope: proceed to `docs/02-vision-and-guardrails.md` is allowed; implementation affecting bounded-risk areas remains gated until closure conditions are met.

## 11) Subsystem Completeness Matrix

Coverage status for top-level functional areas in this baseline document.

| Subsystem | Coverage status | Evidence anchor(s) | Notes |
|---|---|---|---|
| Entry/boot (`entrypoints`, `main`, `setup`) | Covered | `entrypoints/cli.tsx`, `entrypoints/init.ts`, `main.tsx`, `setup.ts` | core startup documented |
| Query/runtime (`query`, `QueryEngine`) | Covered | `query.ts`, `QueryEngine.ts` | core turn loop documented |
| Tools (`tools`, `Tool`, execution/orchestration) | Covered | `tools.ts`, `Tool.ts`, `services/tools/*` | contracts + orchestration documented |
| Commands/skills/plugins | Covered | `commands.ts`, `types/command.ts` | base composition documented |
| State architecture | Covered | `bootstrap/state.ts`, `state/AppStateStore.ts` | dual-state model documented |
| MCP | Covered | `services/mcp/types.ts`, `services/mcp/client.ts` | transport/auth/failure documented |
| Session persistence | Covered | `utils/sessionStorage.ts` | chain and persistence contract documented |
| Remote/bridge/direct-connect | Covered | `remote/*`, `bridge/bridgeMain.ts`, `server/directConnectManager.ts` | control lifecycle documented |
| Headless/SDK transport & control | Covered | `cli/structuredIO.ts`, `cli/print.ts`, `cli/transports/SSETransport.ts` | headless permission flow, structured output, transport-layer control documented |
| Memory (`memdir`) | Covered | `memdir/memdir.ts` | file-based memory model documented |
| Tasks (`tasks/*`) | Covered | `tasks.ts`, `tasks/types.ts`, `tasks/LocalAgentTask/LocalAgentTask.tsx`, `tasks/RemoteAgentTask/RemoteAgentTask.tsx`, `tasks/InProcessTeammateTask/InProcessTeammateTask.tsx`, `utils/task/framework.ts`, `tasks/stopTask.ts` | task taxonomy, registration, lifecycle transitions, kill/notification paths evidenced |
| Hooks lifecycle (`hooks/*`, `utils/hooks*`) | Covered | `utils/hooks.ts`, `services/tools/toolHooks.ts`, `query/stopHooks.ts`, `hooks/useCanUseTool.tsx` | pre/post/failure/stop hook execution, trust gating, permission decision integration evidenced |
| Policy limits | Covered | `services/policyLimits/index.ts` | fail-open + polling semantics captured |
| Remote managed settings | Covered | `services/remoteManagedSettings/index.ts` | fail-open + loading semantics captured |
| Team memory sync | Covered | `services/teamMemorySync/index.ts` | API and delta sync semantics captured |
| Assistant | Covered | `assistant/sessionHistory.ts` | local assistant-facing surface in this slice is explicitly documented (session-event history/auth context) |
| Buddy/companion | Covered | `buddy/companion.ts`, `buddy/prompt.ts` | deterministic companion identity + intro attachment injection path evidenced |
| Keybindings | Covered | `keybindings/schema.ts` | schema/contexts/actions captured |
| Vim integration | Covered | `vim/transitions.ts`, `hooks/useVimInput.ts` | state machine + input-hook integration evidenced |
| Voice | Covered (gating layer) | `voice/voiceModeEnabled.ts` | enablement gating documented |
| Upstream proxy | Covered | `upstreamproxy/upstreamproxy.ts` | CCR proxy boundary captured |
| Migrations | Covered | `migrations/*.ts`, sample symbols (`migrateAutoUpdatesToSettings`, `migrateReplBridgeEnabledToRemoteControlAtStartup`) | migration layer exists as idempotent config evolution mechanism across startup paths |
| `docs/claude doc.md` | Not canonical evidence | `docs/claude doc.md` | reference-only conversational export, not architecture source; retained for historical traceability only; must not be cited as normative evidence |

## 12) Data-Flow Diagrams (Textual)

### 12.1 Interactive REPL flow

`entrypoints/cli.tsx` -> `main.tsx` -> `init()` -> `setup()` -> `launchRepl()` -> user input -> `processUserInput` -> `query()` -> tool orchestration/execution -> message stream -> `sessionStorage.recordTranscript` / flush.

### 12.2 Headless/print SDK flow

CLI non-interactive dispatch -> `cli/print.ts` -> `QueryEngine.ask()` -> `QueryEngine.submitMessage()` -> `query()` -> tools + permissions + hooks -> structured output/control stream -> transcript/session persistence.

### 12.3 Remote/bridge control flow

Client input/event -> remote/bridge transport -> `RemoteSessionManager` / `SessionsWebSocket` / direct connect manager -> `control_request` (permission) -> local decision -> `control_response` -> remote execution continuation.

### 12.4 Bridge worker flow

Bridge startup -> register environment/session -> poll for work -> spawn session handle -> heartbeat loop -> reconnect/requeue on auth/connection issues -> shutdown/cleanup.

## 13) Expanded Invariant Catalog

Additional invariants required for safe enhancement planning:

- `S-007 Task lifecycle invariant`: task state transitions must remain within declared task-state families (`tasks/types.ts` union); no ad-hoc status values should be introduced without cross-consumer updates.
- `S-008 Hook ordering invariant`: hook execution order and trust gate must remain deterministic for lifecycle events; trust-denied interactive sessions must not execute hooks requiring trust (`utils/hooks.ts`).
- `S-009 MCP reconnect invariant`: MCP connection state must transition through typed states (`pending`/`connected`/`failed`/`needs-auth`) and avoid untyped transient states (`services/mcp/types.ts`, `services/mcp/client.ts`).
- `S-010 Bridge heartbeat consistency invariant`: session/work IDs and heartbeat/requeue logic must remain consistent in bridge loops to prevent orphaned active sessions (`bridge/bridgeMain.ts`).
- `S-011 Remote permission lifecycle invariant`: each permission request ID must resolve to success/error/cancel response paths, avoiding hangs (`RemoteSessionManager`, direct connect control handlers).
- `S-012 Migration idempotence invariant`: settings migrations must be idempotent and safe when rerun (`migrations/*` pattern).

## 14) Unknown Closure Plan (Operational)

Every `NEEDS_VERIFICATION` item now has closure steps:

| Unknown ID | Item | Closure method | Source of truth | Owner | Blocking impact | Target |
|---|---|---|---|---|---|---|
| U-001 | Missing SDK control type artifacts in this slice | obtain full repo or generated artifacts, confirm schema-type parity | `entrypoints/sdk/controlTypes.ts` + generated files in upstream | Architecture doc owner | High (contract compatibility) | Before RFC implementation |
| U-002 | Missing full CI/build/deploy manifests | ingest root manifests and CI workflows, map release/test pipelines | root repo config + CI definitions | Architecture doc owner | Medium (execution planning) | Before migration plan sign-off |

### 14.1 Unknowns are bounded (current decision)

Unknowns U-001 and U-002 are bounded to surfaces not required for producing `docs/02-vision-and-guardrails.md` architecture intent.

- U-001 boundary: SDK generated/control artifact parity
- U-002 boundary: CI/build/deploy pipeline specification

### 14.2 Proceed-anyway rule (formal)

Proceed to next documentation phase is allowed under these constraints:

1. Allowed now:
   - architecture/vision/guardrails/target-state docs
   - gap analysis and migration planning docs
2. Not allowed until unknown closure:
   - contract-breaking SDK control protocol changes
   - CI/release process claims presented as verified
   - rollout instructions requiring unseen pipeline details
3. Enforcement:
   - any mention of U-001/U-002 domains in later docs must carry `bounded-risk` tag until closed

## 15) Compatibility and Migration Expectations

### 15.1 Session/log compatibility

- Existing JSONL transcript format and chain-participant assumptions must remain compatible (`utils/sessionStorage.ts`).
- Legacy progress-entry compatibility behavior must not regress.
- Any new metadata should remain additive and sidecar-friendly where possible.

### 15.2 Plugin/skill compatibility

- Command loading and plugin skill composition must preserve existing source semantics (`commands.ts`, `types/command.ts`).
- Dynamic cache invalidation behavior must continue to work when adding new layers.

### 15.3 MCP compatibility

- Existing MCP transport/config schemas must remain backward compatible (`services/mcp/types.ts`).
- Auth/session-expiry error handling semantics must stay stable for clients.

### 15.4 Remote/bridge compatibility

- Control request/response envelope compatibility must be preserved for existing clients.
- Reconnect semantics and close-code handling behavior must remain predictable.

### 15.5 Versioning/migration policy (baseline)

- Prefer additive fields and feature-gated behavior changes.
- If contract-breaking change is unavoidable, define explicit migration shim and deprecation window before enforcement.

## 16) Non-Functional Baseline (Pre-Enhancement)

Current doc status: first-pass baseline snapshot captured from code defaults and repository shape; runtime telemetry snapshot pending.

Metrics to capture before A-F:

1. Reliability baseline
   - turn success rate
   - tool call failure rate by tool class
   - remote/bridge reconnect success rate
2. Cost baseline
   - per-turn token/cost distributions
   - tool-heavy vs tool-light turn cost
3. Performance baseline
   - startup latency (init/setup boundaries)
   - p50/p95 query latency
   - MCP call latency by transport
4. Security baseline
   - permission deny/allow ratio
   - policy-limited action attempts
   - MCP needs-auth incidence

Measurement method anchors:

- telemetry and counters in `bootstrap/state.ts`
- analytics and event logging in `services/analytics/*`
- timing/checkpoint instrumentation in startup/query/tool modules
- bridge/remote lifecycle logs

### 16.1 First-pass baseline snapshot window (code-grounded)

Snapshot window:

- Date: 2026-03-31
- Source: static code inspection in this workspace slice (`/Users/adityashahi/Downloads/src`)
- Type: configuration-and-surface baseline (not live runtime telemetry)

First-pass numbers:

- Hooks files discovered: 104 (`hooks/*`)
- Command files discovered: 207 (`commands/*`)
- Tool files discovered: 184 (`tools/*`)
- Service files discovered: 130 (`services/*`)
- Task files discovered: 12 (`tasks/*`)
- Migration files discovered: 11 (`migrations/*`)

Operational defaults extracted from code:

- Tool concurrency default: 10 (`services/tools/toolOrchestration.ts`)
- Remote WS reconnect delay: 2000 ms (`remote/SessionsWebSocket.ts`)
- Remote WS max reconnect attempts: 5 (`remote/SessionsWebSocket.ts`)
- Remote WS ping interval: 30000 ms (`remote/SessionsWebSocket.ts`)
- Policy limits fetch timeout/retries/polling: 10000 ms / 5 / 1h (`services/policyLimits/index.ts`)
- Remote managed settings timeout/retries/polling: 10000 ms / 5 / 1h (`services/remoteManagedSettings/index.ts`)
- Task poll/stop-display/panel-grace: 1000 ms / 3000 ms / 30000 ms (`utils/task/framework.ts`)
- MCP default tool timeout: 100000000 ms (`services/mcp/client.ts`)
- MCP description cap: 2048 chars (`services/mcp/client.ts`)
- Memory entrypoint caps: 200 lines / 25000 bytes (`memdir/memdir.ts`)
- Transcript read guard cap: 50 MB (`utils/sessionStorage.ts`)

Pending to convert to runtime baseline in later validation pass:

- turn success rate, tool error rate, reconnect success rate
- p50/p95 latency and cost distributions
- policy-denial and needs-auth incidence rates

## 17) Source Hierarchy and Canonicality

- Canonical architecture evidence: executable/runtime code and typed schemas.
- Reference context only: `docs/claude doc.md` (conversation export; not contract source). This file is retained in the `docs/` directory for historical traceability of the original analysis that motivated the transformation program. It must never be cited as normative evidence for architecture claims or implementation decisions.

## 18) Revised Definition of Done for This Document

In addition to Section 9, this doc is complete only when:

- subsystem completeness matrix shows all top-level subsystems covered with concrete evidence links
- unknown closure plan either has resolution evidence OR bounded-risk acceptance with proceed rules
- compatibility section includes confirmed session/plugin/MCP/remote behaviors from full-source verification
- non-functional baseline includes at minimum a first-pass snapshot window with concrete values

---

This file is the authoritative current-state baseline for next-phase architecture docs.
