import initSqlJs, { type Database } from 'sql.js'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'

let db: Database | null = null
let dbPath: string | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
const SYNC = process.env.TENGU_VERIFICATION_SYNC_WRITES === '1'

function getDbPath(): string {
  const envPath = process.env.TENGU_VERIFICATION_DB
  if (envPath) return envPath
  const dir = join(homedir(), '.tengu')
  mkdirSync(dir, { recursive: true })
  return join(dir, 'verification.db')
}

export async function initDb(): Promise<Database> {
  if (db) return db
  const SQL = await initSqlJs()
  dbPath = getDbPath()
  if (existsSync(dbPath)) {
    db = new SQL.Database(readFileSync(dbPath))
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
  writeFileSync(dbPath, Buffer.from(db.export()))
}

export function scheduleSave(): void {
  if (SYNC) {
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

export function closeDb(): void {
  flushDb()
  db = null
  dbPath = null
}

function initSchema(database: Database): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS proofs (
      verification_id TEXT PRIMARY KEY,
      mission_id TEXT,
      summary TEXT NOT NULL,
      detail_uri TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)
}
