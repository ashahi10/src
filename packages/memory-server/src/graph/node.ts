import { v4 as uuidv4 } from 'uuid'
import type {
  EvidenceRef,
  MemoryNode,
  MemoryNodeId,
  MemoryNodeType,
  MemoryScope,
} from '@mnemai/shared-types'
import { HIGH_CONFIDENCE_MIN, MAX_CONFIDENCE_WITHOUT_EVIDENCE } from '../trustPolicy.js'
import { computeDecayedFreshness } from '../freshness/scorer.js'
import { getDb, scheduleSave } from './store.js'
import { replaceSearchIndexForNode, searchIndexTableExists } from '../retrieval/tokenIndex.js'

const DEFAULT_REVIEW_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000

export function createNode(params: {
  nodeType: MemoryNodeType
  content: string
  confidence?: number
  sourceScope?: MemoryScope
  tags?: string[]
  metadata?: Record<string, unknown>
  evidenceRefs?: EvidenceRef[]
  /** Spaced verification interval (ms); default 7 days. */
  reviewIntervalMs?: number
}): MemoryNode {
  const db = getDb()
  const now = Date.now()
  const nodeId = uuidv4() as MemoryNodeId

  let confidence = params.confidence ?? 0.5
  const hasEvidence = Boolean(params.evidenceRefs?.length)
  if (!hasEvidence && confidence >= HIGH_CONFIDENCE_MIN) {
    confidence = MAX_CONFIDENCE_WITHOUT_EVIDENCE
  }

  const reviewIntervalMs = params.reviewIntervalMs ?? DEFAULT_REVIEW_INTERVAL_MS
  const nextReviewAt = now + reviewIntervalMs
  const tagsJson = JSON.stringify(params.tags ?? [])

  db.run(
    `INSERT INTO nodes (node_id, node_type, content, confidence, freshness_score, created_at, updated_at, source_scope, tags, metadata,
      review_interval_ms, next_review_at, last_verified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      nodeId,
      params.nodeType,
      params.content,
      confidence,
      1.0,
      now,
      now,
      params.sourceScope ?? 'session',
      tagsJson,
      JSON.stringify(params.metadata ?? {}),
      reviewIntervalMs,
      nextReviewAt,
    ],
  )

  if (searchIndexTableExists(db)) {
    replaceSearchIndexForNode(db, nodeId, params.content, tagsJson)
  }

  if (params.evidenceRefs?.length) {
    for (const ref of params.evidenceRefs) {
      db.run(
        'INSERT INTO evidence_refs (node_id, type, uri, label, timestamp) VALUES (?, ?, ?, ?, ?)',
        [nodeId, ref.type, ref.uri, ref.label ?? null, ref.timestamp ?? null],
      )
    }
  }

  scheduleSave()
  return getNode(nodeId)!
}

export function getNode(nodeId: MemoryNodeId): MemoryNode | null {
  const db = getDb()

  const stmt = db.prepare('SELECT * FROM nodes WHERE node_id = ?')
  stmt.bind([nodeId])
  if (!stmt.step()) {
    stmt.free()
    return null
  }
  const row = stmt.getAsObject()
  stmt.free()

  const evidenceRows = queryAll(db, 'SELECT * FROM evidence_refs WHERE node_id = ?', [nodeId])

  return rowToNode(row, evidenceRows)
}

export function patchNodeMetadata(nodeId: MemoryNodeId, patch: Record<string, unknown>): MemoryNode | null {
  const node = getNode(nodeId)
  if (!node) return null
  const db = getDb()
  const metadata = { ...node.metadata, ...patch }
  db.run('UPDATE nodes SET metadata = ?, updated_at = ? WHERE node_id = ?', [
    JSON.stringify(metadata),
    Date.now(),
    nodeId,
  ])
  scheduleSave()
  return getNode(nodeId)
}

export function updateNodeContent(nodeId: MemoryNodeId, content: string): MemoryNode | null {
  const db = getDb()
  const now = Date.now()
  db.run('UPDATE nodes SET content = ?, updated_at = ? WHERE node_id = ?', [content, now, nodeId])
  scheduleSave()
  const node = getNode(nodeId)
  if (node && searchIndexTableExists(db)) {
    replaceSearchIndexForNode(db, nodeId, content, JSON.stringify(node.tags))
  }
  return node
}

export function deleteNode(nodeId: MemoryNodeId): boolean {
  const db = getDb()
  db.run('DELETE FROM evidence_refs WHERE node_id = ?', [nodeId])
  db.run('DELETE FROM edges WHERE from_node_id = ? OR to_node_id = ?', [nodeId, nodeId])
  db.run('DELETE FROM nodes WHERE node_id = ?', [nodeId])
  scheduleSave()
  return true
}

export function listNodes(params?: {
  nodeType?: MemoryNodeType
  sourceScope?: MemoryScope
  limit?: number
  offset?: number
}): MemoryNode[] {
  const db = getDb()
  const conditions: string[] = []
  const values: (string | number)[] = []

  if (params?.nodeType) {
    conditions.push('node_type = ?')
    values.push(params.nodeType)
  }
  if (params?.sourceScope) {
    conditions.push('source_scope = ?')
    values.push(params.sourceScope)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = params?.limit ?? 100
  const offset = params?.offset ?? 0

  const rows = queryAll(
    db,
    `SELECT * FROM nodes ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  )

  return rows.map(row => {
    const evidenceRows = queryAll(db, 'SELECT * FROM evidence_refs WHERE node_id = ?', [row.node_id as string])
    return rowToNode(row, evidenceRows)
  })
}

