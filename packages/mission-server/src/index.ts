import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { closeDb, initDb } from './store.js'
import { createMission, getMission, listMissions } from './missionRepo.js'

const server = new McpServer({
  name: 'mnemai-mission',
  version: '0.1.0',
})

server.tool(
  'mission.create',
  'Create a mission with an objective and optional constraints; returns missionId',
  {
    objective: z.string().min(1),
    constraints: z.array(z.string()).optional(),
  },
  async args => {
    const m = createMission(args.objective, args.constraints ?? [])
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ mission: m }, null, 2) }],
    }
  },
)

server.tool(
  'mission.get',
  'Get a mission by id',
  { missionId: z.string().min(1) },
  async args => {
    const m = getMission(args.missionId)
    if (!m) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: 'mission_not_found' }, null, 2) }],
        isError: true,
      }
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ mission: m }, null, 2) }],
    }
  },
)

server.tool(
  'mission.list',
  'List missions newest first',
  { limit: z.number().int().min(1).max(500).optional() },
  async args => {
    const rows = listMissions(args.limit ?? 50)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ missions: rows, count: rows.length }, null, 2) }],
    }
  },
)

async function main() {
  try {
    await initDb()
  } catch (error) {
    console.error(
      JSON.stringify({
        error: 'mission_db_unavailable',
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
  console.error('Fatal error starting mission server:', error)
  process.exit(1)
})
