/**
 * Smoke test: graph + tool handlers (no MCP stdio).
 * Run from package root: pnpm run smoke
 */
import { unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const dbPath = process.env.TENGU_MEMORY_DB ?? join(pkgRoot, '.smoke-memory.db')

if (existsSync(dbPath)) {
  try {
    unlinkSync(dbPath)
  } catch {
    // ignore
  }
}
process.env.TENGU_MEMORY_DB = dbPath

const { initDb, closeDb } = await import('../src/graph/store.js')
const { handleCreateNode } = await import('../src/tools/createNode.js')
const { handleQueryMemory } = await import('../src/tools/queryMemory.js')
const { handleAddEdge } = await import('../src/tools/addEdge.js')
const { handleAttachEvidence } = await import('../src/tools/attachEvidence.js')
const { handleRefreshNode } = await import('../src/tools/refreshNode.js')
const { handleGetStats } = await import('../src/tools/getStats.js')
const { getNode } = await import('../src/graph/node.js')

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT FAIL: ${msg}`)
}

function parseJsonFromHandler(result: {
  content: Array<{ text: string }>
  isError?: boolean
}): Record<string, unknown> {
  const text = result.content[0].text
  if (result.isError) throw new Error(text)
  return JSON.parse(text) as Record<string, unknown>
}

await initDb()

const wrap1 = parseJsonFromHandler(
  handleCreateNode({
    nodeType: 'architecture_decision',
    content: 'Use PostgreSQL for primary datastore in billing service',
    sourceScope: 'project',
    tags: ['db', 'billing'],
    evidenceRefs: [{ type: 'decision_record', uri: 'https://example.com/adr/1' }],
  }),
)
const n1 = wrap1.node as Record<string, unknown>
assert(n1.nodeId && String(n1.content).includes('PostgreSQL'), 'create node 1')

const wrap2 = parseJsonFromHandler(
  handleCreateNode({
    nodeType: 'architecture_decision',
    content: 'Use MySQL for primary datastore in billing service',
    sourceScope: 'project',
    tags: ['db', 'billing'],
  }),
)
const n2 = wrap2.node as Record<string, unknown>
assert(n2.nodeId, 'create node 2')

const edge = parseJsonFromHandler(
  handleAddEdge({
    fromNodeId: String(n1.nodeId),
    toNodeId: String(n2.nodeId),
    relationType: 'contradicts',
    weight: 0.9,
  }),
)
assert(edge.relationType === 'contradicts', 'add contradicts edge')

const attach = parseJsonFromHandler(
  handleAttachEvidence({
    nodeId: String(n2.nodeId),
    evidenceRefs: [{ type: 'tool_result', uri: 'schema:mysql', label: 'probe' }],
  }),
)
const ev = attach.evidence as unknown[]
assert(Array.isArray(ev) && ev.length >= 1, 'attach evidence')

const q = parseJsonFromHandler(handleQueryMemory({ query: 'billing datastore', limit: 10 }))
assert(Number(q.count) >= 2, `query should return both nodes, got ${String(q.count)}`)
const results = q.results as Array<{ flags?: { contradicted?: boolean }; compositeScore?: number }>
const withFlags = results.filter(r => r.flags?.contradicted)
assert(withFlags.length >= 1, 'at least one result should flag contradicted')
assert(results.every(r => typeof r.compositeScore === 'number'), 'each result has compositeScore')

const stats = parseJsonFromHandler(handleGetStats())
assert(Number(stats.totalNodes) >= 2, 'stats totalNodes')
assert(Number(stats.contradictionCount) >= 1, 'stats contradictionCount')
assert(Number(stats.highConfidenceWithoutEvidenceCount) === 0, 'trust stats clean')

const before = getNode(n1.nodeId as import('@tengu/shared-types').MemoryNodeId)
assert(before, 'getNode n1')
const ref = parseJsonFromHandler(
  handleRefreshNode({ nodeId: String(n1.nodeId), reaffirmationNote: 'smoke test reaffirm' }),
)
const after = getNode(n1.nodeId as import('@tengu/shared-types').MemoryNodeId)
assert(typeof ref.newFreshness === 'number', 'refresh returns newFreshness')
assert(ref.reaffirmationRecorded === true, 'refresh records note')
assert(
  (after?.freshnessScore ?? 0) >= (before?.freshnessScore ?? 0),
  'refresh should not decrease freshness',
)

const errEdge = handleAddEdge({
  fromNodeId: '00000000-0000-0000-0000-000000000000',
  toNodeId: String(n2.nodeId),
  relationType: 'related_to',
})
assert(errEdge.isError === true, 'addEdge should error on missing node')

closeDb()
console.log('Memory 2.0 smoke tests: OK')
console.log('DB file:', dbPath)
