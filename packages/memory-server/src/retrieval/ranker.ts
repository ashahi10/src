import type { MemoryNode, MemoryQueryResult, MemoryNodeId } from '@tengu/shared-types'
import { getEdgesForNode } from '../graph/edge.js'
import type { RelationType } from '@tengu/shared-types'

type RankingWeights = {
  relevance: number
  freshness: number
  evidence: number
  salience: number
}

/** Defaults align with RFC §8 (three-factor composite; weights sum to 1). */
const DEFAULT_WEIGHTS: RankingWeights = {
  relevance: 0.3,
  freshness: 0.25,
  evidence: 0.25,
  salience: 0.2,
}

const INTENT_WEIGHTS: Record<'general' | 'decision_recall' | 'incident_triage' | 'preference_personalization', RankingWeights> = {
  general: DEFAULT_WEIGHTS,
  decision_recall: { relevance: 0.25, freshness: 0.2, evidence: 0.35, salience: 0.2 },
  incident_triage: { relevance: 0.35, freshness: 0.35, evidence: 0.2, salience: 0.1 },
  preference_personalization: { relevance: 0.35, freshness: 0.2, evidence: 0.15, salience: 0.3 },
}

export function rankNodes(
  nodes: MemoryNode[],
  queryTerms: string[],
  weights: Partial<RankingWeights> = {},
  intent: 'general' | 'decision_recall' | 'incident_triage' | 'preference_personalization' = 'general',
): MemoryQueryResult[] {
  const w = { ...INTENT_WEIGHTS[intent], ...weights }
  const nodeById = new Map(nodes.map(n => [n.nodeId, n]))

  const results: MemoryQueryResult[] = nodes.map(node => {
    const matchScore = computeMatchScore(node, queryTerms)
    const edges = getEdgesForNode(node.nodeId)
    const conflict = computeConflict(node, edges, nodeById)
    const evidenceQualityScore = computeEvidenceQualityScore(node, conflict.hasConflict)
    const salienceScore = computeSalienceScore(node)
    const evidenceStrength = evidenceQualityScore

    const compositeScore =
      matchScore * w.relevance
      + node.freshnessScore * w.freshness
      + evidenceStrength * w.evidence
      + salienceScore * w.salience

    return {
      node,
      matchScore,
      compositeScore,
      freshnessScore: node.freshnessScore,
      evidenceStrength,
      salienceScore,
      evidenceQualityScore,
      conflict,
      edges,
    }
  })

  results.sort((a, b) => b.compositeScore - a.compositeScore)

  return results
}

function computeMatchScore(node: MemoryNode, queryTerms: string[]): number {
  if (queryTerms.length === 0) return 0.5

  const content = node.content.toLowerCase()
  const tags = node.tags.map(t => t.toLowerCase())

  let matchCount = 0
  for (const term of queryTerms) {
    const lower = term.toLowerCase()
    if (content.includes(lower)) matchCount++
    if (tags.some(t => t.includes(lower))) matchCount += 0.5
  }

  return Math.min(1.0, matchCount / queryTerms.length)
}

function computeEvidenceQualityScore(node: MemoryNode, hasConflict: boolean): number {
  if (node.evidenceRefs.length === 0) return 0

  const now = Date.now()
  const weighted = node.evidenceRefs.map((ref) => {
    const typeWeight = evidenceTypeWeight(ref.type)
    const ts = ref.timestamp ?? now
    const ageDays = Math.max(0, (now - ts) / (1000 * 60 * 60 * 24))
    const recencyWeight = 1 / (1 + (ageDays / 30))
    return typeWeight * recencyWeight
  })

  const avg = weighted.reduce((sum, v) => sum + v, 0) / weighted.length
  const volume = Math.min(1.0, node.evidenceRefs.length / 5)
  const base = Math.min(1.0, (avg * 0.7) + (volume * 0.3))
  return hasConflict ? base * 0.85 : base
}

function evidenceTypeWeight(type: string): number {
  switch (type) {
    case 'verification': return 1.0
    case 'decision_record': return 0.95
    case 'tool_result': return 0.85
    case 'code_anchor': return 0.8
    case 'transcript': return 0.65
    case 'external': return 0.6
    default: return 0.5
  }
}

function computeSalienceScore(node: MemoryNode): number {
  const metadata = node.metadata ?? {}
  const reaffirmationCount = Number(metadata.reaffirmationCount ?? 0)
  const outcomeImpact = Number(metadata.outcomeImpact ?? 0)
  const userCorrected = Boolean(metadata.userCorrected)

  let score = 0.2
  if (node.nodeType === 'architecture_decision' || node.nodeType === 'constraint' || node.nodeType === 'incident') {
    score += 0.2
  }
  if (node.tags.some(tag => ['critical', 'decision', 'incident', 'blocker'].includes(tag.toLowerCase()))) {
    score += 0.15
  }
  if (userCorrected) {
    score += 0.2
  }
  score += Math.min(0.2, reaffirmationCount * 0.05)
  score += Math.min(0.25, Math.max(0, outcomeImpact) * 0.25)
  return Math.min(1.0, score)
}

function computeConflict(
  node: MemoryNode,
  edges: Array<{ relationType: RelationType; fromNodeId: MemoryNodeId; toNodeId: MemoryNodeId; weight: number }>,
  nodeById: Map<MemoryNodeId, MemoryNode>,
): MemoryQueryResult['conflict'] {
  const contradicting = edges.filter(e => e.relationType === 'contradicts')
  if (contradicting.length === 0) {
    return { hasConflict: false, status: 'none' }
  }

  let strongestOpponentScore = -1
  let winnerNodeId: MemoryNodeId | undefined
  const selfScore = node.confidence * node.freshnessScore * Math.max(0.1, computeEvidenceQualityScore(node, false))

  for (const edge of contradicting) {
    const otherId = edge.fromNodeId === node.nodeId ? edge.toNodeId : edge.fromNodeId
    const other = nodeById.get(otherId)
    if (!other) continue
    const otherScore = other.confidence
      * other.freshnessScore
      * Math.max(0.1, computeEvidenceQualityScore(other, false))
      * edge.weight

    if (otherScore > strongestOpponentScore) {
      strongestOpponentScore = otherScore
      winnerNodeId = otherId
    }
  }

  if (strongestOpponentScore < 0) {
    return { hasConflict: true, status: 'contested' }
  }

  const delta = Math.abs(selfScore - strongestOpponentScore)
  if (delta < 0.1) {
    return { hasConflict: true, status: 'contested', winnerNodeId, confidenceDelta: Number(delta.toFixed(3)) }
  }

  const selfWins = selfScore > strongestOpponentScore
  return {
    hasConflict: true,
    status: 'resolved',
    winnerNodeId: selfWins ? node.nodeId : winnerNodeId,
    confidenceDelta: Number(delta.toFixed(3)),
  }
}
