import { z } from 'zod'
import { MEMORY_NODE_TYPES, MEMORY_SCOPES } from '@mnemai/shared-types'
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
    'Allow query-time embedding call when MNEMAI_MEMORY_EMBED_* (or TENGU_MEMORY_EMBED_*) is configured (default true).',
  ),
  fullScan: z.boolean().optional().describe(
    'Load the entire filtered graph for ranking (slower, strongest recall). Default uses index-bounded candidates when the graph is larger than MNEMAI_MEMORY_QUERY_FULL_SCAN_MAX_NODES (or TENGU_* alias).',
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
    forceFullScan: args.fullScan,
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
