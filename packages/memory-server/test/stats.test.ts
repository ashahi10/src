import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { initDb, closeDb } from '../src/graph/store.js'
import { createNode } from '../src/graph/node.js'
import { handleGetStats } from '../src/tools/getStats.js'
import { removeFile, tempDbFile } from './helpers.js'

describe('memory.stats', () => {
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

  it('returns accurate counts and highConfidenceWithoutEvidenceCount', () => {
    createNode({ nodeType: 'preference', content: 'a', sourceScope: 'session' })
    createNode({ nodeType: 'incident', content: 'b', sourceScope: 'project' })

    const stats = JSON.parse(handleGetStats().content[0].text) as {
      totalNodes: number
      nodesByType: Record<string, number>
      highConfidenceWithoutEvidenceCount: number
    }

    expect(stats.totalNodes).toBe(2)
    expect(stats.nodesByType.preference).toBe(1)
    expect(stats.nodesByType.incident).toBe(1)
    expect(stats.highConfidenceWithoutEvidenceCount).toBe(0)
  })
})
