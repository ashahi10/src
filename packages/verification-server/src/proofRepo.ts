import { v4 as uuidv4 } from 'uuid'
import { getDb, scheduleSave } from './store.js'

export type ProofRow = {
  verificationId: string
  missionId: string | null
  summary: string
  detailUri: string
  createdAt: number
}

export function recordProof(
  missionId: string | undefined,
  summary: string,
  detailUri: string,
): ProofRow {
  const db = getDb()
  const verificationId = uuidv4()
  const now = Date.now()
  db.run(
    `INSERT INTO proofs (verification_id, mission_id, summary, detail_uri, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [verificationId, missionId ?? null, summary, detailUri, now],
  )
  scheduleSave()
  return {
    verificationId,
    missionId: missionId ?? null,
    summary,
    detailUri,
    createdAt: now,
  }
}

export function getProof(verificationId: string): ProofRow | null {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM proofs WHERE verification_id = ?')
  stmt.bind([verificationId])
  if (!stmt.step()) {
    stmt.free()
    return null
  }
  const row = stmt.getAsObject() as Record<string, unknown>
  stmt.free()
  return {
    verificationId: String(row.verification_id),
    missionId: row.mission_id != null ? String(row.mission_id) : null,
    summary: String(row.summary),
    detailUri: String(row.detail_uri),
    createdAt: Number(row.created_at),
  }
}
