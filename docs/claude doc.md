# Codebase review and understanding
_Exported on 31/03/2026 at 20:41:37 GMT-6 from Cursor (2.6.21)_

---

**User**

can you revie wthe codebase and see what it does how is arthcteuctire and all details about the codebas.e do deep review untill you have solid understanding about the codebase and its working implenttaions so i understand it more clealry and what its components fucntiosn does fetauresand capbiltties it has.

---

**Cursor**

I’ll do a deep pass over the repository in stages: first map the project structure and entrypoints, then trace core modules and data flow, then summarize architecture, features, and capabilities with concrete file references. I’m starting with a full inventory of the codebase layout.

I found a large TypeScript codebase (looks like a CLI/agent platform), so next I’m tracing the primary boot path (`main.tsx`, command registry, query engine, tools, services) and then I’ll map each subsystem and its role.

I’ve confirmed this is a very feature-rich TypeScript agent/CLI system. Next I’m doing a broad architectural sweep across entrypoints, tools, services, state, remote/bridge, and plugin/skill systems so I can give you a complete component-by-component breakdown.

I’ve now verified the main control loop and tool/runtime internals directly. I’m moving into MCP, memory, remote/bridge, and state boundaries next so the final review is not just surface-level but covers real integration behavior end-to-end.

## What this codebase is

This repository is the core of a **terminal AI agent platform (Claude Code)**, not a typical single-app service. It combines:

- A CLI/TUI runtime (`Ink` + React) for interactive chat + tooling
- A headless/SDK runtime for non-interactive automation
- A model execution loop with tool orchestration, retries, compaction, and hook pipelines
- Extension surfaces: commands, tools, plugins, skills, MCP servers/resources
- Remote/bridge modes for controlling sessions from web/mobile/assistant surfaces

You can see the CLI bootstrap explicitly branding itself as Claude Code and dispatching multiple runtime paths:

```33:42:entrypoints/cli.tsx
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Fast-path for --version/-v: zero module loading needed
  if (args.length === 1 && (args[0] === '--version' || args[0] === '-v' || args[0] === '-V')) {
    // MACRO.VERSION is inlined at build time
    // biome-ignore lint/suspicious/noConsole:: intentional console output
    console.log(`${MACRO.VERSION} (Claude Code)`);
    return;
  }
```

---

## High-level architecture

The architecture is **layered but pragmatic**, with a few very large orchestrator files:

- **Entry + bootstrap:** `entrypoints/cli.tsx`, `entrypoints/init.ts`, `main.tsx`, `setup.ts`
- **UI/control plane:** `screens/REPL.tsx`, `components/*`, `hooks/*`
- **Execution engine:** `query.ts`, `QueryEngine.ts`, `services/api/claude.ts`
- **Tool runtime:** `tools.ts`, `Tool.ts`, `services/tools/*`
- **Extension/runtime services:** `commands/*`, `services/*`, `plugins/*`, `skills/*`, `memdir/*`
- **Distributed/remoting:** `remote/*`, `bridge/*`, `server/*`

Size hotspots (important for maintainability):
- `cli/print.ts` (~5594 lines)
- `screens/REPL.tsx` (~5005 lines)
- `main.tsx` (~4683 lines)
- `services/mcp/client.ts` (~3348 lines)
- `bridge/bridgeMain.ts` (~2999 lines)
- `query.ts` (~1729 lines)

---

## End-to-end working flow

### 1) Process start and mode dispatch
`entrypoints/cli.tsx` does fast-path branching before loading full CLI:
- `--version`, daemon workers, bridge/remote-control, background session commands, templates, etc.
- Otherwise imports `main.tsx`

```108:116:entrypoints/cli.tsx
// Fast-path for `claude remote-control` (also accepts legacy `claude remote` / `claude sync` / `claude bridge`):
// serve local machine as bridge environment.
// feature() must stay inline for build-time dead code elimination;
// isBridgeEnabled() checks the runtime GrowthBook gate.
if (feature('BRIDGE_MODE') && (args[0] === 'remote-control' || args[0] === 'rc' || args[0] === 'remote' || args[0] === 'sync' || args[0] === 'bridge')) {
```

