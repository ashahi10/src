import { z } from 'zod'
import type { MemoryNodeId } from '@mnemai/shared-types'
import { refreshNode } from '../freshness/scorer.js'
import { getNode, patchNodeMetadata } from '../graph/node.js'

export const refreshNodeSchema = z.object({
  nodeId: z.string().describe('Node ID to refresh/reaffirm'),
  reaffirmationNote: z
    .string()
    .max(2000)
    .optional()
    .describe('Optional provenance text for this explicit reaffirmation (RFC §7.2). Stored in node metadata.'),
})

export function handleRefreshNode(args: z.infer<typeof refreshNodeSchema>) {
  const node = getNode(args.nodeId as MemoryNodeId)
  if (!node) {
    return {
      content: [{ type: 'text' as const, text: `Error: node ${args.nodeId} not found` }],
      isError: true,
    }
  }

  const previousFreshness = node.freshnessScore
  const newFreshness = refreshNode(args.nodeId as MemoryNodeId)

  const note = args.reaffirmationNote?.trim()
  if (note) {
    patchNodeMetadata(args.nodeId as MemoryNodeId, {
      lastReaffirmationNote: note,
      lastReaffirmationAt: Date.now(),
    })
  }
  const reaffirmedNode = patchNodeMetadata(args.nodeId as MemoryNodeId, {
    reaffirmationCount: Number(node.metadata.reaffirmationCount ?? 0) + 1,
    lastReaffirmationAt: Date.now(),
  })

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          nodeId: args.nodeId,
          previousFreshness,
          newFreshness,
          boosted: newFreshness > previousFreshness,
          reaffirmationRecorded: Boolean(note),
          reaffirmationCount: Number(reaffirmedNode?.metadata.reaffirmationCount ?? 0),
        }, null, 2),
      },
    ],
  }
}
