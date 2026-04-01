import type { Database } from 'sql.js'
import { mergeTokenMaps, tokenFrequenciesFromText } from './tokenize.js'

/**
 * Portable lexical index: sql.js WASM SQLite is built without FTS5 (`no such module: fts5`).
 * We maintain an inverted token table and score with BM25-like idf * tf.
 */

export function replaceSearchIndexForNode(
  database: Database,
  nodeId: string,
  content: string,
  tagsJson: string,
): void {
  deleteSearchIndexForNode(database, nodeId)
  let tagsText = ''
  try {
    const tags = JSON.parse(tagsJson) as unknown
    if (Array.isArray(tags)) {
      tagsText = tags.filter(t => typeof t === 'string').join(' ')
    }
  } catch {
    tagsText = ''
  }
  const contentFreq = tokenFrequenciesFromText(content)
  const tagFreq = tokenFrequenciesFromText(tagsText)
  const merged = mergeTokenMaps(contentFreq, tagFreq)
  database.run('BEGIN')
  try {
    for (const [token, count] of merged) {
      const tf = 1 + Math.log(1 + count)
      database.run('INSERT INTO node_search_tokens (token, node_id, tf) VALUES (?, ?, ?)', [token, nodeId, tf])
    }
    database.run('COMMIT')
  } catch (err) {
    database.run('ROLLBACK')
    throw err
  }
}

export function deleteSearchIndexForNode(database: Database, nodeId: string): void {
  database.run('DELETE FROM node_search_tokens WHERE node_id = ?', [nodeId])
}

export function backfillSearchIndex(database: Database): void {
  const stmt = database.prepare('SELECT node_id, content, tags FROM nodes')
  while (stmt.step()) {
    const row = stmt.getAsObject() as { node_id: string; content: string; tags: string }
    replaceSearchIndexForNode(database, row.node_id, row.content, row.tags)
  }
  stmt.free()
}

function countNodes(database: Database): number {
  const s = database.prepare('SELECT COUNT(*) as c FROM nodes')
  s.step()
  const row = s.getAsObject() as { c: number }
  s.free()
  return Number(row.c ?? 0)
}

function documentFrequency(database: Database, token: string): number {
  const s = database.prepare(
    'SELECT COUNT(DISTINCT node_id) as df FROM node_search_tokens WHERE token = ?',
  )
  s.bind([token])
  s.step()
  const row = s.getAsObject() as { df: number }
  s.free()
  return Math.max(0, Number(row.df ?? 0))
}

/**
 * Raw BM25-style scores per node_id for the given query tokens (non-negative).
 */
export function computeLexicalIndexRawScores(database: Database, queryTokens: string[]): Map<string, number> {
  const scores = new Map<string, number>()
  if (queryTokens.length === 0) return scores

  const N = Math.max(1, countNodes(database))
  const idfByToken = new Map<string, number>()
  for (const t of queryTokens) {
    const df = documentFrequency(database, t)
    const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5))
    idfByToken.set(t, Math.max(0, idf))
  }

  const placeholders = queryTokens.map(() => '?').join(',')
  const sql = `SELECT node_id, token, tf FROM node_search_tokens WHERE token IN (${placeholders})`
  const stmt = database.prepare(sql)
  stmt.bind(queryTokens)
  while (stmt.step()) {
    const row = stmt.getAsObject() as { node_id: string; token: string; tf: number }
    const idf = idfByToken.get(row.token) ?? 0
    const contrib = idf * Number(row.tf ?? 0)
    const id = row.node_id
    scores.set(id, (scores.get(id) ?? 0) + contrib)
  }
  stmt.free()
  return scores
}

/** Normalize raw scores to [0, 1] using max saturation. */
export function normalizeScores(raw: Map<string, number>): Map<string, number> {
  let max = 0
  for (const v of raw.values()) {
    if (v > max) max = v
  }
  const out = new Map<string, number>()
  if (max <= 0) return out
  for (const [k, v] of raw) {
    out.set(k, Math.min(1, v / max))
  }
  return out
}

export function searchIndexTableExists(database: Database): boolean {
  const s = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='node_search_tokens'",
  )
  const ok = s.step()
  s.free()
  return ok
}
