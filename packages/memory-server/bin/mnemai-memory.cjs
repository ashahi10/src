#!/usr/bin/env node
'use strict'
const { spawnSync } = require('node:child_process')
const { join } = require('node:path')

const main = join(__dirname, '..', 'dist', 'index.js')
const result = spawnSync(process.execPath, [main, ...process.argv.slice(2)], {
  stdio: 'inherit',
})
process.exit(result.status === null ? 1 : result.status)
