/**
 * Spawns memory, mission, and verification MCP servers over stdio and runs one coordinated workflow.
 * Requires: pnpm run build at repo root (dist/ for each server must exist).
 */
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client'
import { getDefaultEnvironment, StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { randomBytes } from 'node:crypto'
import { tmpdir } from 'node:os'
import { removeFile, tempPaths } from './paths.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const memoryEntry = join(repoRoot, 'packages', 'memory-server', 'dist', 'index.js')
const missionEntry = join(repoRoot, 'packages', 'mission-server', 'dist', 'index.js')
const verificationEntry = join(repoRoot, 'packages', 'verification-server', 'dist', 'index.js')

function requireBuilt(path: string, label: string) {
  if (!existsSync(path)) {
    console.error(`platform-demo: missing ${label} at ${path}\nRun: pnpm run build`)
    process.exit(1)
  }
}

function parseToolJson(text: string | undefined): unknown {
  if (!text) throw new Error('empty tool response')
  return JSON.parse(text)
}

type TextBlock = { type: string; text?: string }

function pickTextContent(content: unknown): string | undefined {
  if (!Array.isArray(content)) return undefined
  const block = content.find(
    (c): c is TextBlock & { text: string } =>
      typeof c === 'object'
      && c !== null
      && (c as TextBlock).type === 'text'
      && typeof (c as TextBlock).text === 'string',
  )
  return block?.text
}

async function connectServer(
  name: string,
  entry: string,
  envExtra: Record<string, string>,
): Promise<{ client: Client; transport: StdioClientTransport }> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entry],
    cwd: dirname(entry),
    stderr: 'pipe',
    env: {
      ...getDefaultEnvironment(),
      NODE_ENV: 'test',
      ...envExtra,
    },
  })
  const client = new Client({ name: `platform-demo-${name}`, version: '0.0.0' })
  await client.connect(transport)
  return { client, transport }
}

async function main() {
  requireBuilt(memoryEntry, 'memory-server')
  requireBuilt(missionEntry, 'mission-server')
  requireBuilt(verificationEntry, 'verification-server')

  const suffix = randomBytes(6).toString('hex')
  const { memoryDb, missionDb, verificationDb } = tempPaths(suffix)
  for (const p of [memoryDb, missionDb, verificationDb]) removeFile(p)

  let memoryT: StdioClientTransport | undefined
  let missionT: StdioClientTransport | undefined
  let verificationT: StdioClientTransport | undefined
  let memoryC: Client | undefined
  let missionC: Client | undefined
  let verificationC: Client | undefined

  try {
    const m = await connectServer('memory', memoryEntry, { MNEMAI_MEMORY_DB: memoryDb })
    memoryC = m.client
    memoryT = m.transport
    const mi = await connectServer('mission', missionEntry, { TENGU_MISSION_DB: missionDb })
    missionC = mi.client
    missionT = mi.transport
    const v = await connectServer('verification', verificationEntry, { TENGU_VERIFICATION_DB: verificationDb })
    verificationC = v.client
    verificationT = v.transport

    await memoryC.ping()
    await missionC.ping()
    await verificationC.ping()

    const missionRes = await missionC.callTool({
      name: 'mission.create',
      arguments: {
        objective: 'Deliver audited platform demo',
        constraints: ['memory linked', 'proof recorded'],
      },
    })
    if (missionRes.isError) throw new Error('mission.create failed')
    const missionBody = parseToolJson(pickTextContent(missionRes.content)) as { mission: { missionId: string } }
    const missionId = missionBody.mission.missionId

    const memRes = await memoryC.callTool({
      name: 'memory.create_node',
      arguments: {
        nodeType: 'general',
        content: `Mission context: ${missionId} — objective recorded in mission store.`,
        sourceScope: 'project',
        evidenceRefs: [
          {
            type: 'external',
            uri: `mnemai://mission/${missionId}`,
            label: 'mission objective',
          },
        ],
      },
    })
    if (memRes.isError) throw new Error('memory.create_node failed')
    const memBody = parseToolJson(pickTextContent(memRes.content)) as { node: { nodeId: string } }
    const nodeId = memBody.node.nodeId

    const proofRes = await verificationC.callTool({
      name: 'verification.record_proof',
      arguments: {
        missionId,
        summary: 'Workflow checks: mission + memory + proof chain OK',
        detailUri: `urn:mnemai:platform-demo:${suffix}`,
      },
    })
    if (proofRes.isError) throw new Error('verification.record_proof failed')
    const proofBody = parseToolJson(pickTextContent(proofRes.content)) as { proof: { verificationId: string } }
    const verificationId = proofBody.proof.verificationId

    const attachRes = await memoryC.callTool({
      name: 'memory.attach_evidence',
      arguments: {
        nodeId,
        evidenceRefs: [
          {
            type: 'verification',
            uri: `mnemai://verification/${verificationId}`,
            label: 'verification proof bundle',
          },
        ],
      },
    })
    if (attachRes.isError) throw new Error('memory.attach_evidence failed')

    const q = await memoryC.callTool({
      name: 'memory.query',
      arguments: { query: missionId, includeStale: true, limit: 5 },
    })
    if (q.isError) throw new Error('memory.query failed')
    const qBody = parseToolJson(pickTextContent(q.content)) as { count: number }
    if (qBody.count < 1) throw new Error('expected memory query to find mission-linked node')

    console.log('platform-demo: OK')
    console.log(JSON.stringify({ missionId, nodeId, verificationId }, null, 2))
  } finally {
    await memoryC?.close?.().catch(() => {})
    await missionC?.close?.().catch(() => {})
    await verificationC?.close?.().catch(() => {})
    await memoryT?.close?.().catch(() => {})
    await missionT?.close?.().catch(() => {})
    await verificationT?.close?.().catch(() => {})
    removeFile(memoryDb)
    removeFile(missionDb)
    removeFile(verificationDb)
  }
}

main().catch(e => {
  console.error('platform-demo: FAIL', e)
  process.exit(1)
})
