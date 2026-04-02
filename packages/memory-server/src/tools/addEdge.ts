import { z } from 'zod'
import { RELATION_TYPES } from '@mnemai/shared-types'
import type { MemoryNodeId } from '@mnemai/shared-types'
import { createEdge } from '../graph/edge.js'
import { getNode } from '../graph/node.js'

export const addEdgeSchema = z.object({
  fromNodeId: z.string().describe('Source node ID'),
  toNodeId: z.string().describe('Target node ID'),
  relationType: z.enum(RELATION_TYPES).describe('Relationship type between nodes'),
  weight: z.number().min(0).max(1).optional().describe('Edge weight (0-1), default 1.0'),
})

export function handleAddEdge(args: z.infer<typeof addEdgeSchema>) {
  const fromNode = getNode(args.fromNodeId as MemoryNodeId)
  if (!fromNode) {
    return {
      content: [{ type: 'text' as const, text: `Error: source node ${args.fromNodeId} not found` }],
      isError: true,
    }
  }

  const toNode = getNode(args.toNodeId as MemoryNodeId)
  if (!toNode) {
    return {
      content: [{ type: 'text' as const, text: `Error: target node ${args.toNodeId} not found` }],
      isError: true,
    }
  }

  const edge = createEdge({
    fromNodeId: args.fromNodeId as MemoryNodeId,
    toNodeId: args.toNodeId as MemoryNodeId,
    relationType: args.relationType,
    weight: args.weight,
  })

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(edge, null, 2),
      },
    ],
  }
}
