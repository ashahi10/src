import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { initDb, closeDb } from '../src/graph/store.js'
import { createNode } from '../src/graph/node.js'
import { handleCreateNode } from '../src/tools/createNode.js'
import { MAX_CONFIDENCE_WITHOUT_EVIDENCE, HIGH_CONFIDENCE_MIN } from '../src/trustPolicy.js'
import { isHighConfidence } from '../src/freshness/policy.js'
import { removeFile, tempDbFile } from './helpers.js'

describe('trust policy (RFC §6.3)', () => {
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

  it('caps confidence when there is no evidence', () => {
    const raw = JSON.parse(handleCreateNode({ nodeType: 'general', content: 'x', confidence: 0.95 }).content[0].text) as {
      node: { confidence: number; nodeId: string; freshnessScore: number }
      trustPolicy: { confidenceCappedForMissingEvidence: boolean }
    }
    expect(raw.node.confidence).toBe(MAX_CONFIDENCE_WITHOUT_EVIDENCE)
    expect(raw.trustPolicy.confidenceCappedForMissingEvidence).toBe(true)
    expect(
      isHighConfidence(raw.node.nodeId as import('@mnemai/shared-types').MemoryNodeId, raw.node.confidence, raw.node.freshnessScore),
    ).toBe(false)
  })

  it('allows high confidence when evidence is present', () => {
    const node = createNode({
      nodeType: 'general',
      content: 'documented',
      confidence: 0.85,
      evidenceRefs: [{ type: 'decision_record', uri: 'https://example.com/adr/1' }],
    })
    expect(node.confidence).toBe(0.85)
    expect(isHighConfidence(node.nodeId, node.confidence, node.freshnessScore)).toBe(true)
  })

  it('does not cap below high-confidence threshold', () => {
    const node = createNode({ nodeType: 'general', content: 'y', confidence: HIGH_CONFIDENCE_MIN - 0.01 })
    expect(node.confidence).toBe(HIGH_CONFIDENCE_MIN - 0.01)
  })
})
