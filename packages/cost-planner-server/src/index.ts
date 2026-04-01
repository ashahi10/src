import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const server = new McpServer({
  name: 'tengu-cost-planner',
  version: '0.1.0',
})

server.tool(
  'planner.preflight',
  'Generate band options with cost envelopes and phase strategy for an objective',
  {
    objectiveDescription: z.string(),
    complexityIndicators: z.array(z.string()).optional(),
    expectedToolProfile: z.array(z.string()).optional(),
  },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Preflight plan for: ${args.objectiveDescription}` }],
  }),
)

server.tool(
  'planner.select_band',
  'Confirm band selection and lock budget envelope',
  { band: z.enum(['cheap', 'balanced', 'thorough']), objectiveId: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Band ${args.band} selected for ${args.objectiveId}` }],
  }),
)

server.tool(
  'planner.record_adaptation',
  'Log a phase-level strategy adaptation with rationale',
  { phase: z.string(), trigger: z.string(), rationale: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Adaptation recorded for phase ${args.phase}` }],
  }),
)

server.tool(
  'planner.check_reusable',
  'Look up verified reusable artifacts for a semantic key',
  { semanticKey: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Checking reusable artifacts for: ${args.semanticKey}` }],
  }),
)

server.tool(
  'planner.invalidate_cache',
  'Invalidate cached artifacts when policy or version changes',
  { reason: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Cache invalidated: ${args.reason}` }],
  }),
)

server.tool(
  'planner.get_summary',
  'Get cost tracking summary for current or past objectives',
  { objectiveId: z.string().optional() },
  async () => ({
    content: [{ type: 'text' as const, text: '[STUB] Cost tracking summary' }],
  }),
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  console.error('Fatal error starting cost planner server:', error)
  process.exit(1)
})
