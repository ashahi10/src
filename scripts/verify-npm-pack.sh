#!/usr/bin/env bash
# Verifies @tengu/memory-server tarball: installable, CLI shebang, entry exists.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/packages/memory-server"
rm -f ./*.tgz
pnpm pack >/dev/null
TARBALL="$(ls -t ./*.tgz | head -1)"
test -f "$TARBALL"
TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT
cd "$TMP"
npm init -y >/dev/null 2>&1
npm install "$ROOT/packages/memory-server/$(basename "$TARBALL")" >/dev/null
ENTRY="node_modules/@tengu/memory-server/dist/index.js"
test -f "$ENTRY"
head -1 "$ENTRY" | grep -q '#!/usr/bin/env node'
node -e "
const p=require('./node_modules/@tengu/memory-server/package.json');
if(p.bin['tengu-memory']!=='dist/index.js') process.exit(1);
"
echo "verify-npm-pack: OK ($(basename "$TARBALL"))"
