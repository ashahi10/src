# Changelog

All notable changes to `@mnemai/memory-server` are documented here.

## [0.1.4] - 2026-04-02

### Fixed

- **npm README:** Link to `docs/` and repo files with **absolute GitHub URLs** so they work on [npmjs.com](https://www.npmjs.com/package/@mnemai/memory-server) (the `docs/` tree is not shipped in the package tarball).
- **package.json:** Add `repository`, `homepage`, and `bugs` for discoverability.

## [0.1.3] - 2026-04-02

### Changed

- **Branding / env:** Prefer **`MNEMAI_MEMORY_*`** environment variables (documented on npm README). Legacy **`TENGU_MEMORY_*`** names remain supported for all memory tuning and embeddings.
- **Default DB path:** New installs use **`~/.mnemai/memory.db`**. If **`~/.tengu/memory.db`** already exists, it is used until you migrate or set **`MNEMAI_MEMORY_DB`** explicitly.

## [0.1.2] - 2026-04-02

### Fixed

- Include **`LICENSE`** (MIT) in the published tarball via the `files` list so npm consumers get an explicit license file.

## [0.1.1] - 2026-04-02

### Fixed

- **CLI / `npx`:** Ship a small CommonJS launcher (`bin/mnemai-memory.cjs`) so `npx --yes @mnemai/memory-server` reliably finds the executable (avoids `sh: mnemai-memory: command not found` with ESM-only `dist/index.js` bins on some npm versions).
- **`--help` / `-h`:** Print a short usage blurb and exit instead of starting stdio.

## [0.1.0] - 2026-04-01

### Added

- Initial published package: MCP Memory 2.0 server (`mnemai-memory` CLI).
- Evidence-linked graph, hybrid retrieval (substring + token index + optional embeddings), review queue, stdio transport.
- CI-tested: Vitest (including MCP stdio e2e), integration smoke.

