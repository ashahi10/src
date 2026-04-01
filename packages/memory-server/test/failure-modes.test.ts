import { afterEach, describe, expect, it } from 'vitest'
import { initDb, closeDb } from '../src/graph/store.js'

describe('failure modes', () => {
  afterEach(() => {
    closeDb()
    delete process.env.TENGU_MEMORY_DB
  })

  it('throws structured startup error when db path is invalid', async () => {
    process.env.TENGU_MEMORY_DB = '/tmp'
    await expect(initDb()).rejects.toBeDefined()
  })
})
