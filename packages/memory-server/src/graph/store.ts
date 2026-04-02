import initSqlJs, { type Database } from 'sql.js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { backfillSearchIndex } from '../retrieval/tokenIndex.js'
import { getMemoryDbPath, isMemorySyncWrites } from '../envMemory.js'

/**
 * Persistence uses sql.js (WASM SQLite) so the server runs without native addons.
 * RFC §9 names better-sqlite3; that is ideal for Node LTS when native builds succeed.
 * Default DB: ~/.mnemai/memory.db (new), or existing ~/.tengu/memory.db if present; override with MNEMAI_MEMORY_DB or TENGU_MEMORY_DB.
 */

let db: Database | null = null
let dbPath: string | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
const SYNC_WRITES = isMemorySyncWrites()

export async function initDb(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs()
  dbPath = getMemoryDbPath()

  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  initSchema(db)
  return db
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.')
  return db
}

export function saveDb(): void {
  if (!db || !dbPath) return
  const data = db.export()
  const buffer = Buffer.from(data)
  writeFileSync(dbPath, buffer)
}

export function scheduleSave(): void {
  if (SYNC_WRITES) {
    saveDb()
    return
  }
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveDb(), 500)
}

export function flushDb(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  saveDb()
}

function initSchema(database: Database): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS nodes (
      node_id TEXT PRIMARY KEY,
      node_type TEXT NOT NULL,
      content TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 0.5,
      freshness_score REAL NOT NULL DEFAULT 1.0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      source_scope TEXT NOT NULL DEFAULT 'session',
      tags TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}'
    )
  `)
  database.run(`
    CREATE TABLE IF NOT EXISTS edges (
      edge_id TEXT PRIMARY KEY,
      from_node_id TEXT NOT NULL,
      to_node_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 1.0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (from_node_id) REFERENCES nodes(node_id) ON DELETE CASCADE,
      FOREIGN KEY (to_node_id) REFERENCES nodes(node_id) ON DELETE CASCADE
    )
  `)
  database.run(`
    CREATE TABLE IF NOT EXISTS evidence_refs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id TEXT NOT NULL,
      type TEXT NOT NULL,
      uri TEXT NOT NULL,
      label TEXT,
      timestamp INTEGER,
      FOREIGN KEY (node_id) REFERENCES nodes(node_id) ON DELETE CASCADE
    )
  `)
  database.run('CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(node_type)')
  database.run('CREATE INDEX IF NOT EXISTS idx_nodes_scope ON nodes(source_scope)')
  database.run('CREATE INDEX IF NOT EXISTS idx_nodes_freshness ON nodes(freshness_score)')
  database.run('CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_node_id)')
  database.run('CREATE INDEX IF NOT EXISTS idx_edges_to ON edges(to_node_id)')
  database.run('CREATE INDEX IF NOT EXISTS idx_evidence_node ON evidence_refs(node_id)')
  database.run('PRAGMA foreign_keys = ON')
  runMigrations(database)
  saveDb()
}

function readUserVersion(database: Database): number {
  const stmt = database.prepare('PRAGMA user_version')
  stmt.step()
  const row = stmt.getAsObject() as { user_version?: number }
  stmt.free()
  return Number(row.user_version ?? 0)
}

function setUserVersion(database: Database, v: number): void {
  database.run(`PRAGMA user_version = ${v}`)
}

function tableColumns(database: Database, table: string): Set<string> {
  const cols = new Set<string>()
  const stmt = database.prepare(`PRAGMA table_info(${table})`)
  while (stmt.step()) {
    const row = stmt.getAsObject() as { name?: string }
    if (row.name) cols.add(row.name)
  }
  stmt.free()
  return cols
}

function runMigrations(database: Database): void {
  let v = readUserVersion(database)

  if (v < 1) {
    const cols = tableColumns(database, 'nodes')
    if (!cols.has('review_interval_ms')) {
      database.run(
        'ALTER TABLE nodes ADD COLUMN review_interval_ms INTEGER NOT NULL DEFAULT 604800000',
      )
    }
    if (!cols.has('next_review_at')) {
      database.run('ALTER TABLE nodes ADD COLUMN next_review_at INTEGER')
    }
    if (!cols.has('last_verified_at')) {
      database.run('ALTER TABLE nodes ADD COLUMN last_verified_at INTEGER')
    }
    database.run(
      `UPDATE nodes SET next_review_at = updated_at + COALESCE(review_interval_ms, 604800000)
       WHERE next_review_at IS NULL`,
    )
    v = 1
    setUserVersion(database, v)
  }

  if (v < 2) {
    database.run(`
      CREATE TABLE IF NOT EXISTS node_search_tokens (
        token TEXT NOT NULL,
        node_id TEXT NOT NULL,
        tf REAL NOT NULL,
        PRIMARY KEY (token, node_id),
        FOREIGN KEY (node_id) REFERENCES nodes(node_id) ON DELETE CASCADE
      )
    `)
    database.run(
      'CREATE INDEX IF NOT EXISTS idx_node_search_tokens_token ON node_search_tokens(token)',
    )
    database.run(`
      CREATE TABLE IF NOT EXISTS node_embeddings (
        node_id TEXT PRIMARY KEY,
        model TEXT NOT NULL,
        dims INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        vector BLOB NOT NULL,
        FOREIGN KEY (node_id) REFERENCES nodes(node_id) ON DELETE CASCADE
      )
    `)
    backfillSearchIndex(database)
    v = 2
    setUserVersion(database, v)
  }
}

export function closeDb(): void {
  flushDb()
  if (db) {
    db.close()
    db = null
  }
}