### 2) Initialization and environment setup
`entrypoints/init.ts` enables config/env, graceful shutdown, telemetry, remote-managed settings, policy loading, OAuth hydration, networking setup.

### 3) Session/workspace setup
`setup.ts` prepares cwd, hooks snapshot/watcher, optional worktree/tmux flows, terminal backup restoration, session identity.

### 4) Input processing
`utils/processUserInput/processUserInput.ts`:
- Parses slash commands
- Handles attachments, hooks, metadata, bridge-safe command behavior
- Produces normalized messages and whether to query model

### 5) Model query loop
`query.ts` is the heart:
- streaming request start
- context preparation + budgets + compaction strategies
- model call
- tool use detection/execution
- follow-up turns, stop hooks, termination reasons

```219:227:query.ts
export async function* query(
  params: QueryParams,
): AsyncGenerator<
  | StreamEvent
  | RequestStartEvent
  | Message
  | TombstoneMessage
  | ToolUseSummaryMessage,
  Terminal
>
```

### 6) Tool orchestration + execution
`services/tools/toolOrchestration.ts` partitions tool calls into concurrent-safe vs serial batches; `toolExecution.ts` handles permission/hook/telemetry/error mapping.

```87:95:services/tools/toolOrchestration.ts
/**
 * Partition tool calls into batches where each batch is either:
 * 1. A single non-read-only tool, or
 * 2. Multiple consecutive read-only tools
 */
function partitionToolCalls(
  toolUseMessages: ToolUseBlock[],
  toolUseContext: ToolUseContext,
): Batch[] {
```

---

## Core component map and what each does

- **`commands/` + `commands.ts`**  
  Command registry + availability gating + dynamic loading of skills/plugins/workflows into command space.
- **`tools/` + `tools.ts` + `Tool.ts`**  
  Tool contracts, tool pool composition, deny-rule filtering, MCP merge, simple/repl mode filtering.
- **`services/api/claude.ts`**  
  Anthropic API integration, streaming events, retries/fallbacks, usage/cost, model headers/betas/effort/task budgets.
- **`services/mcp/client.ts`**  
  MCP client lifecycle, transports (stdio/SSE/streamable HTTP/websocket), auth handling, tool/resource discovery and execution.
- **`memdir/`**  
  Persistent memory model (`MEMORY.md` index + typed memory files), truncation/limits, guidance and memory prompt construction.
- **`state/AppStateStore.ts`**  
  App/UI state model: permissions, tasks, MCP, plugins, bridge/remote status, notifications, session hooks, UI toggles.
- **`bootstrap/state.ts`**  
  Process-global runtime state (session/cost/telemetry/hooks/caches/model usage/flags). Contains explicit warning against overgrowth.
- **`remote/RemoteSessionManager.ts`**  
  Remote session WS + control message protocol (permission requests, reconnect callbacks, message forwarding).
- **`bridge/bridgeMain.ts`**  
  Always-on bridge orchestration, spawning session workers, heartbeats, reconnect/backoff, environment/session lifecycle.
- **`cli/print.ts` + `QueryEngine.ts`**  
  Headless/SDK execution path with structured IO and the same core model+tool semantics.

---

## Tooling and capability surface

From code inspection, this system supports:

- File ops (`Read`, `Edit`, `Write`, notebook edits)
- Shell execution (`Bash`, optional PowerShell)
- Search (`Glob`, `Grep`, web fetch/search)
- Agent/task orchestration (`AgentTool`, task create/update/list/stop, monitoring)
- Plan mode + verify plan
- MCP integration (`ListMcpResources`, resource read, server tools, auth flows)
- Plugin and skill loading (built-in + user + plugin + MCP-derived)
- Remote/bridge control, background sessions, daemonized modes
- Optional voice/browser/computer-use modes via feature gates
- Hook pipelines (user submit, pre/post tool use, stop hooks, compact hooks)

