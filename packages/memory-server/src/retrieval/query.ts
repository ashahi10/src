import type {
  MemoryNode,
  MemoryNodeType,
  MemoryQueryResult,
  MemoryScope,
} from '@tengu/shared-types'
import { getNodesByIds, listNodes, listRecentNodeIds } from '../graph/node.js'
import { isStale } from '../freshness/policy.js'
import { rankNodes } from './ranker.js'
import { getDb } from '../graph/store.js'
import {
  computeLexicalIndexRawScores,
  normalizeScores,
  searchIndexTableExists,
  countMemoryNodes,
} from './tokenIndex.js'
import { queryTermsFromString } from './tokenize.js'
import { cosineSimilarity, embedText, isEmbeddingsConfigured, loadEmbeddingsForNodes } from './embedding.js'
import {
  effectiveIndexHitCap,
  mergeCandidateNodeIds,
  parseQueryRetrievalBudget,
  selectIndexHitNodeIds,
} from './candidateSelection.js'

export type QueryParams = {
  query: string
  nodeType?: MemoryNodeType
  sourceScope?: MemoryScope
  limit?: number
  includeStale?: boolean
  minFreshness?: number
  minConfidence?: number
  intent?: 'general' | 'decision_recall' | 'incident_triage' | 'preference_personalization'
  /** When false, skip BM25-style token index (substring + optional semantic only). */
  useLexicalIndex?: boolean
  /** When false, never calls the embedding API during query. */
  useSemantic?: boolean
  /** Force loading all nodes (slow); default uses index-bounded candidates on large graphs. */
  forceFullScan?: boolean
}

function filterNodesByParams(nodes: MemoryNode[], params: QueryParams): MemoryNode[] {
  return nodes.filter(n => {
    if (params.nodeType && n.nodeType !== params.nodeType) return false
    if (params.sourceScope && n.sourceScope !== params.sourceScope) return false
    return true
  })
}

export async function queryMemory(params: QueryParams): Promise<MemoryQueryResult[]> {
  const db = getDb()
  const queryTerms = queryTermsFromString(params.query)
  const budget = parseQueryRetrievalBudget()
  const totalNodes = countMemoryNodes(db)

  const indexWanted = params.useLexicalIndex !== false && searchIndexTableExists(db) && queryTerms.length > 0
  const rawIndex = indexWanted ? computeLexicalIndexRawScores(db, queryTerms) : new Map<string, number>()
  const indexNorm = indexWanted && rawIndex.size > 0 ? normalizeScores(rawIndex) : undefined

  const limit = params.limit ?? 20
  const useIndexedCandidates =
    params.forceFullScan !== true
    && indexWanted
    && rawIndex.size > 0
    && (budget.fullScanMaxNodes === 0 || totalNodes > budget.fullScanMaxNodes)

  let nodes: MemoryNode[]
  if (!useIndexedCandidates) {
    nodes = fetchAllNodes(params)
  } else {
    const cap = effectiveIndexHitCap(limit, budget.indexCandidateCapFloor)
    const indexIds = selectIndexHitNodeIds(rawIndex, cap)
    const recentIds = listRecentNodeIds({
      nodeType: params.nodeType,
      sourceScope: params.sourceScope,
      limit: budget.recentSeedSize,
    })
    const mergedIds = mergeCandidateNodeIds(indexIds, recentIds)
    nodes = filterNodesByParams(getNodesByIds(mergedIds), params)
    if (nodes.length === 0) {
      nodes = fetchAllNodes(params)
    }
  }

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

  let semanticByNode: Map<string, number> | undefined
  let useSemanticInBlend = false
  if (params.useSemantic !== false && isEmbeddingsConfigured()) {
    try {
      const qEmb = await embedText(params.query)
      if (qEmb) {
        semanticByNode = new Map()
        const embMap = loadEmbeddingsForNodes(filtered.map(n => n.nodeId))
        for (const n of filtered) {
          const v = embMap.get(n.nodeId)
          semanticByNode.set(n.nodeId, v ? cosineSimilarity(qEmb, v) : 0)
        }
        useSemanticInBlend = true
      }
    } catch {
      // Network / API errors: degrade to lexical + index only
    }
  }

  const ranked = rankNodes(
    filtered,
    queryTerms,
    {},
    params.intent ?? 'general',
    {
      indexMatchByNodeId: indexNorm,
      semanticMatchByNodeId: semanticByNode,
      useSemanticInBlend,
    },
  )

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
