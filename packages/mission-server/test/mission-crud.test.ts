import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeDb, initDb } from '../src/store.js'
import { createMission, getMission, listMissions } from '../src/missionRepo.js'
import { removeFile, tempDbFile } from './helpers.js'

describe('mission persistence', () => {
  let dbPath: string

  beforeEach(async () => {
    dbPath = tempDbFile()
    removeFile(dbPath)
    process.env.TENGU_MISSION_DB = dbPath
    await initDb()
  })

  afterEach(() => {
    closeDb()
    removeFile(dbPath)
    delete process.env.TENGU_MISSION_DB
  })

  it('create get list', () => {
    const m = createMission('Ship v1', ['constraint-a'])
    expect(m.missionId).toBeTruthy()
    const g = getMission(m.missionId)
    expect(g?.objective).toBe('Ship v1')
    expect(g?.constraints).toEqual(['constraint-a'])
    const list = listMissions(10)
    expect(list.some(x => x.missionId === m.missionId)).toBe(true)
  })
})
