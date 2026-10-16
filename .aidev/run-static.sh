#!/usr/bin/env bash
# Static checks, the `static` suite of the quick, full and canary verification
# slots (AIDEV does not run the `static` slot itself for a project): ESLint errors
# and a TypeScript type check of both apps, which between them import every
# package in the workspace.
#
# ESLint runs with --quiet: the rules added for gradual adoption are warnings, and
# the existing ~200 of them must not fail a change; an error does. The locale
# key/placeholder sync checks of the blog, the wallet and the smart-signer package
# run here, with the blog's translation usage check.
#
# The Playwright code (apps/*/playwright) is excluded from the apps' ESLint and
# tsconfig, so it is checked on its own: its tsconfig, and its .eslintrc.js, which
# lints with type information to catch un-awaited promises.
set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck source=pnpm-deps.sh
source .aidev/pnpm-deps.sh

# tsc of an app needs a ~1.5 GiB heap. Node otherwise sizes its heap from the
# container's memory cap, which the suite budget sets from past runs: under a
# ~3 GiB cap the derived limit is ~1.5 GiB and tsc aborts out of memory.
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=4096"

status=0
for app in blog wallet; do
    echo "== eslint apps/$app" >&2
    pnpm --filter "@hive/$app" exec eslint . --quiet < /dev/null || status=1
    echo "== tsc apps/$app" >&2
    # --incremental false: the shared tsconfig enables incremental builds, which
    # would leave a .tsbuildinfo in the tree.
    pnpm --filter "@hive/$app" exec tsc --noEmit --incremental false < /dev/null || status=1
    echo "== eslint apps/$app/playwright" >&2
    # --no-ignore: the app's .eslintignore excludes playwright/. The eslintrc
    # format is forced because wallet's eslint.config.mjs would select flat config.
    ESLINT_USE_FLAT_CONFIG=false pnpm --filter "@hive/$app" exec eslint --no-ignore --ext .ts playwright --quiet < /dev/null || status=1
    echo "== tsc apps/$app/playwright" >&2
    pnpm --filter "@hive/$app" exec tsc --noEmit --incremental false -p playwright < /dev/null || status=1
done
for app in blog wallet; do
    echo "== $app translation sync" >&2
    pnpm --filter "@hive/$app" lint:translations < /dev/null || status=1
done
echo "== smart-signer translation sync" >&2
node scripts/check-smart-signer-translations.js < /dev/null || status=1
echo "== blog translation usage" >&2
pnpm --filter @hive/blog lint:translations:usage < /dev/null || status=1
exit "$status"
