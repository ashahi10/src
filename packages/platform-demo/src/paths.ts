import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { existsSync, unlinkSync } from 'node:fs'

export function tempPaths(suffix: string) {
  const base = tmpdir()
  return {
    memoryDb: join(base, `tengu-pdemo-mem-${suffix}.db`),
    missionDb: join(base, `tengu-pdemo-mis-${suffix}.db`),
    verificationDb: join(base, `tengu-pdemo-ver-${suffix}.db`),
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
