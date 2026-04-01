import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const server = new McpServer({
  name: 'tengu-contracts',
  version: '0.1.0',
})

server.tool(
  'contract.create',
  'Create a subagent contract with schemas, budget, tool allowlist, and acceptance tests',
  {
    agentType: z.string(),
    objectiveScope: z.string(),
    toolAllowlist: z.array(z.string()).optional(),
  },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Contract created for ${args.agentType}: ${args.objectiveScope}` }],
  }),
)

server.tool(
  'contract.validate',
  'Validate a contract definition for completeness and consistency',
  { contractId: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Contract ${args.contractId} validated` }],
  }),
)

server.tool(
  'contract.submit_result',
  'Submit execution result for a contract',
  { contractId: z.string(), outputPayload: z.record(z.unknown()) },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Result submitted for contract ${args.contractId}` }],
  }),
)

server.tool(
  'contract.check_merge',
  'Check whether a result is eligible for merge',
  { contractId: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Merge eligibility checked for contract ${args.contractId}` }],
  }),
)

server.tool(
  'contract.merge',
  'Merge a validated result into primary context',
  { contractId: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Contract ${args.contractId} result merged` }],
  }),
)

server.tool(
  'contract.arbitrate',
  'Resolve conflicts between competing results',
  { contractIds: z.array(z.string()) },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Arbitration between ${args.contractIds.length} contracts` }],
  }),
)

server.tool(
  'contract.get',
  'Retrieve contract details and current status',
  { contractId: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Contract ${args.contractId} details` }],
  }),
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  console.error('Fatal error starting contracts server:', error)
  process.exit(1)
})
