import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { initDb, closeDb } from '../src/graph/store.js'
import { createNode } from '../src/graph/node.js'
import { queryMemory } from '../src/retrieval/query.js'
import { removeFile, tempDbFile } from './helpers.js'

describe('hybrid lexical index', () => {
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

  it('includes indexMatchScore when query has tokens', async () => {
    createNode({
      nodeType: 'general',
      content: 'zebra unique-token-xyz',
      sourceScope: 'project',
    })
    const results = await queryMemory({ query: 'unique-token-xyz', includeStale: true, limit: 5 })
    expect(results.length).toBeGreaterThan(0)
    const hit = results.find(r => r.node.content.includes('unique-token-xyz'))
    expect(hit).toBeDefined()
    expect(typeof hit!.indexMatchScore).toBe('number')
    expect(hit!.indexMatchScore!).toBeGreaterThanOrEqual(0)
  })

  it('useLexicalIndex false omits index channel from hybrid metadata shape', async () => {
    createNode({ nodeType: 'general', content: 'plain alpha beta', sourceScope: 'project' })
    const withIndex = await queryMemory({ query: 'alpha beta', includeStale: true, limit: 3 })
    expect(withIndex[0]?.indexMatchScore).toBeDefined()

    const noIndex = await queryMemory({
      query: 'alpha beta',
      includeStale: true,
      limit: 3,
      useLexicalIndex: false,
    })
    expect(noIndex[0]?.indexMatchScore).toBeUndefined()
  })
})
