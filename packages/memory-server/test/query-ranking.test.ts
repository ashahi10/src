import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { initDb, closeDb, getDb } from '../src/graph/store.js'
import { createNode } from '../src/graph/node.js'
import { queryMemory } from '../src/retrieval/query.js'
import { removeFile, tempDbFile } from './helpers.js'

describe('query memory', () => {
  let dbPath: string

  beforeEach(async () => {
    dbPath = tempDbFile()
    removeFile(dbPath)
    process.env.TENGU_MEMORY_DB = dbPath
    await initDb()

    createNode({
      nodeType: 'general',
      content: 'alpha keyword-one',
      sourceScope: 'project',
    })
    createNode({
      nodeType: 'general',
      content: 'beta keyword-two',
      sourceScope: 'project',
    })
  })

  afterEach(() => {
    closeDb()
    removeFile(dbPath)
  })

  it('applies minFreshness even when includeStale is true', () => {
    const low = queryMemory({
      query: 'keyword',
      includeStale: true,
      minFreshness: 1.01,
      limit: 20,
    })
    expect(low.length).toBe(0)
  })

  it('returns matchScore and compositeScore for ranking', () => {
    const results = queryMemory({ query: 'alpha', limit: 10 })
    expect(results.length).toBeGreaterThanOrEqual(1)
    const alpha = results.find(r => r.node.content.startsWith('alpha'))
    expect(alpha).toBeDefined()
    expect(alpha!.matchScore).toBeGreaterThan(0)
    expect(alpha!.compositeScore).toBeGreaterThan(0)
    expect(typeof alpha!.freshnessScore).toBe('number')
    expect(typeof alpha!.evidenceStrength).toBe('number')
  })

  it('orders by compositeScore descending', () => {
    const results = queryMemory({ query: 'keyword', limit: 10 })
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.compositeScore).toBeGreaterThanOrEqual(results[i]!.compositeScore)
    }
  })

  it('supports intent-aware ranking and conflict metadata', () => {
    const decision = createNode({
      nodeType: 'architecture_decision',
      content: 'use event sourcing in billing',
      confidence: 0.9,
      evidenceRefs: [{ type: 'verification', uri: 'verif://billing' }],
      tags: ['decision', 'critical'],
    })

    createNode({
      nodeType: 'architecture_decision',
      content: 'avoid event sourcing in billing',
      confidence: 0.7,
      evidenceRefs: [{ type: 'transcript', uri: 'transcript://meeting' }],
    })

    const results = queryMemory({ query: 'event sourcing', intent: 'decision_recall', includeStale: true })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.evidenceQualityScore).toBeGreaterThanOrEqual(0)
    expect(results[0]!.salienceScore).toBeGreaterThanOrEqual(0)
    expect(results[0]!.conflict).toBeDefined()
  })

  it('excludes stale nodes by default when includeStale is false', () => {
    const staleNode = createNode({
      nodeType: 'general',
      content: 'very old stale fact',
      sourceScope: 'project',
    })

    const oldTs = Date.now() - (400 * 24 * 60 * 60 * 1000)
    const db = getDb()
    db.run('UPDATE nodes SET updated_at = ? WHERE node_id = ?', [oldTs, staleNode.nodeId])

    const freshOnly = queryMemory({ query: 'stale fact', includeStale: false })
    expect(freshOnly.some(r => r.node.nodeId === staleNode.nodeId)).toBe(false)
  })
})
