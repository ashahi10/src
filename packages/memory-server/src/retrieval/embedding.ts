import type { Database } from 'sql.js'
import { getDb, scheduleSave } from '../graph/store.js'

const DEFAULT_MODEL = 'text-embedding-3-small'

export function isEmbeddingsConfigured(): boolean {
  return Boolean(process.env.TENGU_MEMORY_EMBED_URL?.trim() && process.env.TENGU_MEMORY_EMBED_KEY?.trim())
}

export function getEmbeddingModel(): string {
  return process.env.TENGU_MEMORY_EMBED_MODEL?.trim() || DEFAULT_MODEL
}

/**
 * Calls an OpenAI-compatible embeddings endpoint (POST JSON `{ input, model }`).
 */
export async function embedText(text: string): Promise<Float32Array | null> {
  if (!isEmbeddingsConfigured()) return null
  const url = process.env.TENGU_MEMORY_EMBED_URL!.trim()
  const key = process.env.TENGU_MEMORY_EMBED_KEY!.trim()
  const model = getEmbeddingModel()

  const body = JSON.stringify({ model, input: text.slice(0, 8000) })
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body,
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`embedding_http_${res.status}: ${err.slice(0, 500)}`)
  }
  const json = (await res.json()) as {
    data?: Array<{ embedding?: number[] }>
  }
  const vec = json.data?.[0]?.embedding
  if (!vec?.length) return null
  return Float32Array.from(vec)
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    na += a[i]! * a[i]!
    nb += b[i]! * b[i]!
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  if (denom <= 0) return 0
  return Math.max(0, Math.min(1, dot / denom))
}

export function embeddingsTableExists(database: Database): boolean {
  const s = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='node_embeddings'",
  )
  const ok = s.step()
  s.free()
  return ok
}

export function upsertNodeEmbedding(database: Database, nodeId: string, vector: Float32Array): void {
  const model = getEmbeddingModel()
  const now = Date.now()
  const u8 = new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength)
  database.run(
    'REPLACE INTO node_embeddings (node_id, model, dims, updated_at, vector) VALUES (?, ?, ?, ?, ?)',
    [nodeId, model, vector.length, now, u8],
  )
  scheduleSave()
}

export function getNodeEmbeddingVector(nodeId: string): Float32Array | null {
  const database = getDb()
  if (!embeddingsTableExists(database)) return null
  const stmt = database.prepare('SELECT vector, dims FROM node_embeddings WHERE node_id = ?')
  stmt.bind([nodeId])
  if (!stmt.step()) {
    stmt.free()
    return null
  }
  const row = stmt.getAsObject() as { vector: Uint8Array; dims: number }
  stmt.free()
  const raw = row.vector
  if (!raw || !(raw instanceof Uint8Array)) return null
  const buf = Buffer.from(raw)
  const expected = Number(row.dims) * 4
  if (buf.length < expected) return null
  return new Float32Array(buf.buffer, buf.byteOffset, Number(row.dims))
}

export function deleteNodeEmbedding(database: Database, nodeId: string): void {
  database.run('DELETE FROM node_embeddings WHERE node_id = ?', [nodeId])
}

export function loadEmbeddingsForNodes(nodeIds: string[]): Map<string, Float32Array> {
  const out = new Map<string, Float32Array>()
  if (nodeIds.length === 0) return out
  const database = getDb()
  if (!embeddingsTableExists(database)) return out

  const chunkSize = 80
  for (let i = 0; i < nodeIds.length; i += chunkSize) {
    const chunk = nodeIds.slice(i, i + chunkSize)
    const ph = chunk.map(() => '?').join(',')
    const stmt = database.prepare(`SELECT node_id, vector, dims FROM node_embeddings WHERE node_id IN (${ph})`)
    stmt.bind(chunk)
    while (stmt.step()) {
      const row = stmt.getAsObject() as { node_id: string; vector: Uint8Array; dims: number }
      const raw = row.vector
      if (!raw || !(raw instanceof Uint8Array)) continue
      const buf = Buffer.from(raw)
      const dims = Number(row.dims)
      if (buf.length < dims * 4) continue
      out.set(row.node_id, new Float32Array(buf.buffer, buf.byteOffset, dims))
    }
    stmt.free()
  }
  return out
}
