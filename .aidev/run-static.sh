#!/usr/bin/env bash
# Static checks, the `static` suite of the quick, full and canary verification
# slots (AIDEV does not run the `static` slot itself for a project): ESLint errors
# and a TypeScript type check of both apps, which between them import every
# package in the workspace.
#
# ESLint runs with --quiet: the rules added for gradual adoption are warnings, and
# the existing ~200 of them must not fail a change; an error does. The locale
# key/placeholder sync checks of the blog, the wallet and the smart-signer package
# run here, with the blog's translation usage check and the check that no two
# Playwright tests of an app share a test ID.
#
# The Playwright code (apps/*/playwright) is excluded from the apps' ESLint and
# tsconfig, so it is checked on its own: its tsconfig, and its .eslintrc.js, which
# lints with type information to catch un-awaited promises.
#
# The suite runs beside the full slot's blog and wallet builds (`concurrent: true`
# in project.yaml), on the same checkout, so it reads nothing they write. Each
# app's tsconfig includes next-env.d.ts and .next/types/**, which `next build`
# empties and writes again (and adds back to tsconfig.json when missing), so the
# apps are type-checked through a copy of their tsconfig with those two entries
# left out: what a clean checkout, the state the suite ran on before the builds,
# checks. The route types of .next/types stay checked by the builds' own type
# check. ESLint skips the public/ directories `pnpm build`'s prebuild empties and
# fills with copies (the apps' `clean` script); their tracked files are images.
set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck source=pnpm-deps.sh
source .aidev/pnpm-deps.sh

# tsc of an app needs a ~1.5 GiB heap. Node otherwise sizes its heap from the
# container's memory cap, which the suite budget sets from past runs: under a
# ~3 GiB cap the derived limit is ~1.5 GiB and tsc aborts out of memory.
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=4096"

tsconfigs="$(mktemp -d)"
trap 'rm -rf "$tsconfigs"' EXIT

# Writes a tsconfig extending apps/$1/tsconfig.json whose `include` drops the
# entries `next build` writes, and prints its path. The kept entries are made
# absolute, and typeRoots names the node_modules/@types directories tsc would
# look in from the app: both default to the copy's own directory.
build_free_tsconfig() {
    local out="$tsconfigs/$1.json"
    node -e '
        const fs = require("node:fs");
        const path = require("node:path");
        const [appDir, out] = process.argv.slice(1);
        const base = path.join(appDir, "tsconfig.json");
        const { include } = JSON.parse(fs.readFileSync(base, "utf8"));
        const generated = (entry) => entry === "next-env.d.ts" || entry.startsWith(".next/");
        const typeRoots = [];
        for (let dir = appDir; ; dir = path.dirname(dir)) {
            typeRoots.push(path.join(dir, "node_modules", "@types"));
            if (dir === path.dirname(dir)) break;
        }
        fs.writeFileSync(out, JSON.stringify({
            extends: base,
            compilerOptions: { typeRoots },
            include: include.filter((entry) => !generated(entry)).map((entry) => path.resolve(appDir, entry))
        }, null, 2));
    ' "$PWD/apps/$1" "$out"
    echo "$out"
}

status=0
for app in blog wallet; do
    echo "== eslint apps/$app" >&2
    pnpm --filter "@hive/$app" exec eslint . --quiet \
        --ignore-pattern 'public/auth/**' --ignore-pattern 'public/locales/**' \
        --ignore-pattern 'public/smart-signer/**' < /dev/null || status=1
    echo "== tsc apps/$app" >&2
    # --incremental false: the shared tsconfig enables incremental builds, which
    # would leave a .tsbuildinfo in the tree.
    tsconfig="$(build_free_tsconfig "$app")"
    pnpm --filter "@hive/$app" exec tsc --noEmit --incremental false -p "$tsconfig" < /dev/null || status=1
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
echo "== playwright test ID uniqueness" >&2
node scripts/check-playwright-test-ids.js < /dev/null || status=1
echo "== blog translation usage" >&2
pnpm --filter @hive/blog lint:translations:usage < /dev/null || status=1
exit "$status"
