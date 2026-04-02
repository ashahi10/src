import type { FreshnessConfig, MemoryNodeId } from '@mnemai/shared-types'
import { getDb, scheduleSave } from '../graph/store.js'

const DEFAULT_CONFIG: FreshnessConfig = {
  halfLifeMs: 7 * 24 * 60 * 60 * 1000,
  minScore: 0.05,
  decayFunction: 'exponential',
  refreshBoost: 0.3,
}

let config: FreshnessConfig = { ...DEFAULT_CONFIG }

export function setFreshnessConfig(newConfig: Partial<FreshnessConfig>): void {
  config = { ...DEFAULT_CONFIG, ...newConfig }
}

export function getFreshnessConfig(): FreshnessConfig {
  return { ...config }
}

export function computeFreshness(updatedAt: number, now: number = Date.now()): number {
  const ageMs = now - updatedAt
  if (ageMs <= 0) return 1.0

  let score: number
  switch (config.decayFunction) {
    case 'exponential':
      score = Math.pow(0.5, ageMs / config.halfLifeMs)
      break
    case 'linear':
      score = Math.max(0, 1.0 - ageMs / (config.halfLifeMs * 2))
      break
    case 'step': {
      const steps = Math.floor(ageMs / config.halfLifeMs)
      score = Math.pow(0.5, steps)
      break
    }
  }

  return Math.max(config.minScore, score)
}

/**
 * Freshness is modeled as a decayed value from a base score recorded at updatedAt.
 * This avoids O(N) decay updates on every query while preserving refresh boosts.
 */
export function computeDecayedFreshness(
  baseFreshness: number,
  updatedAt: number,
  now: number = Date.now(),
): number {
  const boundedBase = Math.min(1.0, Math.max(config.minScore, baseFreshness))
  const decay = computeFreshness(updatedAt, now)
  return Math.max(config.minScore, Math.min(1.0, boundedBase * decay))
}

export function refreshNode(nodeId: MemoryNodeId): number {
  const db = getDb()
  const now = Date.now()

  const stmt = db.prepare('SELECT freshness_score FROM nodes WHERE node_id = ?')
  stmt.bind([nodeId])
  if (!stmt.step()) {
    stmt.free()
    return 0
  }
  const row = stmt.getAsObject()
  stmt.free()

  const currentScore = row.freshness_score as number
  const newScore = Math.min(1.0, currentScore + config.refreshBoost)
  db.run('UPDATE nodes SET freshness_score = ?, updated_at = ? WHERE node_id = ?', [newScore, now, nodeId])
  scheduleSave()

  return newScore
}

export function decayAllNodes(): number {
  // Left for maintenance workflows only. Query paths use lazy decay.
  const db = getDb()
  const now = Date.now()

  const rows: Array<{ node_id: string; freshness_score: number; updated_at: number }> = []
  const stmt = db.prepare('SELECT node_id, freshness_score, updated_at FROM nodes')
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      node_id: row.node_id as string,
      freshness_score: row.freshness_score as number,
      updated_at: row.updated_at as number,
    })
  }
  stmt.free()

  let updated = 0
  for (const row of rows) {
    const newScore = computeDecayedFreshness(row.freshness_score, row.updated_at, now)
    db.run('UPDATE nodes SET freshness_score = ?, updated_at = ? WHERE node_id = ?', [newScore, now, row.node_id])
    updated++
  }

  if (updated > 0) scheduleSave()
  return updated
}
