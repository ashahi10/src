import { z } from 'zod'
import type { MemoryNodeId } from '@tengu/shared-types'
import { verifyNode } from '../graph/review.js'

export const verifyNodeToolSchema = z.object({
  nodeId: z.string().min(1).describe('Memory node to mark verified'),
  note: z.string().max(2000).optional().describe('Optional verification note (stored in metadata)'),
})

export function handleVerifyNode(args: z.infer<typeof verifyNodeToolSchema>) {
  const updated = verifyNode(args.nodeId as MemoryNodeId, args.note)
  if (!updated) {
    return {
      content: [{ type: 'text' as const, text: `Error: node ${args.nodeId} not found` }],
      isError: true,
    }
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            node: updated,
            nextReviewAt: updated.nextReviewAt,
            reviewIntervalMs: updated.reviewIntervalMs,
          },
          null,
          2,
        ),
      },
    ],
  }
}
