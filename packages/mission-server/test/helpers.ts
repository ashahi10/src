import { randomBytes } from 'node:crypto'
import { existsSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export function tempDbFile(): string {
  return join(tmpdir(), `tengu-mission-test-${randomBytes(8).toString('hex')}.db`)
}

export function removeFile(path: string): void {
  if (existsSync(path)) {
    try {
      unlinkSync(path)
    } catch {
      // ignore
    }
  }
}
