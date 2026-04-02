import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createNode } from '../src/graph/node.js'
import { initDb, closeDb, getDb } from '../src/graph/store.js'
import { embedText, upsertNodeEmbedding } from '../src/retrieval/embedding.js'
import { queryMemory } from '../src/retrieval/query.js'
import { removeFile, tempDbFile } from './helpers.js'

type EmbedEnv = {
  url: string | undefined
  key: string | undefined
  model: string | undefined
}

function readEmbedEnv(): EmbedEnv {
  return {
    url: process.env.TENGU_MEMORY_EMBED_URL,
    key: process.env.TENGU_MEMORY_EMBED_KEY,
    model: process.env.TENGU_MEMORY_EMBED_MODEL,
  }
}

function restoreEmbedEnv(saved: EmbedEnv) {
  if (saved.url === undefined) delete process.env.TENGU_MEMORY_EMBED_URL
  else process.env.TENGU_MEMORY_EMBED_URL = saved.url
  if (saved.key === undefined) delete process.env.TENGU_MEMORY_EMBED_KEY
  else process.env.TENGU_MEMORY_EMBED_KEY = saved.key
  if (saved.model === undefined) delete process.env.TENGU_MEMORY_EMBED_MODEL
  else process.env.TENGU_MEMORY_EMBED_MODEL = saved.model
}

describe('embedText', () => {
  let saved: EmbedEnv

  beforeEach(() => {
    saved = readEmbedEnv()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    restoreEmbedEnv(saved)
  })

  it('returns null and does not call fetch when embeddings are not configured', async () => {
    delete process.env.TENGU_MEMORY_EMBED_URL
    delete process.env.TENGU_MEMORY_EMBED_KEY
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await embedText('hello')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns Float32Array for OpenAI-compatible JSON shape', async () => {
    process.env.TENGU_MEMORY_EMBED_URL = 'https://api.example.test/v1/embeddings'
    process.env.TENGU_MEMORY_EMBED_KEY = 'sk-test'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ embedding: [0.6, 0.8, 0, 0.2] }] }),
        text: async () => '',
      }),
    )
    const out = await embedText('hello')
    expect(out).not.toBeNull()
    expect(out!.length).toBe(4)
    expect(out![0]).toBeCloseTo(0.6, 5)
    expect(out![1]).toBeCloseTo(0.8, 5)
  })

  it('throws on non-OK HTTP response', async () => {
    process.env.TENGU_MEMORY_EMBED_URL = 'https://api.example.test/v1/embeddings'
    process.env.TENGU_MEMORY_EMBED_KEY = 'sk-test'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => 'bad gateway',
      }),
    )
    await expect(embedText('x')).rejects.toThrow(/embedding_http_502/)
  })
})

describe('queryMemory semantic channel (integration)', () => {
  let dbPath: string
  let saved: EmbedEnv

  beforeEach(async () => {
    saved = readEmbedEnv()
    process.env.TENGU_MEMORY_EMBED_URL = 'https://api.example.test/v1/embeddings'
    process.env.TENGU_MEMORY_EMBED_KEY = 'sk-test'

    const sharedEmbedding = [0.25, 0.25, 0.25, 0.25]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ embedding: sharedEmbedding }] }),
        text: async () => '',
      }),
    )

    dbPath = tempDbFile()
    removeFile(dbPath)
    process.env.TENGU_MEMORY_DB = dbPath
    await initDb()

    const node = createNode({
      nodeType: 'general',
      content: 'semantic-unique-zzyy-content',
      sourceScope: 'project',
    })
    const vec = await embedText('any text for storage')
    expect(vec).not.toBeNull()
    upsertNodeEmbedding(getDb(), node.nodeId, vec!)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    closeDb()
    removeFile(dbPath)
    restoreEmbedEnv(saved)
  })

  it('includes high semanticMatchScore when query embedding matches stored vector', async () => {
    const results = await queryMemory({
      query: 'unrelated query phrase',
      includeStale: true,
      limit: 10,
      useSemantic: true,
    })
    const hit = results.find(r => r.node.content.includes('semantic-unique-zzyy'))
    expect(hit).toBeDefined()
    expect(typeof hit!.semanticMatchScore).toBe('number')
    expect(hit!.semanticMatchScore!).toBeGreaterThan(0.99)
  })
})