Tool pool assembly with MCP integration is explicit:

```345:353:tools.ts
export function assembleToolPool(
  permissionContext: ToolPermissionContext,
  mcpTools: Tools,
): Tools {
  const builtInTools = getTools(permissionContext)

  // Filter out MCP tools that are in the deny list
  const allowedMcpTools = filterToolsByDenyRules(mcpTools, permissionContext)
```

---

## State model understanding

Two major state domains:

- **Global runtime state** (`bootstrap/state.ts`)  
  Tracks session identity, telemetry providers/counters, model usage/cost, hooks registry, prompt cache latches, etc.

- **App/UI state** (`state/AppStateStore.ts`)  
  Holds interactive runtime state: permission mode context, task registry, MCP connection state, plugin state, remote/bridge UI status, notifications, session hooks, etc.

This split is powerful but creates complexity: behavior can depend on both stores plus feature gates.

---

## Architectural strengths

- Strong modular surface for commands/tools/services
- Extensive error handling and telemetry instrumentation
- Sophisticated query loop with recovery paths
- Good extension model (plugins, skills, MCP, hooks)
- Multiple operation modes (interactive, headless, remote, bridge)

---

## Main complexity/risk areas

- **Very large orchestrator files** (`main.tsx`, `REPL.tsx`, `print.ts`) make local reasoning hard
- **Feature-gate sprawl** (`feature('...')` + env flags) creates many behavior matrices
- **Dual state systems** (global bootstrap + app state) can drift
- Heavy use of dynamic imports/conditional requires is useful for DCE/startup, but harder to statically analyze
- High integration density in `query.ts` and `services/mcp/client.ts` (many responsibilities)

---

## Suggested onboarding reading order

1. `entrypoints/cli.tsx`
2. `entrypoints/init.ts`
3. `main.tsx` (focus on startup flow)
4. `setup.ts`
5. `replLauncher.tsx` then `screens/REPL.tsx`
6. `utils/processUserInput/processUserInput.ts`
7. `query.ts`
8. `services/tools/toolOrchestration.ts` + `services/tools/toolExecution.ts`
9. `tools.ts` + `Tool.ts`
10. `services/api/claude.ts`
11. `services/mcp/client.ts`
12. `state/AppStateStore.ts` + `bootstrap/state.ts`
13. `memdir/memdir.ts`
14. `remote/RemoteSessionManager.ts` + `bridge/bridgeMain.ts`

---

If you want, I can do a **second-pass deep dive** on one vertical only (for example: “MCP internals”, “query loop and compaction strategy”, “remote/bridge protocol”, or “plugin/skill loading lifecycle”) and map exact control flow from function-to-function.

---

**User**

see this code for claude. so i have a question,lets talk abotu what it lacks,and perosnalx enhancments "what if it could have" fetaures or enhacnemnts would make itmore strong,more reliablemore aware ,more secure,more efficent in costing and able to do compelx to human world task mor ebetter. so we know where it stands and how we can work on it on it to mak eit more close to software ai engineerring to make it mor ebetter in use for upcoming world or agentic development. 


---

**Cursor**

## Where It Stands Today

From this codebase, Claude Code is already strong in core agent infrastructure:

- Solid agent loop with retries, compaction, tool orchestration, permissions, hooks, and streaming (`query.ts`, `services/tools/*`, `services/api/claude.ts`).
- Mature extensibility model (commands, tools, skills, plugins, MCP).
- Good multi-surface support (interactive REPL, headless SDK/print, bridge/remote).
- Rich runtime telemetry and state tracking (`bootstrap/state.ts`, analytics hooks).
- Practical safeguards already exist, but mostly around tool permission and policy gating, not full production-grade autonomous governance.

The gap is not “missing basics”; it is moving from **powerful coding assistant runtime** to a **trustworthy autonomous software engineering system**.

---

## What It Lacks Most (Strategic Gaps)

