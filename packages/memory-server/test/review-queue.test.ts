import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { initDb, closeDb, getDb } from '../src/graph/store.js'
import { createNode } from '../src/graph/node.js'
import { listReviewQueue, verifyNode } from '../src/graph/review.js'
import { handleListReviewQueue } from '../src/tools/listReviewQueue.js'
import { handleVerifyNode } from '../src/tools/verifyNode.js'
import { removeFile, tempDbFile } from './helpers.js'

describe('review queue (spaced verification)', () => {
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

  it('schedules next_review_at on create and surfaces via list_review_queue', () => {
    const n = createNode({
      nodeType: 'general',
      content: 'review me later',
      sourceScope: 'project',
      reviewIntervalMs: 24 * 60 * 60 * 1000,
    })
    expect(n.nextReviewAt).toBeDefined()
    expect(n.nextReviewAt).toBeGreaterThan(Date.now())

    const q = listReviewQueue({ limit: 10, overdueOnly: false })
    expect(q.some(x => x.nodeId === n.nodeId)).toBe(true)

    const tool = handleListReviewQueue({ limit: 5, overdueOnly: false })
    const body = JSON.parse(tool.content[0].text) as { count: number }
    expect(body.count).toBeGreaterThan(0)
  })

  it('verify_node doubles interval and pushes next_review_at forward', () => {
    const n = createNode({
      nodeType: 'constraint',
      content: 'must hold',
      sourceScope: 'team',
      reviewIntervalMs: 1_000,
    })
    const beforeInterval = n.reviewIntervalMs ?? 0
    const updated = verifyNode(n.nodeId, 'still valid in prod')
    expect(updated).not.toBeNull()
    expect(updated!.lastVerifiedAt).toBeDefined()
    expect(updated!.reviewIntervalMs).toBeGreaterThanOrEqual(beforeInterval * 2)
    expect(updated!.nextReviewAt).toBeGreaterThan(Date.now())

    const handler = handleVerifyNode({ nodeId: n.nodeId, note: 'second pass' })
    expect(handler.isError).not.toBe(true)
  })

  it('overdueOnly filters to due nodes', () => {
    const n = createNode({
      nodeType: 'general',
      content: 'overdue candidate',
      sourceScope: 'session',
      reviewIntervalMs: 60_000,
    })
    const past = Date.now() - 120_000
    getDb().run('UPDATE nodes SET next_review_at = ? WHERE node_id = ?', [past, n.nodeId])

    const overdue = listReviewQueue({ limit: 20, overdueOnly: true })
    expect(overdue.some(x => x.nodeId === n.nodeId)).toBe(true)

    const future = Date.now() + 7 * 24 * 60 * 60 * 1000
    getDb().run('UPDATE nodes SET next_review_at = ? WHERE node_id = ?', [future, n.nodeId])
    const notOverdue = listReviewQueue({ limit: 20, overdueOnly: true })
    expect(notOverdue.some(x => x.nodeId === n.nodeId)).toBe(false)
  })
})
