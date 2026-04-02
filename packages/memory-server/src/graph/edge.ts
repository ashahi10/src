import { v4 as uuidv4 } from 'uuid'
import type {
  MemoryEdge,
  MemoryEdgeId,
  MemoryNodeId,
  RelationType,
} from '@mnemai/shared-types'
import { getDb, scheduleSave } from './store.js'

export function createEdge(params: {
  fromNodeId: MemoryNodeId
  toNodeId: MemoryNodeId
  relationType: RelationType
  weight?: number
}): MemoryEdge {
  const db = getDb()
  const edgeId = uuidv4() as MemoryEdgeId
  const now = Date.now()

  db.run(
    `INSERT INTO edges (edge_id, from_node_id, to_node_id, relation_type, weight, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      edgeId,
      params.fromNodeId,
      params.toNodeId,
      params.relationType,
      params.weight ?? 1.0,
      now,
    ],
  )
  scheduleSave()

  return {
    edgeId,
    fromNodeId: params.fromNodeId,
    toNodeId: params.toNodeId,
    relationType: params.relationType,
    weight: params.weight ?? 1.0,
    createdAt: now,
  }
}

export function getEdgesForNode(nodeId: MemoryNodeId): MemoryEdge[] {
  const db = getDb()
  return queryEdges(db, 'SELECT * FROM edges WHERE from_node_id = ? OR to_node_id = ?', [nodeId, nodeId])
}

export function getContradictions(nodeId: MemoryNodeId): MemoryEdge[] {
  const db = getDb()
  return queryEdges(
    db,
    `SELECT * FROM edges WHERE (from_node_id = ? OR to_node_id = ?) AND relation_type = 'contradicts'`,
    [nodeId, nodeId],
  )
}

export function deleteEdge(edgeId: MemoryEdgeId): boolean {
  const db = getDb()
  db.run('DELETE FROM edges WHERE edge_id = ?', [edgeId])
  scheduleSave()
  return true
}

function queryEdges(db: ReturnType<typeof getDb>, sql: string, params: unknown[]): MemoryEdge[] {
  const results: MemoryEdge[] = []
  const stmt = db.prepare(sql)
  stmt.bind(params as (string | number | null | Uint8Array)[])
  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push({
      edgeId: row.edge_id as MemoryEdgeId,
      fromNodeId: row.from_node_id as MemoryNodeId,
      toNodeId: row.to_node_id as MemoryNodeId,
      relationType: row.relation_type as RelationType,
      weight: row.weight as number,
      createdAt: row.created_at as number,
    })
  }
  stmt.free()
  return results
}
