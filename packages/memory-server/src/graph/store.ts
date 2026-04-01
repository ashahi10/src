import initSqlJs, { type Database } from 'sql.js'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'

/**
 * Persistence uses sql.js (WASM SQLite) so the server runs without native addons.
 * RFC §9 names better-sqlite3; that is ideal for Node LTS when native builds succeed.
 * The on-disk file is standard SQLite and remains at ~/.tengu/memory.db or TENGU_MEMORY_DB.
 */

let db: Database | null = null
let dbPath: string | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
const SYNC_WRITES = process.env.TENGU_MEMORY_SYNC_WRITES === '1'

function getDbPath(): string {
  const envPath = process.env.TENGU_MEMORY_DB
  if (envPath) return envPath
  const dir = join(homedir(), '.tengu')
  mkdirSync(dir, { recursive: true })
  return join(dir, 'memory.db')
}

export async function initDb(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs()
  dbPath = getDbPath()

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
  saveDb()
}

export function closeDb(): void {
  flushDb()
  if (db) {
    db.close()
    db = null
  }
}
