# Releasing `@mnemai/memory-server`

## Security (read first)

- **Do not** put your npm password, tokens, or API keys in this repo, in docs, or in chat with tools that log prompts.
- **Do not** commit a project `.npmrc` that contains `_authToken`. This repo **gitignores** `.npmrc` so a token file is harder to commit by mistake; use **`npm login`** (stores auth under your user `~/.npmrc`) or **GitHub Actions** `NPM_TOKEN` for automation.
- If you ever committed a secret, **revoke/rotate** it and scrub history (e.g. `git filter-repo`) or ask GitHub support to remove cached copies.

## Preconditions

- `pnpm run verify:memory` passes.
- `pnpm run verify:npm-pack` passes (tarball install + shebang + bin field).
- Version bumped in `packages/memory-server/package.json` and `packages/memory-server/CHANGELOG.md`.

## npm account and `@mnemai` scope

Publishing **`@mnemai/memory-server`** requires permission to publish under the **`@mnemai`** scope on [npmjs.com](https://www.npmjs.com).

- **Public packages are free.** This package sets `publishConfig.access: "public"`, so `pnpm publish --access public` does **not** require a paid npm private-modules plan.
- **You must control the scope.** Either create a [free npm organization](https://www.npmjs.com/org/create) named `mnemai` (if the name is available) and publish as a member with publish rights, or use an npm **username** that is exactly `mnemai` so `@mnemai/*` maps to your user account.
- **Publishing auth:** npm often requires **two-factor authentication** or a **granular access token** that can publish (see npm’s account security settings). If you see `E403` mentioning 2FA, enable 2FA or create a publish-capable token and log in with it.

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
npx --yes @mnemai/memory-server
```

Configure MCP with `"command": "npx"` and `"args": ["--yes", "@mnemai/memory-server"]` (and optional `"env"` for `TENGU_MEMORY_DB` / embeddings). Use the same pattern for `mnemai-mission` / `mnemai-verification` when those packages are published.

## Scoped registry

The scope is **`@mnemai`**. Ensure you are logged into npm (`npm login`) with rights to publish under that scope (organization membership or user scope).

## Troubleshooting

### `npm view @mnemai/memory-server` returns `E404` but the package page loads on npmjs.com

The website and `npm install` use the same registry; a mismatch usually means your CLI config is not what you think.

- Force the public registry for one command:  
  `npm view "@mnemai/memory-server" version --registry=https://registry.npmjs.org/`
- List overrides: `npm config list` and check for lines like `@mnemai:registry=...` in **project** or **user** `.npmrc`.
- If you use a mirror or private registry for scoped packages, point `@mnemai` back to the public registry for this scope, or use the `--registry` flag above.

### `npx` says `sh: mnemai-memory: command not found`

Prefer **`0.1.1+`**, which installs a CommonJS `bin` launcher. If you are stuck on an older tarball, use a global install (`npm i -g @mnemai/memory-server`) or invoke Node on the package entry (see the root README “absolute `node` path” flow).
