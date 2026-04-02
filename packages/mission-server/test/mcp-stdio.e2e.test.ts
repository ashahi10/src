/**
 * MCP stdio wire path: built server + official SDK client.
 */
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client'
import { getDefaultEnvironment, StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { removeFile, tempDbFile } from './helpers.js'

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const serverEntry = join(pkgRoot, 'dist', 'index.js')

describe('mission MCP stdio', { timeout: 45_000 }, () => {
  let tempDb: string | undefined
  let client: Client
  let transport: StdioClientTransport

  beforeAll(() => {
    if (!existsSync(serverEntry)) {
      throw new Error(`Missing ${serverEntry}. Run pnpm run build in mission-server first.`)
    }
  })

  afterEach(async () => {
    try {
      await client?.close?.()
    } catch {
      // ignore
    }
    try {
      await transport?.close?.()
    } catch {
      // ignore
    }
    if (tempDb) {
      removeFile(tempDb)
      tempDb = undefined
    }
  })

  it('create and get round-trip', async () => {
    tempDb = tempDbFile()
    removeFile(tempDb)
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
      cwd: pkgRoot,
      stderr: 'pipe',
      env: {
        ...getDefaultEnvironment(),
        TENGU_MISSION_DB: tempDb,
        NODE_ENV: 'test',
      },
    })
    client = new Client({ name: 'mission-e2e', version: '0.0.0' })
    await client.connect(transport)
    await client.ping()
    const create = await client.callTool({
      name: 'mission.create',
      arguments: { objective: 'e2e mission', constraints: ['c1'] },
    })
    expect(create.isError).not.toBe(true)
    const text = create.content?.find(c => c.type === 'text') as { text?: string } | undefined
    const body = JSON.parse(text!.text!) as { mission: { missionId: string } }
    const id = body.mission.missionId
    const get = await client.callTool({
      name: 'mission.get',
      arguments: { missionId: id },
    })
    expect(get.isError).not.toBe(true)
  })
})
