import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { MemoryNodeId } from '@tengu/shared-types'

import { createNodeSchema, handleCreateNode } from './tools/createNode.js'
import { queryMemorySchema, handleQueryMemory } from './tools/queryMemory.js'
import { addEdgeSchema, handleAddEdge } from './tools/addEdge.js'
import { attachEvidenceSchema, handleAttachEvidence } from './tools/attachEvidence.js'
import { refreshNodeSchema, handleRefreshNode } from './tools/refreshNode.js'
import { handleGetStats } from './tools/getStats.js'
import { getNode } from './graph/node.js'
import { getEdgesForNode } from './graph/edge.js'
import { initDb, closeDb } from './graph/store.js'

const server = new McpServer({
  name: 'tengu-memory',
  version: '0.1.0',
})

server.tool(
  'memory.create_node',
  'Create a typed memory node with content, scope, and optional evidence links',
  createNodeSchema.shape,
  async (args) => handleCreateNode(args),
)

server.tool(
  'memory.query',
  'Retrieve ranked memory nodes by relevance, freshness, and evidence strength',
  queryMemorySchema.shape,
  async (args) => handleQueryMemory(args),
)

server.tool(
  'memory.add_edge',
  'Create a typed relationship (supports, contradicts, depends_on, etc.) between two memory nodes',
  addEdgeSchema.shape,
  async (args) => handleAddEdge(args),
)

server.tool(
  'memory.attach_evidence',
  'Attach evidence references (transcript, tool result, code anchor, etc.) to an existing memory node',
  attachEvidenceSchema.shape,
  async (args) => handleAttachEvidence(args),
)

server.tool(
  'memory.refresh',
  'Reaffirm a memory node (explicit reaffirmation per RFC §7.2), boosting freshness; optional reaffirmationNote for provenance',
  refreshNodeSchema.shape,
  async (args) => handleRefreshNode(args),
)

server.tool(
  'memory.stats',
  'Get memory graph statistics: node counts by type/scope, freshness distribution, contradictions',
  {},
  async () => handleGetStats(),
)

server.registerResource(
  'memory_stats',
  'memory://stats',
  {
    description: 'Read-only graph statistics snapshot',
    mimeType: 'application/json',
  },
  async uri => {
    const stats = handleGetStats()
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: stats.content[0].text,
      }],
    }
  },
)

const memoryNodeTemplate = new ResourceTemplate('memory://node/{nodeId}', { list: undefined })

server.registerResource(
  'memory_node',
  memoryNodeTemplate,
  {
    description: 'Read-only single memory node with edges (URI template memory://node/{nodeId})',
    mimeType: 'application/json',
  },
  async (uri, variables) => {
    const raw = variables.nodeId
    const nodeId = (Array.isArray(raw) ? raw[0] : raw) as MemoryNodeId | undefined
    if (!nodeId) {
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({ error: 'Missing nodeId' }),
        }],
      }
    }
    const node = getNode(nodeId)
    if (!node) {
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({ error: 'Node not found' }),
        }],
      }
    }
    const edges = getEdgesForNode(nodeId)
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify({ node, edges }, null, 2),
      }],
    }
  },
)

async function main() {
  try {
    await initDb()
  } catch (error) {
    console.error(
      JSON.stringify({
        error: 'memory_db_unavailable',
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

main().catch((error) => {
  console.error('Fatal error starting memory server:', error)
  process.exit(1)
})
