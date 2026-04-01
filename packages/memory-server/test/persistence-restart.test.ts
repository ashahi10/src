import { afterEach, describe, expect, it } from 'vitest'
import { initDb, closeDb } from '../src/graph/store.js'
import { createNode, getNode } from '../src/graph/node.js'
import { removeFile, tempDbFile } from './helpers.js'

describe('persistence and restart behavior', () => {
  let dbPath: string | undefined

  afterEach(() => {
    closeDb()
    if (dbPath) removeFile(dbPath)
  })

  it('persists data across close/init cycles', async () => {
    dbPath = tempDbFile()
    removeFile(dbPath)
    process.env.TENGU_MEMORY_DB = dbPath
    await initDb()

    const created = createNode({
      nodeType: 'architecture_decision',
      content: 'persist me across restarts',
      sourceScope: 'project',
      evidenceRefs: [{ type: 'decision_record', uri: 'adr://42' }],
    })

    closeDb()
    await initDb()

    const loaded = getNode(created.nodeId)
    expect(loaded).not.toBeNull()
    expect(loaded?.content).toContain('persist me')
    expect(loaded?.evidenceRefs.length).toBe(1)
  })
})
