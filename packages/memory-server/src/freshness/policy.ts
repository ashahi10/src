import type { MemoryNodeId } from '@tengu/shared-types'
import { getDb } from '../graph/store.js'
import { getContradictions } from '../graph/edge.js'
import { HIGH_CONFIDENCE_MIN } from '../trustPolicy.js'
import { computeDecayedFreshness } from './scorer.js'

const STALE_THRESHOLD = 0.2

export function isStale(freshnessScore: number): boolean {
  return freshnessScore < STALE_THRESHOLD
}

export function hasContradictions(nodeId: MemoryNodeId): boolean {
  return getContradictions(nodeId).length > 0
}

export function isHighConfidence(nodeId: MemoryNodeId, confidence: number, freshnessScore: number): boolean {
  if (confidence < HIGH_CONFIDENCE_MIN) return false
  if (isStale(freshnessScore)) return false

  const db = getDb()
  const stmt = db.prepare('SELECT COUNT(*) as count FROM evidence_refs WHERE node_id = ?')
  stmt.bind([nodeId])
  stmt.step()
  const result = stmt.getAsObject()
  stmt.free()
  const evidenceCount = Number(result.count)

  if (evidenceCount === 0) return false
  if (hasContradictions(nodeId)) return false

  return true
}

export function getStaleNodeIds(): MemoryNodeId[] {
  const db = getDb()
  const results: MemoryNodeId[] = []
  const stmt = db.prepare('SELECT node_id, freshness_score, updated_at FROM nodes')
  while (stmt.step()) {
    const row = stmt.getAsObject()
    const freshness = computeDecayedFreshness(row.freshness_score as number, row.updated_at as number)
    if (freshness < STALE_THRESHOLD) {
      results.push(row.node_id as MemoryNodeId)
    }
  }
  stmt.free()
  return results
}

export function getContradictionPairs(): Array<{ nodeA: MemoryNodeId; nodeB: MemoryNodeId }> {
  const db = getDb()
  const results: Array<{ nodeA: MemoryNodeId; nodeB: MemoryNodeId }> = []
  const stmt = db.prepare(`SELECT from_node_id, to_node_id FROM edges WHERE relation_type = 'contradicts'`)
  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push({
      nodeA: row.from_node_id as MemoryNodeId,
      nodeB: row.to_node_id as MemoryNodeId,
    })
  }
  stmt.free()
  return results
}

export function countHighConfidenceWithoutEvidence(): number {
  const db = getDb()
  const stmt = db.prepare(
    `SELECT COUNT(*) as count FROM nodes n
     WHERE n.confidence >= ? AND NOT EXISTS (SELECT 1 FROM evidence_refs e WHERE e.node_id = n.node_id)`,
  )
  stmt.bind([HIGH_CONFIDENCE_MIN])
  stmt.step()
  const row = stmt.getAsObject()
  stmt.free()
  return Number(row.count)
}
