#!/usr/bin/env node
/**
 * Prints an MCP server config snippet with absolute paths for Memory 2.0.
 * Run from repo root after: pnpm --filter @mnemai/memory-server run build
 */
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = resolve(__dirname, '..')
const entry = join(repoRoot, 'packages', 'memory-server', 'dist', 'index.js')

if (!existsSync(entry)) {
  console.error(
    `memory_mcp_config: missing ${entry}\n` +
      'Build first: pnpm --filter @mnemai/memory-server run build\n' +
      'Or run: pnpm run memory:onboard',
  )
  process.exit(1)
}

const dbPath = join(homedir(), '.tengu', 'memory.db')

const snippet = {
  mcpServers: {
    'mnemai-memory': {
      command: 'node',
      args: [entry],
      env: {
        TENGU_MEMORY_DB: dbPath,
      },
    },
  },
}

console.log(JSON.stringify(snippet, null, 2))
console.error('')
console.error('Paste the JSON above into your host config under mcpServers (merge with existing keys).')
console.error('Paths are absolute; do not rely on cwd. Default DB:', dbPath)
