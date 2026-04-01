import type { MemoryNode, MemoryNodeId, MemoryScope } from '@tengu/shared-types'
import { refreshNode } from '../freshness/scorer.js'
import { getDb, scheduleSave } from './store.js'
import { getNode, patchNodeMetadata } from './node.js'

const MAX_REVIEW_INTERVAL_MS = 365 * 24 * 60 * 60 * 1000

function queryAll(db: ReturnType<typeof getDb>, sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = []
  const stmt = db.prepare(sql)
  stmt.bind(params as (string | number | null | Uint8Array)[])
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

/**
 * Scheduled verification queue: nodes with `next_review_at`, soonest first.
 * When `overdueOnly`, only rows with `next_review_at <= asOf`.
 */
export function listReviewQueue(params: {
  limit: number
  overdueOnly: boolean
  asOf?: number
  sourceScope?: MemoryScope
}): MemoryNode[] {
  const db = getDb()
  const asOf = params.asOf ?? Date.now()
  const conditions: string[] = ['next_review_at IS NOT NULL']
  const values: (string | number)[] = []

  if (params.overdueOnly) {
    conditions.push('next_review_at <= ?')
    values.push(asOf)
  }

  if (params.sourceScope) {
    conditions.push('source_scope = ?')
    values.push(params.sourceScope)
  }

  const where = conditions.join(' AND ')
  const sql = `SELECT node_id FROM nodes WHERE ${where} ORDER BY next_review_at ASC LIMIT ?`
  values.push(params.limit)

  const rows = queryAll(db, sql, values)
  const out: MemoryNode[] = []
  for (const r of rows) {
    const n = getNode(r.node_id as MemoryNodeId)
    if (n) out.push(n)
  }
  return out
}

/**
 * Mark a memory as verified: spaced interval doubles (capped), schedule next review, optional freshness boost.
 */
export function verifyNode(nodeId: MemoryNodeId, note?: string): MemoryNode | null {
  const node = getNode(nodeId)
  if (!node) return null

  const db = getDb()
  const now = Date.now()
  const currentInterval = node.reviewIntervalMs ?? 7 * 24 * 60 * 60 * 1000
  const nextInterval = Math.min(MAX_REVIEW_INTERVAL_MS, currentInterval * 2)

  db.run(
    `UPDATE nodes SET last_verified_at = ?, review_interval_ms = ?, next_review_at = ?, updated_at = ?
     WHERE node_id = ?`,
    [now, nextInterval, now + nextInterval, now, nodeId],
  )
  scheduleSave()

  refreshNode(nodeId)

  if (note?.trim()) {
    patchNodeMetadata(nodeId, {
      lastVerificationNote: note.trim(),
      lastVerificationAt: now,
    })
  }

  return getNode(nodeId)
}
