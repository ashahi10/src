# Tengu MCP Suite

A suite of **6 Model Context Protocol (MCP) servers** that provide advanced AI agent infrastructure. Each server is a standalone, composable tool that works with any MCP-compatible client — Claude Code, Cursor, OpenAI agents, or custom frameworks.

## Servers

| Server | Package | Description |
|---|---|---|
| **Memory 2.0** | [`@tengu/memory-server`](packages/memory-server/README.md) | Evidence-linked memory graph with typed nodes, freshness decay, and contradiction handling |
| **Mission Engine** | `@tengu/mission-server` | Structured goal tracking with deterministic lifecycle state machine and verification gates |
| **Risk Policy** | `@tengu/risk-server` | Centralized risk scoring (R1/R2/R3) with auditable approval modes |
| **Verification** | `@tengu/verification-server` | First-class verification with proof artifacts, check bundles, and confidence scoring |
| **Cost Planner** | `@tengu/cost-planner-server` | Preflight cost/quality/risk band selection with phase-aware budget envelopes |
| **Multi-Agent Contracts** | `@tengu/contracts-server` | Formal subagent delegation contracts with validation, merge rules, and arbitration |

## Architecture

All servers share a common type library (`@tengu/shared-types`) and can optionally compose with each other at runtime via MCP tool calls. Each server works fully standalone.

```
packages/
├── shared-types/          # Common types across all servers
├── memory-server/         # Memory 2.0 — build first, most standalone
├── mission-server/        # Mission Engine
├── risk-server/           # Risk Policy Engine
├── verification-server/   # Verification-First Runtime
├── cost-planner-server/   # Cost-Intelligent Planner
└── contracts-server/      # Multi-Agent Contract Framework
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the memory server (stdio transport)
pnpm dev:memory
```

### Add to Claude Code

Add any server to your Claude Code MCP config (`~/.claude.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "tengu-memory": {
      "command": "node",
      "args": ["path/to/packages/memory-server/dist/index.js"]
    }
  }
}
```

## Tech Stack

- **Runtime:** Node.js >= 18
- **Language:** TypeScript (strict mode)
- **MCP SDK:** `@modelcontextprotocol/sdk`
- **Storage:** SQLite (portable `sql.js` default; native-optimized profile planned)
- **Schema validation:** `zod`
- **Monorepo:** pnpm workspaces

## Design Documents

Each server has an RFC spec in [`docs/`](docs/):

- [RFC: Memory 2.0](docs/RFC-Memory-2.0.md)
- [Memory 2.0 Competitive Benchmark](docs/Memory-2.0-Competitive-Benchmark.md)
- [Memory 2.0 Runtime Compatibility](docs/Memory-2.0-Runtime-Compatibility.md)
- [Memory 2.0 Ship Checklist](docs/Memory-2.0-Ship-Checklist.md)
- [Memory 2.0: SQL vs semantic / vector roadmap](docs/Memory-2.0-Architecture-SQL-vs-Semantic.md)
- [RFC: Mission Engine](docs/RFC-Mission-Engine.md)
- [RFC: Cost-Intelligent Planner](docs/RFC-Cost-Intelligent-Planner.md)
- [RFC: Risk Policy Engine](docs/RFC-Risk-Policy-Engine.md)
- [RFC: Verification-First Runtime](docs/RFC-Verification-First.md)
- [RFC: Multi-Agent Contracts](docs/RFC-MultiAgent-Contracts.md)

## License

MIT
