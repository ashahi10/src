import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { existsSync, unlinkSync } from 'node:fs'

export function tempPaths(suffix: string) {
  const base = tmpdir()
  return {
    memoryDb: join(base, `mnemai-pdemo-mem-${suffix}.db`),
    missionDb: join(base, `mnemai-pdemo-mis-${suffix}.db`),
    verificationDb: join(base, `mnemai-pdemo-ver-${suffix}.db`),
  }
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
