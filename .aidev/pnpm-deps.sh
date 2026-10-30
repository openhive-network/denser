# Sourced, not executed, from the repository root by every .aidev/run-*.sh script
# and by the dev stack's services: installs node_modules, which a fresh checkout
# lacks before anything in it can be linted, type-checked, tested or built.
# Returns non-zero when the install fails, so a caller must stop on it (`set -e`,
# or `source … && …`).
#
# The suites run in the image of .aidev/runtime/Dockerfile under `--network none`,
# so the install is offline, from the pnpm store at /opt/pnpm-store baked into that
# image. It is skipped only when the marker names this pnpm-lock.yaml and this
# store, and the apps resolve the next and react the lockfile pins
# (.aidev/check-node-modules.mjs); otherwise `pnpm install --offline --frozen-lockfile` runs,
# and scripts/check-workerbee-patch.js confirms WorkerBee's block catch-up fix is in effect.
# The marker is written after a successful install that passes those checks.
#
# The environment the runtime image sets is exported here as well, so the suites
# also run in common-ci-configuration's node-test-tools image with a store mounted
# at /opt/pnpm-store (see .aidev/README.md, "The shared test image"), which sets
# none of it, with the caller's uid, which may have no writable home. pnpm must not
# switch to `packageManager`'s version: that would download at run time, offline.
#
# Services and suites can share one bind-mounted checkout, so installs into it
# are serialised on node_modules/.aidev-install.lock; a second caller waits, then
# finds the tree current and skips.

export npm_config_store_dir=/opt/pnpm-store \
    npm_config_manage_package_manager_versions=false \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    NEXT_TELEMETRY_DISABLED=1 \
    TURBO_TELEMETRY_DISABLED=1 \
    DO_NOT_TRACK=1
if [ -z "${HOME:-}" ] || [ ! -d "$HOME" ] || [ ! -w "$HOME" ]; then
    export HOME=/tmp
fi

# The image's digest is not visible inside its containers; the time its pnpm store
# was last written (and node's version) identify the store instead, the same way
# for the suites and the dev stack, which share one node_modules.
runtime_id="store-$(stat -c %Y "$npm_config_store_dir" 2>/dev/null) node-$(node --version)"
marker_want="$(sha256sum pnpm-lock.yaml | cut -d' ' -f1) $runtime_id"
marker=node_modules/.aidev-pnpm-lock-sha256

mkdir -p node_modules
exec {install_lock_fd}>node_modules/.aidev-install.lock
flock "$install_lock_fd"
if [ "$(cat "$marker" 2>/dev/null)" != "$marker_want" ] || ! node .aidev/check-node-modules.mjs; then
    echo "node_modules is not the install of pnpm-lock.yaml from this store: running pnpm install --offline" >&2
    # pnpm 10 answers "Already up to date" from this file without relinking, so a
    # missing app link would survive the install.
    rm -f node_modules/.pnpm-workspace-state.json
    if ! pnpm install --offline --frozen-lockfile --store-dir "$npm_config_store_dir" < /dev/null || ! node .aidev/check-node-modules.mjs \
        || ! node scripts/check-workerbee-patch.js; then
        echo "pnpm install --offline did not produce a consistent node_modules; not writing $marker" >&2
        exec {install_lock_fd}>&-
        return 1
    fi
    printf '%s\n' "$marker_want" > "$marker.tmp.$$"
    mv -f "$marker.tmp.$$" "$marker"
fi
exec {install_lock_fd}>&-
