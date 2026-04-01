import type { EvidenceRef, Timestamp } from './common.js'

export type MemoryNodeId = string & { readonly __brand: 'MemoryNodeId' }
export type MemoryEdgeId = string & { readonly __brand: 'MemoryEdgeId' }

export const MEMORY_NODE_TYPES = [
  'preference',
  'architecture_decision',
  'incident',
  'constraint',
  'repo_landmark',
  'tool_outcome',
  'general',
] as const
export type MemoryNodeType = (typeof MEMORY_NODE_TYPES)[number]

export const MEMORY_SCOPES = ['session', 'project', 'team'] as const
export type MemoryScope = (typeof MEMORY_SCOPES)[number]

export const RELATION_TYPES = [
  'supports',
  'contradicts',
  'depends_on',
  'supersedes',
  'related_to',
  'caused_by',
  'blocks',
] as const
export type RelationType = (typeof RELATION_TYPES)[number]

export type MemoryNode = {
  nodeId: MemoryNodeId
  nodeType: MemoryNodeType
  content: string
  confidence: number
  freshnessScore: number
  createdAt: Timestamp
  updatedAt: Timestamp
  evidenceRefs: EvidenceRef[]
  sourceScope: MemoryScope
  tags: string[]
  metadata: Record<string, unknown>
  /** Spaced verification: interval between reviews (ms). */
  reviewIntervalMs?: number
  /** When this node is due for human/agent verification (ms since epoch). */
  nextReviewAt?: Timestamp | null
  /** Last successful verification timestamp (ms), if any. */
  lastVerifiedAt?: Timestamp | null
}

export type MemoryEdge = {
  edgeId: MemoryEdgeId
  fromNodeId: MemoryNodeId
  toNodeId: MemoryNodeId
  relationType: RelationType
  weight: number
  createdAt: Timestamp
}

export type MemoryQueryResult = {
  node: MemoryNode
  /**
   * Primary lexical relevance (0–1): substring overlap with optional hybrid blend of
   * `indexMatchScore` / `semanticMatchScore` when those subsystems are active.
   */
  matchScore: number
  /**
   * BM25-style lexical index score from persisted token index (0–1), when enabled.
   * sql.js builds omit SQLite FTS5; this approximates inverted-index retrieval.
   */
  indexMatchScore?: number
  /** Cosine similarity vs query embedding when `memory.embed_node` + embed API are configured (0–1). */
  semanticMatchScore?: number
  /**
   * Ranking score per RFC §8: matchScore·w_r + freshness·w_f + evidenceStrength·w_e
   * (default weights: 0.35 / 0.35 / 0.30).
   */
  compositeScore: number
  freshnessScore: number
  evidenceStrength: number
  salienceScore: number
  evidenceQualityScore: number
  conflict: {
    hasConflict: boolean
    status: 'none' | 'resolved' | 'contested'
    winnerNodeId?: MemoryNodeId
    confidenceDelta?: number
  }
  edges: MemoryEdge[]
}

export type MemoryStats = {
  totalNodes: number
  totalEdges: number
  nodesByType: Record<MemoryNodeType, number>
  nodesByScope: Record<MemoryScope, number>
  averageFreshness: number
  averageConfidence: number
  staleNodeCount: number
  contradictionCount: number
  /** RFC §6.3 / §10: nodes with confidence ≥ 0.7 but no evidence rows (should be 0 with enforced writes). */
  highConfidenceWithoutEvidenceCount: number
  /** Rows in the portable lexical token index (BM25-style retrieval). */
  lexicalIndexRowCount?: number
  /** Nodes with at least one stored embedding vector. */
  embeddedNodeCount?: number
}

export type FreshnessConfig = {
  halfLifeMs: number
  minScore: number
  decayFunction: 'exponential' | 'linear' | 'step'
  refreshBoost: number
}
