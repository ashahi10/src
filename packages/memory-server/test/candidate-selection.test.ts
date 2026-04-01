import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { MemoryNodeId } from '@tengu/shared-types'
import {
  effectiveIndexHitCap,
  mergeCandidateNodeIds,
  selectIndexHitNodeIds,
} from '../src/retrieval/candidateSelection.js'
import { initDb, closeDb } from '../src/graph/store.js'
import { createNode } from '../src/graph/node.js'
import { queryMemory } from '../src/retrieval/query.js'
import { removeFile, tempDbFile } from './helpers.js'

describe('candidateSelection helpers', () => {
  it('effectiveIndexHitCap never drops below floor and scales with limit', () => {
    expect(effectiveIndexHitCap(20, 600)).toBe(600)
    expect(effectiveIndexHitCap(40, 600)).toBe(1000)
  })

  it('selectIndexHitNodeIds keeps all ids when under cap', () => {
    const m = new Map<string, number>([
      ['a', 1],
      ['b', 3],
      ['c', 2],
    ])
    const ids = selectIndexHitNodeIds(m, 10)
    expect(ids).toHaveLength(3)
    expect(new Set(ids)).toEqual(new Set(['a', 'b', 'c']))
  })

  it('selectIndexHitNodeIds keeps top scores when over cap', () => {
    const m = new Map<string, number>()
    for (let i = 0; i < 50; i++) {
      m.set(`id-${i}`, i)
    }
    const ids = selectIndexHitNodeIds(m, 10)
    expect(ids).toHaveLength(10)
    const scores = ids.map(id => m.get(id) ?? -1)
    const minKept = Math.min(...scores)
    for (let i = 0; i < 50; i++) {
      const key = `id-${i}` as MemoryNodeId
      const s = m.get(`id-${i}`)!
      if (!ids.includes(key)) {
        expect(s).toBeLessThanOrEqual(minKept)
      }
    }
  })

  it('mergeCandidateNodeIds dedupes preserving index order first', () => {
    const a = ['x', 'y'] as MemoryNodeId[]
    const b = ['y', 'z'] as MemoryNodeId[]
    expect(mergeCandidateNodeIds(a, b)).toEqual(['x', 'y', 'z'])
  })
})

describe('queryMemory indexed candidate path (integration)', () => {
  let dbPath: string
  let prevFullScanMax: string | undefined
  let prevCap: string | undefined
  let prevSeed: string | undefined

  beforeEach(async () => {
    prevFullScanMax = process.env.TENGU_MEMORY_QUERY_FULL_SCAN_MAX_NODES
    prevCap = process.env.TENGU_MEMORY_QUERY_INDEX_CANDIDATE_CAP
    prevSeed = process.env.TENGU_MEMORY_QUERY_RECENT_SEED
    process.env.TENGU_MEMORY_QUERY_FULL_SCAN_MAX_NODES = '400'
    process.env.TENGU_MEMORY_QUERY_INDEX_CANDIDATE_CAP = '80'
    process.env.TENGU_MEMORY_QUERY_RECENT_SEED = '30'

    dbPath = tempDbFile()
    removeFile(dbPath)
    process.env.TENGU_MEMORY_DB = dbPath
    await initDb()
  })

  afterEach(() => {
    closeDb()
    removeFile(dbPath)
    if (prevFullScanMax === undefined) delete process.env.TENGU_MEMORY_QUERY_FULL_SCAN_MAX_NODES
    else process.env.TENGU_MEMORY_QUERY_FULL_SCAN_MAX_NODES = prevFullScanMax
    if (prevCap === undefined) delete process.env.TENGU_MEMORY_QUERY_INDEX_CANDIDATE_CAP
    else process.env.TENGU_MEMORY_QUERY_INDEX_CANDIDATE_CAP = prevCap
    if (prevSeed === undefined) delete process.env.TENGU_MEMORY_QUERY_RECENT_SEED
    else process.env.TENGU_MEMORY_QUERY_RECENT_SEED = prevSeed
  })

  it('finds a rare tail node when graph exceeds full-scan threshold (index + seed)', async () => {
    for (let i = 0; i < 520; i++) {
      createNode({
        nodeType: 'general',
        content: `bulk noise ${i} sharedbulk`,
        sourceScope: 'project',
      })
    }
    const target = createNode({
      nodeType: 'general',
      content: 'tail-unique-zqx9 only here',
      sourceScope: 'project',
    })

    const results = await queryMemory({
      query: 'tail-unique-zqx9',
      includeStale: true,
      limit: 20,
    })
    expect(results.some(r => r.node.nodeId === target.nodeId)).toBe(true)
  })

  it('forceFullScan still recalls the same rare node on a large graph', async () => {
    for (let i = 0; i < 520; i++) {
      createNode({
        nodeType: 'general',
        content: `bulk noise ${i} sharedbulk`,
        sourceScope: 'project',
      })
    }
    const target = createNode({
      nodeType: 'general',
      content: 'force-scan-token-99 only',
      sourceScope: 'project',
    })

    const indexed = await queryMemory({
      query: 'force-scan-token-99',
      includeStale: true,
      limit: 5,
    })
    const full = await queryMemory({
      query: 'force-scan-token-99',
      includeStale: true,
      limit: 5,
      forceFullScan: true,
    })
    expect(indexed.some(r => r.node.nodeId === target.nodeId)).toBe(true)
    expect(full.some(r => r.node.nodeId === target.nodeId)).toBe(true)
  })
})
