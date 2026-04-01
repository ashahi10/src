import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { initDb, closeDb } from '../src/graph/store.js'
import { createNode } from '../src/graph/node.js'
import { queryMemory } from '../src/retrieval/query.js'
import { removeFile, tempDbFile } from './helpers.js'

describe('retrieval scale and recall', () => {
  let dbPath: string

  beforeEach(async () => {
    dbPath = tempDbFile()
    removeFile(dbPath)
    process.env.TENGU_MEMORY_DB = dbPath
    await initDb()
  })

  afterEach(() => {
    closeDb()
    removeFile(dbPath)
  })

  it('retrieves matches beyond the first 500 nodes', () => {
    for (let i = 0; i < 620; i++) {
      createNode({
        nodeType: 'general',
        content: `noise item ${i}`,
        sourceScope: 'project',
      })
    }

    const target = createNode({
      nodeType: 'incident',
      content: 'critical-late-token appears in tail segment',
      sourceScope: 'project',
    })

    const results = queryMemory({
      query: 'critical-late-token',
      includeStale: true,
      limit: 50,
    })

    expect(results.some(r => r.node.nodeId === target.nodeId)).toBe(true)
  })
})
