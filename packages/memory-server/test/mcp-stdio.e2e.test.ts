/**
 * Real MCP wire-path tests: spawn the built server, talk over stdio using the official SDK client.
 * This validates JSON-RPC framing, initialization, tools, and resources — not just handler functions.
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

describe('MCP stdio (production wire path)', { timeout: 45_000 }, () => {
  let tempDb: string | undefined
  let client: Client
  let transport: StdioClientTransport
  let stderrBuf = ''

  beforeAll(() => {
    if (!existsSync(serverEntry)) {
      throw new Error(
        `Missing ${serverEntry}. Run "pnpm run build" in packages/memory-server before stdio e2e tests.`,
      )
    }
  })

  afterEach(async () => {
    stderrBuf = ''
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

  async function connectFreshServer() {
    tempDb = tempDbFile()
    removeFile(tempDb)

    transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
      cwd: pkgRoot,
      stderr: 'pipe',
      env: {
        ...getDefaultEnvironment(),
        TENGU_MEMORY_DB: tempDb,
        NODE_ENV: 'test',
      },
    })

    const stderr = transport.stderr
    if (stderr) {
      stderr.on('data', (chunk: Buffer | string) => {
        stderrBuf += typeof chunk === 'string' ? chunk : chunk.toString('utf8')
      })
    }

    client = new Client({ name: 'memory-server-e2e', version: '0.0.0' })
    await client.connect(transport)
  }

  it('initializes, lists tools/templates, ping, tools + resources round-trip', async () => {
    await connectFreshServer()

    await client.ping()

    const tools = await client.listTools()
    const names = new Set(tools.tools.map(t => t.name))
    for (const n of [
      'memory.create_node',
      'memory.query',
      'memory.add_edge',
      'memory.attach_evidence',
      'memory.refresh',
      'memory.stats',
    ]) {
      expect(names.has(n), `missing tool ${n}`).toBe(true)
    }

    const listed = await client.listResources()
    const staticUris = listed.resources.map(r => r.uri)
    expect(staticUris.some(u => u === 'memory://stats' || u.includes('memory://stats'))).toBe(true)

    const templates = await client.listResourceTemplates()
    const tplUris = templates.resourceTemplates.map(t => t.uriTemplate)
    expect(tplUris.some(u => u.includes('memory://node'))).toBe(true)

    const create = await client.callTool({
      name: 'memory.create_node',
      arguments: {
        nodeType: 'general',
        content: 'e2e stdio memory content',
        sourceScope: 'project',
        evidenceRefs: [{ type: 'tool_result', uri: 'e2e://proof' }],
      },
    })
    expect(create.isError).not.toBe(true)
    const createText = create.content?.find(c => c.type === 'text') as { text?: string } | undefined
    expect(createText?.text).toBeTruthy()
    const created = JSON.parse(createText!.text!) as {
      node: { nodeId: string }
    }
    const nodeId = created.node.nodeId
    expect(nodeId).toBeTruthy()

    const statsRes = await client.readResource({ uri: 'memory://stats' })
    const statsText = statsRes.contents[0]
    expect(statsText && 'text' in statsText && statsText.text).toBeTruthy()
    const stats = JSON.parse((statsText as { text: string }).text) as { totalNodes: number }
    expect(stats.totalNodes).toBeGreaterThanOrEqual(1)

    const nodeRes = await client.readResource({ uri: `memory://node/${nodeId}` })
    const nodeText = nodeRes.contents[0]
    expect(nodeText && 'text' in nodeText && nodeText.text).toBeTruthy()
    const payload = JSON.parse((nodeText as { text: string }).text) as { node: { nodeId: string }; edges: unknown[] }
    expect(payload.node.nodeId).toBe(nodeId)
    expect(Array.isArray(payload.edges)).toBe(true)

    const missing = await client.readResource({ uri: 'memory://node/00000000-0000-0000-0000-000000000000' })
    const missText = missing.contents[0]
    expect(missText && 'text' in missText && missText.text).toBeTruthy()
    expect((missText as { text: string }).text).toContain('Node not found')

    const query = await client.callTool({
      name: 'memory.query',
      arguments: {
        query: 'e2e stdio',
        includeStale: true,
        limit: 5,
      },
    })
    expect(query.isError).not.toBe(true)
    const qText = query.content?.find(c => c.type === 'text') as { text?: string } | undefined
    const qBody = JSON.parse(qText!.text!) as { count: number; results: unknown[] }
    expect(qBody.count).toBeGreaterThan(0)

    // stderr should stay quiet on success (hosts often treat stderr as errors)
    expect(stderrBuf.trim().length).toBe(0)
  })

  it('structured startup error on invalid DB path does not corrupt stdio', async () => {
    const badPath = join(pkgRoot, 'dist')
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
      cwd: pkgRoot,
      stderr: 'pipe',
      env: {
        ...getDefaultEnvironment(),
        TENGU_MEMORY_DB: badPath,
        NODE_ENV: 'test',
      },
    })

    const stderr = transport.stderr
    if (stderr) {
      stderr.on('data', (chunk: Buffer | string) => {
        stderrBuf += typeof chunk === 'string' ? chunk : chunk.toString('utf8')
      })
    }

    client = new Client({ name: 'memory-server-e2e', version: '0.0.0' })
    await expect(client.connect(transport)).rejects.toThrow()
    expect(stderrBuf).toContain('memory_db_unavailable')
  })
})
