import { closeDb, initDb } from '../src/store.js'
import { createMission, getMission } from '../src/missionRepo.js'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'mnemai-mission-smoke-'))
const dbPath = join(dir, 'mission.db')
process.env.TENGU_MISSION_DB = dbPath

await initDb()
const m = createMission('smoke objective', [])
const g = getMission(m.missionId)
if (!g || g.objective !== 'smoke objective') {
  console.error('Mission smoke: FAIL')
  process.exit(1)
}
closeDb()
rmSync(dir, { recursive: true, force: true })
console.log('Mission smoke: OK')
