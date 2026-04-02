import { closeDb, initDb } from '../src/store.js'
import { getProof, recordProof } from '../src/proofRepo.js'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'tengu-verification-smoke-'))
const dbPath = join(dir, 'verification.db')
process.env.TENGU_VERIFICATION_DB = dbPath

await initDb()
const p = recordProof('smoke-mission', 'smoke summary', 'urn:smoke')
const g = getProof(p.verificationId)
if (!g || g.summary !== 'smoke summary') {
  console.error('Verification smoke: FAIL')
  process.exit(1)
}
closeDb()
rmSync(dir, { recursive: true, force: true })
console.log('Verification smoke: OK')
