import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeDb, initDb } from '../src/store.js'
import { getProof, recordProof } from '../src/proofRepo.js'
import { removeFile, tempDbFile } from './helpers.js'

describe('verification proofs', () => {
  let dbPath: string

  beforeEach(async () => {
    dbPath = tempDbFile()
    removeFile(dbPath)
    process.env.TENGU_VERIFICATION_DB = dbPath
    await initDb()
  })

  afterEach(() => {
    closeDb()
    removeFile(dbPath)
    delete process.env.TENGU_VERIFICATION_DB
  })

  it('record and get proof with mission link', () => {
    const p = recordProof('mission-1', 'All checks passed', 'urn:mnemai:proof:1')
    expect(p.verificationId).toBeTruthy()
    const g = getProof(p.verificationId)
    expect(g?.summary).toBe('All checks passed')
    expect(g?.missionId).toBe('mission-1')
  })
})
