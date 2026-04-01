import type {
  MemoryNode,
  MemoryNodeType,
  MemoryQueryResult,
  MemoryScope,
} from '@tengu/shared-types'
import { listNodes } from '../graph/node.js'
import { isStale } from '../freshness/policy.js'
import { rankNodes } from './ranker.js'

export type QueryParams = {
  query: string
  nodeType?: MemoryNodeType
  sourceScope?: MemoryScope
  limit?: number
  includeStale?: boolean
  minFreshness?: number
  minConfidence?: number
  intent?: 'general' | 'decision_recall' | 'incident_triage' | 'preference_personalization'
}

export function queryMemory(params: QueryParams): MemoryQueryResult[] {
  const nodes = fetchAllNodes(params)

  const filtered = nodes.filter(node => {
    if (!params.includeStale && isStale(node.freshnessScore)) {
      return false
    }
    if (params.minFreshness !== undefined && node.freshnessScore < params.minFreshness) {
      return false
    }
    if (params.minConfidence !== undefined && node.confidence < params.minConfidence) {
      return false
    }
    return true
  })

  const queryTerms = params.query
    .split(/\s+/)
    .filter(t => t.length > 1)

  const ranked = rankNodes(filtered, queryTerms, {}, params.intent ?? 'general')

  const limit = params.limit ?? 20
  return ranked.slice(0, limit)
}

function fetchAllNodes(params: QueryParams) {
  const pageSize = 500
  const all: MemoryNode[] = []
  let offset = 0

  while (true) {
    const page = listNodes({
      nodeType: params.nodeType,
      sourceScope: params.sourceScope,
      limit: pageSize,
      offset,
    })
    all.push(...page)
    if (page.length < pageSize) break
    offset += pageSize
  }

  return all
}
