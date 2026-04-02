import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { closeDb, initDb } from './store.js'
import { getProof, recordProof } from './proofRepo.js'

const server = new McpServer({
  name: 'mnemai-verification',
  version: '0.1.0',
})

server.tool(
  'verification.record_proof',
  'Store a proof artifact linked to an optional mission id',
  {
    missionId: z.string().min(1).optional().describe('Mission this proof applies to'),
    summary: z.string().min(1).describe('Short human-readable summary of what was verified'),
    detailUri: z.string().min(1).describe('URI or locator for the proof bundle / log'),
  },
  async args => {
    const proof = recordProof(args.missionId, args.summary, args.detailUri)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ proof }, null, 2) }],
    }
  },
)

server.tool(
  'verification.get_proof',
  'Retrieve a stored proof by verification id',
  { verificationId: z.string().min(1) },
  async args => {
    const proof = getProof(args.verificationId)
    if (!proof) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: 'proof_not_found' }, null, 2) }],
        isError: true,
      }
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ proof }, null, 2) }],
    }
  },
)

async function main() {
  try {
    await initDb()
  } catch (error) {
    console.error(
      JSON.stringify({
        error: 'verification_db_unavailable',
        message: error instanceof Error ? error.message : String(error),
      }),
    )
    process.exit(1)
  }

  const transport = new StdioServerTransport()
  await server.connect(transport)

  process.on('SIGINT', () => {
    closeDb()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    closeDb()
    process.exit(0)
  })
}

main().catch(error => {
  console.error('Fatal error starting verification server:', error)
  process.exit(1)
})
