import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const server = new McpServer({
  name: 'tengu-verification',
  version: '0.1.0',
})

server.tool(
  'verification.run_checks',
  'Run a bundle of verification checks against an objective',
  { objectiveClass: z.string(), objectiveId: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Verification checks run for ${args.objectiveClass}:${args.objectiveId}` }],
  }),
)

server.tool(
  'verification.get_proof',
  'Retrieve the proof artifact for a completed verification',
  { verificationId: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Proof artifact for verification ${args.verificationId}` }],
  }),
)

server.tool(
  'verification.compute_confidence',
  'Calculate confidence score with uncertainty reasons',
  { verificationId: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Confidence computed for verification ${args.verificationId}` }],
  }),
)

server.tool(
  'verification.request_waiver',
  'Request a governed waiver for a failed check',
  { checkId: z.string(), justification: z.string(), scope: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Waiver requested for check ${args.checkId}` }],
  }),
)

server.tool(
  'verification.get_policy',
  'Retrieve verification policy for a given objective class',
  { objectiveClass: z.string() },
  async (args) => ({
    content: [{ type: 'text' as const, text: `[STUB] Policy for objective class ${args.objectiveClass}` }],
  }),
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  console.error('Fatal error starting verification server:', error)
  process.exit(1)
})
