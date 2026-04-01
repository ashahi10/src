import { z } from 'zod'
import { MEMORY_NODE_TYPES, MEMORY_SCOPES } from '@tengu/shared-types'
import { queryMemory } from '../retrieval/query.js'
import { isStale, hasContradictions } from '../freshness/policy.js'

export const queryMemorySchema = z.object({
  query: z.string().min(1).describe('Search query — keywords or natural language'),
  nodeType: z.enum(MEMORY_NODE_TYPES).optional().describe('Filter by memory type'),
  sourceScope: z.enum(MEMORY_SCOPES).optional().describe('Filter by scope'),
  limit: z.number().min(1).max(100).optional().describe('Max results, default 20'),
  includeStale: z.boolean().optional().describe('Include stale memories, default false'),
  minFreshness: z.number().min(0).max(1).optional().describe('Min freshness score'),
  minConfidence: z.number().min(0).max(1).optional().describe('Min confidence score'),
  intent: z.enum(['general', 'decision_recall', 'incident_triage', 'preference_personalization'])
    .optional()
    .describe('Retrieval profile for weighting and ranking behavior'),
  useLexicalIndex: z.boolean().optional().describe(
    'Include BM25-style portable token index in hybrid rank (default true when index exists).',
  ),
  useSemantic: z.boolean().optional().describe(
    'Allow query-time embedding call when TENGU_MEMORY_EMBED_* is configured (default true).',
  ),
})

export async function handleQueryMemory(args: z.infer<typeof queryMemorySchema>) {
  const results = await queryMemory({
    query: args.query,
    nodeType: args.nodeType,
    sourceScope: args.sourceScope,
    limit: args.limit,
    includeStale: args.includeStale ?? false,
    minFreshness: args.minFreshness,
    minConfidence: args.minConfidence,
    intent: args.intent,
    useLexicalIndex: args.useLexicalIndex,
    useSemantic: args.useSemantic,
  })

  const enriched = results.map(r => ({
    ...r,
    flags: {
      stale: isStale(r.node.freshnessScore),
      contradicted: hasContradictions(r.node.nodeId),
      hasEvidence: r.node.evidenceRefs.length > 0,
    },
  }))

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ count: enriched.length, results: enriched }, null, 2),
      },
    ],
  }
}
