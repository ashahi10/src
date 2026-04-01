import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeDb, initDb } from '../src/graph/store.js'
import { handleCreateNode } from '../src/tools/createNode.js'
import { handleQueryMemory } from '../src/tools/queryMemory.js'
import { handleRefreshNode } from '../src/tools/refreshNode.js'
import { removeFile, tempDbFile } from './helpers.js'

describe('handler contract stability', () => {
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

  it('create_node returns wrapped node and trustPolicy', () => {
    const res = handleCreateNode({
      nodeType: 'general',
      content: 'contract test',
      confidence: 0.95,
    })

    const body = JSON.parse(res.content[0].text) as {
      node: { nodeId: string; confidence: number }
      trustPolicy: { confidenceCappedForMissingEvidence: boolean }
    }
    expect(body.node.nodeId).toBeTruthy()
    expect(typeof body.node.confidence).toBe('number')
    expect(typeof body.trustPolicy.confidenceCappedForMissingEvidence).toBe('boolean')
  })

  it('query returns enriched ranking fields including conflict/salience/evidenceQuality', async () => {
    handleCreateNode({
      nodeType: 'architecture_decision',
      content: 'contract query decision',
      sourceScope: 'project',
      evidenceRefs: [{ type: 'verification', uri: 'verify://1' }],
      tags: ['decision', 'critical'],
    })

    const res = await handleQueryMemory({
      query: 'contract query decision',
      intent: 'decision_recall',
      includeStale: true,
      limit: 5,
    })
    const body = JSON.parse(res.content[0].text) as {
      count: number
      results: Array<{
        compositeScore: number
        evidenceQualityScore: number
        salienceScore: number
        conflict: { hasConflict: boolean; status: string }
      }>
    }

    expect(body.count).toBeGreaterThan(0)
    expect(body.results[0]).toHaveProperty('compositeScore')
    expect(body.results[0]).toHaveProperty('evidenceQualityScore')
    expect(body.results[0]).toHaveProperty('salienceScore')
    expect(body.results[0]).toHaveProperty('conflict')
  })

  it('refresh accepts reaffirmationNote and records metadata response', () => {
    const create = JSON.parse(handleCreateNode({
      nodeType: 'general',
      content: 'refresh contract',
      sourceScope: 'session',
    }).content[0].text) as { node: { nodeId: string } }

    const refreshed = JSON.parse(handleRefreshNode({
      nodeId: create.node.nodeId,
      reaffirmationNote: 'validated in production rollback',
    }).content[0].text) as {
      reaffirmationRecorded: boolean
      reaffirmationCount: number
    }

    expect(refreshed.reaffirmationRecorded).toBe(true)
    expect(refreshed.reaffirmationCount).toBeGreaterThan(0)
  })
})
