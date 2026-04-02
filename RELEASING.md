# Releasing `@tengu/memory-server`

## Security (read first)

- **Do not** put your npm password, tokens, or API keys in this repo, in docs, or in chat with tools that log prompts.
- **Do not** commit a project `.npmrc` that contains `_authToken`. This repo **gitignores** `.npmrc` so a token file is harder to commit by mistake; use **`npm login`** (stores auth under your user `~/.npmrc`) or **GitHub Actions** `NPM_TOKEN` for automation.
- If you ever committed a secret, **revoke/rotate** it and scrub history (e.g. `git filter-repo`) or ask GitHub support to remove cached copies.

## Preconditions

- `pnpm run verify:memory` passes.
- `pnpm run verify:npm-pack` passes (tarball install + shebang + bin field).
- Version bumped in `packages/memory-server/package.json` and `packages/memory-server/CHANGELOG.md`.

## npm account and `@tengu` scope

Publishing **`@tengu/memory-server`** requires permission to publish under the **`@tengu`** scope on [npmjs.com](https://www.npmjs.com). That usually means:

- The **npm organization** (or user scope) `tengu` exists, and your account is a **member** with publish rights, **or**
- You are logged in as the **owner** of that scope.

If you do not own `@tengu` yet, create the org on npm (paid for orgs on npm’s terms) or temporarily publish **unscoped** under another name (would require changing `package.json` `name` — not the default in this repo).

## One-time login (you type the password only in the terminal)

**Do not paste your npm password into chat or commit it.** In your own terminal:

```bash
npm login
# follow prompts: username, password, email, OTP if 2FA enabled
```

To confirm you are logged in:

```bash
npm whoami
```

## Publish (from this repo)

```bash
cd packages/memory-server
pnpm publish --access public
```

`pnpm publish` uses the npm registry and your `~/.npmrc` session from `npm login`.  
`prepublishOnly` runs **`pnpm run verify:ship`** (build, typecheck, tests, smoke).

## Consumer install

After publish:

```bash
npx --yes @tengu/memory-server
```

Configure MCP with `"command": "npx"` and `"args": ["--yes", "@tengu/memory-server"]` (and optional `"env"` for `TENGU_MEMORY_DB` / embeddings). Use the same pattern for `tengu-mission` / `tengu-verification` when those packages are published.

## Scoped registry

The scope is **`@tengu`**. Ensure you are logged into npm (`npm login`) with rights to publish under that scope.
