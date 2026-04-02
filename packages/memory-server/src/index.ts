import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { MemoryNodeId } from '@mnemai/shared-types'

import { createNodeSchema, handleCreateNode } from './tools/createNode.js'
import { queryMemorySchema, handleQueryMemory } from './tools/queryMemory.js'
import { addEdgeSchema, handleAddEdge } from './tools/addEdge.js'
import { attachEvidenceSchema, handleAttachEvidence } from './tools/attachEvidence.js'
import { refreshNodeSchema, handleRefreshNode } from './tools/refreshNode.js'
import { handleGetStats } from './tools/getStats.js'
import { listReviewQueueSchema, handleListReviewQueue } from './tools/listReviewQueue.js'
import { verifyNodeToolSchema, handleVerifyNode } from './tools/verifyNode.js'
import { embedNodeSchema, handleEmbedNode } from './tools/embedNode.js'
import { getNode } from './graph/node.js'
import { getEdgesForNode } from './graph/edge.js'
import { initDb, closeDb } from './graph/store.js'

const server = new McpServer({
  name: 'mnemai-memory',
  version: '0.1.2',
})

server.tool(
  'memory.create_node',
  'Create a typed memory node with content, scope, and optional evidence links',
  createNodeSchema.shape,
  async (args) => handleCreateNode(args),
)

server.tool(
  'memory.query',
  'Retrieve ranked memory nodes by hybrid lexical (substring + BM25-style token index) and optional embeddings, plus freshness and evidence strength',
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

server.tool(
  'memory.list_review_queue',
  'List memory nodes scheduled for spaced verification (next_review_at), overdue or full upcoming queue',
  listReviewQueueSchema.shape,
  async (args) => handleListReviewQueue(args),
)

server.tool(
  'memory.verify_node',
  'Mark a memory as verified: doubles review interval (capped), schedules next_review_at, boosts freshness',
  verifyNodeToolSchema.shape,
  async (args) => handleVerifyNode(args),
)

server.tool(
  'memory.embed_node',
  'Store an embedding vector for a node (requires TENGU_MEMORY_EMBED_URL + TENGU_MEMORY_EMBED_KEY); enables semantic channel in memory.query',
  embedNodeSchema.shape,
  async (args) => handleEmbedNode(args),
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
  const argv = process.argv.slice(2)
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`@mnemai/memory-server — MCP Memory 2.0 (stdio transport)

Usage: mnemai-memory
  Starts the Model Context Protocol server on stdin/stdout (no HTTP port).

Docs: https://www.npmjs.com/package/@mnemai/memory-server
Environment: TENGU_MEMORY_DB (SQLite path), TENGU_MEMORY_EMBED_* (optional embeddings).
`)
    process.exit(0)
  }

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