## 1) Reliability And Determinism Gaps

- No first-class “mission transaction” model (plan -> execute -> verify -> rollback) across multi-tool/multi-turn work.
- Recovery is strong per-turn, but weaker for long-running, multi-hour objectives with strict correctness guarantees.
- Limited explicit invariant checking for state drift between `AppState`, session storage, and global bootstrap state.
- Large orchestrator files (`REPL`, `print`, `main`) increase regression risk and make behavior hard to reason about under many feature flags.

## 2) Awareness And Context Gaps

- Memory exists, but no unified long-horizon world model combining code graph, runtime behavior, incidents, and user/team intent over time.
- Agent awareness is mostly conversational + file-level; weaker on architectural intent and evolving system constraints.
- No explicit “confidence and uncertainty surface” shown to users per key claim/decision.

## 3) Security And Trust Gaps

- Strong permission prompts and policy checks exist, but no full zero-trust execution graph that scores risk per action chain.
- Secrets/data-loss prevention appears distributed across tools rather than centralized as a single policy decision engine.
- Limited provenance guarantees for generated changes (who/what/why/which evidence) as an auditable chain.

## 4) Cost-Efficiency Gaps

- Good compaction/tool budgeting exists, but no global optimizer that chooses model/tool granularity by expected value of information.
- Limited preflight “estimated cost-to-complete this objective” and “budgeted execution plan” for user approval.
- Weak explicit caching/reuse of validated sub-results across sessions/tasks (beyond existing prompt/microcompact patterns).

## 5) Complex Real-World Task Gaps

- Great at local code operations, weaker at orchestrating real-world, cross-system workflows with SLAs, failure domains, and human escalation.
- No built-in objective lifecycle manager with milestones, dependency graph, and adaptive strategy switching under uncertainty.
- Limited multi-agent governance model (task contracts, accountability, arbitration) for safe scale.

---

## High-Impact “What If It Could Have” Enhancements

## A) Mission Engine (Biggest Upgrade)

- Add a first-class `Mission` abstraction: goal, constraints, budget, risk policy, success criteria, rollback strategy.
- Every long task runs through: **Plan Contract -> Execute Steps -> Verification Gates -> Commit/Abort**.
- Persist machine-checkable evidence for each step: commands run, files changed, tests passed, external side effects.

## B) Verification-First Runtime

- Make verification not optional: each action bundle has required checks (tests, lint, typecheck, policy checks, semantic assertions).
- Add “proof of completion” artifacts: why we believe objective is done, and what remains uncertain.
- Introduce “confidence score + uncertainty reasons” for every final answer.

## C) Unified Risk Policy Engine

- Central policy brain that scores each action based on data sensitivity, blast radius, reversibility, and environment.
- Dynamic guardrails: low-risk actions auto-run, medium-risk ask-once with scope, high-risk require explicit human approval.
- Add immutable audit trail for tool calls, approvals, and policy decisions.

## D) Cost-Intelligent Planner

- Before executing, produce cost bands (`cheap / balanced / thorough`) and expected quality/risk.
- Runtime can downshift/upshift models by phase: discovery (cheap), synthesis (balanced), critical edits/verification (stronger model).
- Reuse verified intermediate results (retrieval cache + semantic dedupe) across turns/projects.

## E) System-Aware Memory 2.0

- Upgrade memory from markdown-centric to hybrid memory graph:
- Node types: user preferences, architecture decisions, incidents, constraints, repo landmarks, tool outcomes.
- Decay/refresh policy so stale memory does not silently degrade decisions.
- Link memory to evidence in code and runtime traces.

## F) Multi-Agent Contract Framework

- Define formal contracts for subagents: inputs, outputs, budget, allowed tools, acceptance tests.
- Coordinator validates all subagent outputs before merge into main context.
- Arbitration rules when agents disagree (confidence-weighted + verification-weighted merge).

---

## Practical Roadmap (If You Build This)

## Phase 1 (Near-Term, High ROI)

