import { z } from 'zod'
import { MEMORY_NODE_TYPES, MEMORY_SCOPES } from '@mnemai/shared-types'
import { HIGH_CONFIDENCE_MIN } from '../trustPolicy.js'
import { createNode } from '../graph/node.js'

export const createNodeSchema = z.object({
  nodeType: z.enum(MEMORY_NODE_TYPES),
  content: z.string().min(1).describe('The memory content to store'),
  confidence: z.number().min(0).max(1).optional().describe(
    `Initial confidence (0–1), default 0.5. Without evidenceRefs, values ≥${HIGH_CONFIDENCE_MIN} are capped (RFC §6.3).`,
  ),
  sourceScope: z.enum(MEMORY_SCOPES).optional().describe('Scope: session, project, or team'),
  tags: z.array(z.string()).optional().describe('Tags for categorization'),
  metadata: z.record(z.unknown()).optional().describe('Arbitrary metadata'),
  evidenceRefs: z.array(z.object({
    type: z.enum(['transcript', 'tool_result', 'verification', 'code_anchor', 'decision_record', 'external']),
    uri: z.string(),
    label: z.string().optional(),
    timestamp: z.number().int().optional(),
  })).optional().describe('Evidence references backing this memory'),
  reviewIntervalDays: z.number().min(1).max(365).optional().describe(
    'Days until first scheduled verification (spaced review); default 7.',
  ),
})

export function handleCreateNode(args: z.infer<typeof createNodeSchema>) {
  const requestedConfidence = args.confidence ?? 0.5
  const hadEvidence = Boolean(args.evidenceRefs?.length)

  const reviewIntervalMs = args.reviewIntervalDays != null
    ? args.reviewIntervalDays * 24 * 60 * 60 * 1000
    : undefined

  const node = createNode({
    nodeType: args.nodeType,
    content: args.content,
    confidence: args.confidence,
    sourceScope: args.sourceScope,
    tags: args.tags,
    metadata: args.metadata,
    evidenceRefs: args.evidenceRefs,
    reviewIntervalMs,
  })

  const confidenceCappedForMissingEvidence =
    !hadEvidence && requestedConfidence >= HIGH_CONFIDENCE_MIN && node.confidence < requestedConfidence

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            node,
            trustPolicy: { confidenceCappedForMissingEvidence },
          },
          null,
          2,
        ),
      },
    ],
  }
}
