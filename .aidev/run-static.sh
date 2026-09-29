#!/usr/bin/env bash
# Static checks, the `static` suite of the quick, full and canary verification
# slots (AIDEV does not run the `static` slot itself for a project): ESLint errors
# and a TypeScript type check of both apps, which between them import every
# package in the workspace.
#
# ESLint runs with --quiet: the rules added for gradual adoption are warnings, and
# the existing ~200 of them must not fail a change; an error does. Translation
# checks (lint:translations*) are not here: they fail on existing debt today.
set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck source=pnpm-deps.sh
source .aidev/pnpm-deps.sh

status=0
for app in blog wallet; do
    echo "== eslint apps/$app" >&2
    pnpm --filter "@hive/$app" exec eslint . --quiet < /dev/null || status=1
    echo "== tsc apps/$app" >&2
    # --incremental false: the shared tsconfig enables incremental builds, which
    # would leave a .tsbuildinfo in the tree.
    pnpm --filter "@hive/$app" exec tsc --noEmit --incremental false < /dev/null || status=1
done
exit "$status"
