# Changelog

All notable changes to `@mnemai/memory-server` are documented here.

## [0.1.1] - 2026-04-02

### Fixed

- **CLI / `npx`:** Ship a small CommonJS launcher (`bin/mnemai-memory.cjs`) so `npx --yes @mnemai/memory-server` reliably finds the executable (avoids `sh: mnemai-memory: command not found` with ESM-only `dist/index.js` bins on some npm versions).
- **`--help` / `-h`:** Print a short usage blurb and exit instead of starting stdio.

## [0.1.0] - 2026-04-01

### Added

- Initial published package: MCP Memory 2.0 server (`mnemai-memory` CLI).
- Evidence-linked graph, hybrid retrieval (substring + token index + optional embeddings), review queue, stdio transport.
- CI-tested: Vitest (including MCP stdio e2e), integration smoke.

