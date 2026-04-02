import { v4 as uuidv4 } from 'uuid'
import { getDb, scheduleSave } from './store.js'

export type MissionRow = {
  missionId: string
  objective: string
  status: string
  constraints: string[]
  createdAt: number
  updatedAt: number
}

export function createMission(objective: string, constraints: string[]): MissionRow {
  const db = getDb()
  const missionId = uuidv4()
  const now = Date.now()
  const constraintsJson = JSON.stringify(constraints)
  db.run(
    `INSERT INTO missions (mission_id, objective, status, constraints_json, created_at, updated_at)
     VALUES (?, ?, 'active', ?, ?, ?)`,
    [missionId, objective, constraintsJson, now, now],
  )
  scheduleSave()
  return {
    missionId,
    objective,
    status: 'active',
    constraints,
    createdAt: now,
    updatedAt: now,
  }
}

function rowToMission(row: Record<string, unknown>): MissionRow | null {
  if (!row.mission_id) return null
  let constraints: string[] = []
  try {
    constraints = JSON.parse(String(row.constraints_json ?? '[]')) as string[]
  } catch {
    constraints = []
  }
  return {
    missionId: String(row.mission_id),
    objective: String(row.objective),
    status: String(row.status),
    constraints,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

export function getMission(missionId: string): MissionRow | null {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM missions WHERE mission_id = ?')
  stmt.bind([missionId])
  if (!stmt.step()) {
    stmt.free()
    return null
  }
  const row = stmt.getAsObject()
  stmt.free()
  return rowToMission(row as Record<string, unknown>)
}

export function listMissions(limit: number): MissionRow[] {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM missions ORDER BY updated_at DESC LIMIT ?')
  stmt.bind([limit])
  const out: MissionRow[] = []
  while (stmt.step()) {
    const m = rowToMission(stmt.getAsObject() as Record<string, unknown>)
    if (m) out.push(m)
  }
  stmt.free()
  return out
}
