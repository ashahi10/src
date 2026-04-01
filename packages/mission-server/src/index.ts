import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const server = new McpServer({
  name: 'tengu-mission',
  version: '0.1.0',
})

server.tool(
  'mission.create',
  'Create a new mission with objective, constraints, budget, and success criteria',
  { objective: z.string(), constraints: z.array(z.string()).optional() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Mission created: ${args.objective}` }],
  }),
)

server.tool(
  'mission.plan',
  'Transition mission to planned state with defined steps',
  { missionId: z.string(), steps: z.array(z.object({ intent: z.string() })) },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Mission ${args.missionId} planned with ${args.steps.length} steps` }],
  }),
)

server.tool(
  'mission.execute_step',
  'Execute and record a mission step with evidence',
  { missionId: z.string(), stepId: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Step ${args.stepId} executed for mission ${args.missionId}` }],
  }),
)

server.tool(
  'mission.verify',
  'Run verification against success criteria',
  { missionId: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Verification run for mission ${args.missionId}` }],
  }),
)

server.tool(
  'mission.complete',
  'Mark mission as completed (requires verification pass or waiver)',
  { missionId: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Mission ${args.missionId} completed` }],
  }),
)

server.tool(
  'mission.abort',
  'Abort a mission with reason',
  { missionId: z.string(), reason: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Mission ${args.missionId} aborted: ${args.reason}` }],
  }),
)

server.tool(
  'mission.get',
  'Retrieve current mission state',
  { missionId: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Get mission ${args.missionId}` }],
  }),
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  console.error('Fatal error starting mission server:', error)
  process.exit(1)
})
