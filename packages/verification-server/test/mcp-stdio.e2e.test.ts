import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client'
import { getDefaultEnvironment, StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { removeFile, tempDbFile } from './helpers.js'

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const serverEntry = join(pkgRoot, 'dist', 'index.js')

describe('verification MCP stdio', { timeout: 45_000 }, () => {
  let tempDb: string | undefined
  let client: Client
  let transport: StdioClientTransport

  beforeAll(() => {
    if (!existsSync(serverEntry)) {
      throw new Error(`Missing ${serverEntry}. Run pnpm run build in verification-server first.`)
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

  it('record_proof and get_proof', async () => {
    tempDb = tempDbFile()
    removeFile(tempDb)
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
      cwd: pkgRoot,
      stderr: 'pipe',
      env: {
        ...getDefaultEnvironment(),
        TENGU_VERIFICATION_DB: tempDb,
        NODE_ENV: 'test',
      },
    })
    client = new Client({ name: 'verification-e2e', version: '0.0.0' })
    await client.connect(transport)
    await client.ping()
    const rec = await client.callTool({
      name: 'verification.record_proof',
      arguments: {
        missionId: 'm-1',
        summary: 'e2e proof',
        detailUri: 'urn:test:proof',
      },
    })
    expect(rec.isError).not.toBe(true)
    const text = rec.content?.find(c => c.type === 'text') as { text?: string } | undefined
    const body = JSON.parse(text!.text!) as { proof: { verificationId: string } }
    const id = body.proof.verificationId
    const get = await client.callTool({
      name: 'verification.get_proof',
      arguments: { verificationId: id },
    })
    expect(get.isError).not.toBe(true)
  })
})
