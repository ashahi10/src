import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeDb, initDb } from '../src/graph/store.js'
import { createNode } from '../src/graph/node.js'
import { queryMemory } from '../src/retrieval/query.js'
import { removeFile, tempDbFile } from './helpers.js'

describe('performance smoke', () => {
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

  it('queries 2k memories within a practical latency budget', () => {
    for (let i = 0; i < 2000; i++) {
      createNode({
        nodeType: i % 11 === 0 ? 'incident' : 'general',
        content: `perf-mem-${i} keyword-${i % 20}`,
        sourceScope: 'project',
        tags: i % 3 === 0 ? ['critical'] : [],
      })
    }

    const start = Date.now()
    const results = queryMemory({
      query: 'keyword-7',
      includeStale: true,
      intent: 'incident_triage',
      limit: 40,
    })
    const elapsedMs = Date.now() - start

    expect(results.length).toBeGreaterThan(0)
    expect(elapsedMs).toBeLessThan(5000)
  })
})
