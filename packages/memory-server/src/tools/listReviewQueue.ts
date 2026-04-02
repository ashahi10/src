import { z } from 'zod'
import { MEMORY_SCOPES } from '@mnemai/shared-types'
import { listReviewQueue } from '../graph/review.js'

export const listReviewQueueSchema = z.object({
  limit: z.number().min(1).max(200).optional().describe('Max nodes to return, default 50'),
  overdueOnly: z.boolean().optional().describe('Only nodes with next_review_at <= now (default false = upcoming queue sorted soonest)'),
  asOf: z.number().int().optional().describe('Reference time (ms epoch); default Date.now()'),
  sourceScope: z.enum(MEMORY_SCOPES).optional().describe('Filter by session / project / team'),
})

export function handleListReviewQueue(args: z.infer<typeof listReviewQueueSchema>) {
  const nodes = listReviewQueue({
    limit: args.limit ?? 50,
    overdueOnly: args.overdueOnly ?? false,
    asOf: args.asOf,
    sourceScope: args.sourceScope,
  })

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ count: nodes.length, nodes }, null, 2),
      },
    ],
  }
}