- Add Mission object + explicit success criteria.
- Add mandatory verification gates for edit operations.
- Add centralized risk scoring for tool calls.
- Add cost preflight estimator and budget caps.

## Phase 2 (Architecture Hardening)

- Refactor mega-orchestrators into bounded contexts (session control, model loop, permissions, remote, UI).
- Introduce state consistency checks and event-sourced session ledger.
- Standardize tool result schemas for deterministic replay.

## Phase 3 (Agentic Maturity)

- Hybrid memory graph + evidence-backed retrieval.
- Multi-agent contracts and coordinator arbitration.
- Autonomous long-running objective mode with human checkpoints.

---

## How This Improves “Human-World Task” Performance

With the above, the system becomes better at real-world work because it gains:

- **Predictability:** mission contracts and verification gates reduce “looks done but is wrong.”
- **Trust:** auditable provenance and policy decisions make it safer in enterprise settings.
- **Scalability:** contract-driven multi-agent execution scales complexity without chaos.
- **Cost control:** model/tool strategy becomes economic, not just reactive.
- **Resilience:** failure-aware workflows recover without losing mission integrity.

---

If you want, next I can turn this into a **concrete engineering blueprint for this exact repo**: proposed modules/files, interfaces, event schemas, and migration steps that fit the current architecture without disruptive rewrites.

---

**User**

how etrnasofmr this codebase and get things done to get high impact enchamnets and lauch it again as its fresh in market as enhaceed version and these nhacnemnts how to engineer them is firstly importnat then how we come up with it show public what we did.see i dotn wanna lauch as new brand but soemthing that shows how we improved it not made wrong use of it .
we keep exisiting stuff same only work on these and when they all working we rebrand and all stuff before we ship .
WE GET THESE ALL DONE- FIRST PLANNED DETAILED DOCUEMNTED THEN WORK ON IT SO WE DONT BURN OUT TIME AND WASTE THINGS BUILDING TO A WALL.
A) Mission Engine (Biggest Upgrade)
Add a first-class Mission abstraction: goal, constraints, budget, risk policy, success criteria, rollback strategy.
Every long task runs through: Plan Contract -> Execute Steps -> Verification Gates -> Commit/Abort.
Persist machine-checkable evidence for each step: commands run, files changed, tests passed, external side effects.
B) Verification-First Runtime
Make verification not optional: each action bundle has required checks (tests, lint, typecheck, policy checks, semantic assertions).
Add “proof of completion” artifacts: why we believe objective is done, and what remains uncertain.
Introduce “confidence score + uncertainty reasons” for every final answer.
C) Unified Risk Policy Engine
Central policy brain that scores each action based on data sensitivity, blast radius, reversibility, and environment.
Dynamic guardrails: low-risk actions auto-run, medium-risk ask-once with scope, high-risk require explicit human approval.
Add immutable audit trail for tool calls, approvals, and policy decisions.
D) Cost-Intelligent Planner
Before executing, produce cost bands (cheap / balanced / thorough) and expected quality/risk.
Runtime can downshift/upshift models by phase: discovery (cheap), synthesis (balanced), critical edits/verification (stronger model).
Reuse verified intermediate results (retrieval cache + semantic dedupe) across turns/projects.
E) System-Aware Memory 2.0
Upgrade memory from markdown-centric to hybrid memory graph:
Node types: user preferences, architecture decisions, incidents, constraints, repo landmarks, tool outcomes.
Decay/refresh policy so stale memory does not silently degrade decisions.
Link memory to evidence in code and runtime traces.
F) Multi-Agent Contract Framework
Define formal contracts for subagents: inputs, outputs, budget, allowed tools, acceptance tests.
Coordinator validates all subagent outputs before merge into main context.
Arbitration rules when agents disagree (confidence-weighted + verification-weighted merge).

