import type { MemoryNodeType, MemoryScope, MemoryStats } from '@tengu/shared-types'
import { MEMORY_NODE_TYPES, MEMORY_SCOPES } from '@tengu/shared-types'
import { getDb } from '../graph/store.js'
import { getStaleNodeIds, getContradictionPairs, countHighConfidenceWithoutEvidence } from '../freshness/policy.js'

/** sql.js: Statement.get() does not run parameterless queries; use step + getAsObject. */
function firstRow(
  db: ReturnType<typeof getDb>,
  sql: string,
  bind: (string | number | null | Uint8Array)[] = [],
): Record<string, unknown> | null {
  const stmt = db.prepare(sql)
  stmt.bind(bind)
  if (!stmt.step()) {
    stmt.free()
    return null
  }
  const row = stmt.getAsObject()
  stmt.free()
  return row as Record<string, unknown>
}

export function handleGetStats() {
  const db = getDb()

  const totalNodes = Number(firstRow(db, 'SELECT COUNT(*) as count FROM nodes')?.count ?? 0)
  const totalEdges = Number(firstRow(db, 'SELECT COUNT(*) as count FROM edges')?.count ?? 0)

  const nodesByType = {} as Record<MemoryNodeType, number>
  for (const nodeType of MEMORY_NODE_TYPES) {
    const row = firstRow(db, 'SELECT COUNT(*) as count FROM nodes WHERE node_type = ?', [nodeType])
    nodesByType[nodeType] = Number(row?.count ?? 0)
  }

  const nodesByScope = {} as Record<MemoryScope, number>
  for (const scope of MEMORY_SCOPES) {
    const row = firstRow(db, 'SELECT COUNT(*) as count FROM nodes WHERE source_scope = ?', [scope])
    nodesByScope[scope] = Number(row?.count ?? 0)
  }

  const avgFreshness =
    totalNodes > 0 ? Number(firstRow(db, 'SELECT AVG(freshness_score) as avg FROM nodes')?.avg ?? 0) : 0

  const avgConfidence =
    totalNodes > 0 ? Number(firstRow(db, 'SELECT AVG(confidence) as avg FROM nodes')?.avg ?? 0) : 0

  const lexicalIndexRowCount = Number(
    firstRow(db, 'SELECT COUNT(*) as count FROM node_search_tokens')?.count ?? 0,
  )
  const embeddedNodeCount = Number(
    firstRow(db, 'SELECT COUNT(*) as count FROM node_embeddings')?.count ?? 0,
  )

  const stats: MemoryStats = {
    totalNodes,
    totalEdges,
    nodesByType,
    nodesByScope,
    averageFreshness: Math.round(avgFreshness * 1000) / 1000,
    averageConfidence: Math.round(avgConfidence * 1000) / 1000,
    staleNodeCount: getStaleNodeIds().length,
    contradictionCount: getContradictionPairs().length,
    highConfidenceWithoutEvidenceCount: countHighConfidenceWithoutEvidence(),
    lexicalIndexRowCount,
    embeddedNodeCount,
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(stats, null, 2),
      },
    ],
  }
}