/** Recent node ids (for candidate seeding); same filters as `listNodes` but ids only. */
export function listRecentNodeIds(params: {
  nodeType?: MemoryNodeType
  sourceScope?: MemoryScope
  limit: number
}): MemoryNodeId[] {
  const db = getDb()
  const conditions: string[] = []
  const values: (string | number)[] = []

  if (params.nodeType) {
    conditions.push('node_type = ?')
    values.push(params.nodeType)
  }
  if (params.sourceScope) {
    conditions.push('source_scope = ?')
    values.push(params.sourceScope)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = queryAll(
    db,
    `SELECT node_id FROM nodes ${where} ORDER BY updated_at DESC LIMIT ?`,
    [...values, params.limit],
  )
  return rows.map(r => r.node_id as MemoryNodeId)
}

export function getNodesByIds(nodeIds: MemoryNodeId[]): MemoryNode[] {
  if (nodeIds.length === 0) return []
  const db = getDb()
  const out: MemoryNode[] = []
  const chunkSize = 80
  for (let i = 0; i < nodeIds.length; i += chunkSize) {
    const chunk = nodeIds.slice(i, i + chunkSize)
    const ph = chunk.map(() => '?').join(',')
    const rows = queryAll(db, `SELECT * FROM nodes WHERE node_id IN (${ph})`, chunk as unknown as string[])
    for (const row of rows) {
      const evidenceRows = queryAll(db, 'SELECT * FROM evidence_refs WHERE node_id = ?', [row.node_id as string])
      out.push(rowToNode(row, evidenceRows))
    }
  }
  return out
}

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

function rowToNode(row: Record<string, unknown>, evidenceRows: Record<string, unknown>[]): MemoryNode {
  const reviewIntervalRaw = row.review_interval_ms
  const nextReviewRaw = row.next_review_at
  const lastVerifiedRaw = row.last_verified_at

  return {
    nodeId: row.node_id as MemoryNodeId,
    nodeType: row.node_type as MemoryNodeType,
    content: row.content as string,
    confidence: row.confidence as number,
    freshnessScore: computeDecayedFreshness(row.freshness_score as number, row.updated_at as number),
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    sourceScope: row.source_scope as MemoryScope,
    tags: JSON.parse(row.tags as string) as string[],
    metadata: JSON.parse(row.metadata as string) as Record<string, unknown>,
    evidenceRefs: evidenceRows.map(e => ({
      type: e.type as EvidenceRef['type'],
      uri: e.uri as string,
      label: (e.label as string) ?? undefined,
      timestamp: (e.timestamp as number) ?? undefined,
    })),
    reviewIntervalMs: reviewIntervalRaw != null ? Number(reviewIntervalRaw) : undefined,
    nextReviewAt: nextReviewRaw != null ? Number(nextReviewRaw) : null,
    lastVerifiedAt: lastVerifiedRaw != null ? Number(lastVerifiedRaw) : null,
  }
}