What It Lacks Most (Strategic Gaps)
1) Reliability And Determinism Gaps
No first-class “mission transaction” model (plan -> execute -> verify -> rollback) across multi-tool/multi-turn work.
Recovery is strong per-turn, but weaker for long-running, multi-hour objectives with strict correctness guarantees.
Limited explicit invariant checking for state drift between AppState, session storage, and global bootstrap state.
Large orchestrator files (REPL, print, main) increase regression risk and make behavior hard to reason about under many feature flags.
2) Awareness And Context Gaps
Memory exists, but no unified long-horizon world model combining code graph, runtime behavior, incidents, and user/team intent over time.
Agent awareness is mostly conversational + file-level; weaker on architectural intent and evolving system constraints.
No explicit “confidence and uncertainty surface” shown to users per key claim/decision.
3) Security And Trust Gaps
Strong permission prompts and policy checks exist, but no full zero-trust execution graph that scores risk per action chain.
Secrets/data-loss prevention appears distributed across tools rather than centralized as a single policy decision engine.
Limited provenance guarantees for generated changes (who/what/why/which evidence) as an auditable chain.
4) Cost-Efficiency Gaps
Good compaction/tool budgeting exists, but no global optimizer that chooses model/tool granularity by expected value of information.
Limited preflight “estimated cost-to-complete this objective” and “budgeted execution plan” for user approval.
Weak explicit caching/reuse of validated sub-results across sessions/tasks (beyond existing prompt/microcompact patterns).
5) Complex Real-World Task Gaps
Great at local code operations, weaker at orchestrating real-world, cross-system workflows with SLAs, failure domains, and human escalation.
No built-in objective lifecycle manager with milestones, dependency graph, and adaptive strategy switching under uncertainty.
Limited multi-agent governance model (task contracts, accountability, arbitration) for safe scale.



also see its extensiove codebase,adn rewrite just use of ai or cursor wont help or would prorbaly break what it exist. i want to understand hwo we appaorch this getting thinsg doen as we discussed aboev while keeping its structure and things simliar as its already working eixisitng systems. i would rather make extensive documentaions first before working on implemenations so i have right accruat esmart apaporches to get it done . 

---

**Cursor**

## Right Approach: Documentation-First Transformation (Without Breaking Existing System)

You are thinking correctly. For this codebase size, the winning strategy is:

- Keep core behavior stable.
- Add new capabilities as **layered, feature-flagged modules**.
- Run them in **shadow mode first**.
- Document everything before implementation.
- Ship as an **enhanced version of the same product**, not a replacement.

This avoids burnout and avoids “build into a wall.”

---

## Operating Principles (Non-Negotiable)

- **Preserve existing runtime contracts** in `query.ts`, `tools.ts`, `commands.ts`, `REPL`, `print`.
- **Additive architecture only** first; no invasive rewrite.
- **Feature flags + kill switches** for every enhancement.
- **Observe -> advise -> enforce** rollout path.
- **Compatibility-first** with existing sessions, plugins, MCP, hooks, remote/bridge.
- **Evidence-backed decisions** before policy hard-enforcement.

---

## Documentation Pack To Create First

Create this docs set before writing production code:

- `Vision-and-Guardrails.md`  
  Defines goals, non-goals, constraints, what must remain unchanged.
- `Current-State-Architecture.md`  
  Maps existing flow: input -> query -> tools -> persistence -> output.
- `Gap-Analysis-A-F.md`  
  Your strategic gaps + measurable impact targets.
- `Target-Architecture-vNext.md`  
  How Mission/Verification/Risk/Cost/Memory/Contracts fit current structure.
- `Migration-Plan-Strangler.md`  
  Incremental insertion points; what is shadow-mode first.
- `RFC-Mission-Engine.md`
- `RFC-Verification-First.md`
- `RFC-Risk-Policy-Engine.md`
- `RFC-Cost-Intelligent-Planner.md`
- `RFC-Memory-2.0.md`
- `RFC-MultiAgent-Contracts.md`
- `Rollout-and-Launch-Plan.md`  
  Internal rollout, public narrative, KPIs, de-risk checklist.

---

## How To Engineer A-F Without Disrupting Existing System

