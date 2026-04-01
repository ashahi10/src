import { v4 as uuidv4 } from 'uuid'
import type {
  EvidenceRef,
  MemoryNode,
  MemoryNodeId,
  MemoryNodeType,
  MemoryScope,
} from '@tengu/shared-types'
import { HIGH_CONFIDENCE_MIN, MAX_CONFIDENCE_WITHOUT_EVIDENCE } from '../trustPolicy.js'
import { computeDecayedFreshness } from '../freshness/scorer.js'
import { getDb, scheduleSave } from './store.js'

export function createNode(params: {
  nodeType: MemoryNodeType
  content: string
  confidence?: number
  sourceScope?: MemoryScope
  tags?: string[]
  metadata?: Record<string, unknown>
  evidenceRefs?: EvidenceRef[]
}): MemoryNode {
  const db = getDb()
  const now = Date.now()
  const nodeId = uuidv4() as MemoryNodeId

  let confidence = params.confidence ?? 0.5
  const hasEvidence = Boolean(params.evidenceRefs?.length)
  if (!hasEvidence && confidence >= HIGH_CONFIDENCE_MIN) {
    confidence = MAX_CONFIDENCE_WITHOUT_EVIDENCE
  }

  db.run(
    `INSERT INTO nodes (node_id, node_type, content, confidence, freshness_score, created_at, updated_at, source_scope, tags, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nodeId,
      params.nodeType,
      params.content,
      confidence,
      1.0,
      now,
      now,
      params.sourceScope ?? 'session',
      JSON.stringify(params.tags ?? []),
      JSON.stringify(params.metadata ?? {}),
    ],
  )

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
  return getNode(nodeId)
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
  }
}
