import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Prefer `MNEMAI_*`, then legacy `TENGU_*` (same suffix pair). */
export function preferMnemaiEnv(mnemaiName: string, tenguName: string): string | undefined {
  const a = process.env[mnemaiName]?.trim()
  if (a) return a
  const b = process.env[tenguName]?.trim()
  return b || undefined
}

/**
 * SQLite file path: explicit env wins; else existing ~/.tengu/memory.db; else ~/.mnemai/memory.db.
 */
export function getMemoryDbPath(): string {
  const explicit = preferMnemaiEnv('MNEMAI_MEMORY_DB', 'TENGU_MEMORY_DB')
  if (explicit) return explicit
  const legacyFile = join(homedir(), '.tengu', 'memory.db')
  if (existsSync(legacyFile)) return legacyFile
  const dir = join(homedir(), '.mnemai')
  mkdirSync(dir, { recursive: true })
  return join(dir, 'memory.db')
}

export function isMemorySyncWrites(): boolean {
  return (
    process.env.MNEMAI_MEMORY_SYNC_WRITES === '1' ||
    process.env.TENGU_MEMORY_SYNC_WRITES === '1'
  )
}
