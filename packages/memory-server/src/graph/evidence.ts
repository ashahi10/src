import type { EvidenceRef, MemoryNodeId } from '@tengu/shared-types'
import { getDb, scheduleSave } from './store.js'

export function attachEvidence(nodeId: MemoryNodeId, refs: EvidenceRef[]): EvidenceRef[] {
  const db = getDb()
  const now = Date.now()

  for (const ref of refs) {
    db.run(
      'INSERT INTO evidence_refs (node_id, type, uri, label, timestamp) VALUES (?, ?, ?, ?, ?)',
      [nodeId, ref.type, ref.uri, ref.label ?? null, ref.timestamp ?? now],
    )
  }

  db.run(
    'UPDATE nodes SET updated_at = ?, confidence = MIN(1.0, confidence + 0.1) WHERE node_id = ?',
    [now, nodeId],
  )
  scheduleSave()

  return getEvidenceForNode(nodeId)
}

export function getEvidenceForNode(nodeId: MemoryNodeId): EvidenceRef[] {
  const db = getDb()
  const results: EvidenceRef[] = []
  const stmt = db.prepare('SELECT * FROM evidence_refs WHERE node_id = ?')
  stmt.bind([nodeId])
  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push({
      type: row.type as EvidenceRef['type'],
      uri: row.uri as string,
      label: (row.label as string) ?? undefined,
      timestamp: (row.timestamp as number) ?? undefined,
    })
  }
  stmt.free()
  return results
}

export function getEvidenceCount(nodeId: MemoryNodeId): number {
  const db = getDb()
  const stmt = db.prepare('SELECT COUNT(*) as count FROM evidence_refs WHERE node_id = ?')
  stmt.bind([nodeId])
  stmt.step()
  const result = stmt.getAsObject()
  stmt.free()
  return Number(result.count)
}