## A) Mission Engine
Integrate as orchestration layer around existing `QueryEngine` + task stack, not replacing them.

- Add mission schema: goal, constraints, budget, risk policy, success criteria, rollback plan.
- Wrap long tasks in lifecycle: Plan Contract -> Execute -> Verify -> Commit/Abort.
- Persist immutable evidence ledger per mission step.
- Keep old paths active; mission path opt-in first.

## B) Verification-First Runtime
Add verification stage in tool/turn completion flow.

- Add required check bundles (lint/test/typecheck/policy/semantic assertions).
- Standardize proof artifact object with pass/fail + evidence pointers.
- Add confidence + uncertainty model to final output metadata.
- Start advisory mode before blocking mode.

## C) Unified Risk Policy Engine
Centralize policy decisions currently spread across permissions/hooks/tool checks.

- Create risk scorer using sensitivity, blast radius, reversibility, environment.
- Map to dynamic guardrails: auto / scoped ask / hard approval.
- Produce immutable audit entries for decisions and approvals.
- Keep existing permission UX; policy engine becomes decision source behind it.

## D) Cost-Intelligent Planner
Introduce preflight optimization before execution.

- Cost bands: cheap / balanced / thorough.
- Phase-based model routing (discovery vs synthesis vs critical verification).
- Reuse verified intermediate outputs through cache + dedupe index.
- Output user-visible budget estimate and expected confidence.

## E) System-Aware Memory 2.0
Evolve `memdir` into hybrid memory graph while keeping markdown compatibility.

- Node types: preferences, architecture decisions, incidents, constraints, repo landmarks, tool outcomes.
- Evidence links to files/commits/tool results/session events.
- Freshness scoring with decay/refresh.
- Backward-compatible read path for current memory files.

## F) Multi-Agent Contract Framework
Keep existing subagent tooling, add contract/governance layer on top.

- Define input/output/tool/budget/acceptance-test contracts.
- Coordinator validates outputs before merge.
- Add arbitration when disagreements occur (confidence + verification weighted).
- Preserve current subagent behavior for non-contract mode.

---

## Program Execution Model (To Prevent Waste)

Run in 6 gated phases:

- **Phase 0: Baseline**  
  Capture current reliability, cost, latency, regression rate, task completion quality.
- **Phase 1: Specs**  
  Freeze RFCs and ADRs; no coding before acceptance criteria are clear.
- **Phase 2: Shadow Implementations**  
  New modules compute decisions but do not enforce.
- **Phase 3: Limited Enforcement**  
  Opt-in cohorts, high observability, strict rollback switch.
- **Phase 4: Default-On For Safe Domains**  
  Expand where metrics improve and regressions are below threshold.
- **Phase 5: Public Enhanced Launch**  
  Same brand, “Enhanced Runtime” release track.

Each phase has stop/go criteria so effort does not drift.

---

## Governance You Need Weekly

- Architecture review board (you + 2 senior engineers + QA/security rep).
- RFC acceptance checklist (correctness, compatibility, rollback, observability).
- Risk register and dependency map updated weekly.
- Burnout control: limit concurrent deep workstreams to 2 major + 1 support.
- Every feature must include: tests, metrics, kill switch, rollout plan.

---

## Public Positioning (Same Brand, Clearly Improved)

Don’t launch as new brand. Launch as:

- **“Claude Code Enhanced Runtime”** (or similar)
- “Built on existing trusted core, now with mission contracts, verification-first execution, unified risk policy, and cost-aware planning.”

Public proof should include:

- Before/after metrics.
- Reliability and safety improvements.
- Cost efficiency gains.
- Transparent governance/audit improvements.
- Migration and compatibility guarantees.

---

## Immediate Next Step I Recommend

I can help you draft the first 3 critical docs in high-detail form right now:

- `Vision-and-Guardrails.md`
- `Current-State-Architecture.md`
- `RFC-Mission-Engine.md`

Once those are locked, the rest of A-F becomes much faster and safer.

