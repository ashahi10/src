import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const server = new McpServer({
  name: 'tengu-risk',
  version: '0.1.0',
})

server.tool(
  'risk.evaluate',
  'Score an action and return risk class (R1/R2/R3), decision mode, and policy reasons',
  {
    actionDescriptor: z.string(),
    actionType: z.enum(['tool', 'command', 'file_operation', 'network', 'system', 'delegation']),
    targetScope: z.string().optional(),
  },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Risk evaluated for ${args.actionType}: ${args.actionDescriptor}` }],
  }),
)

server.tool(
  'risk.explain',
  'Get detailed breakdown of scoring dimensions for a given action',
  { actionDescriptor: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Risk explanation for: ${args.actionDescriptor}` }],
  }),
)

server.tool(
  'risk.batch_evaluate',
  'Evaluate multiple actions in a single call',
  { actions: z.array(z.object({ actionDescriptor: z.string(), actionType: z.string() })) },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Batch evaluated ${args.actions.length} actions` }],
  }),
)

server.tool(
  'risk.get_policy',
  'Retrieve the current active policy profile',
  {},
  async () => ({
    content: [{ type: 'text' as const, text: '[STUB] Current risk policy profile' }],
  }),
)

server.tool(
  'risk.list_audit',
  'Query audit records by time range, risk class, or correlation ID',
  { riskClass: z.enum(['R1', 'R2', 'R3']).optional(), limit: z.number().optional() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Audit records filtered by ${args.riskClass ?? 'all'}` }],
  }),
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  console.error('Fatal error starting risk server:', error)
  process.exit(1)
})
