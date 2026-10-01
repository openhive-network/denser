# Sourced, not executed, from the repository root by every .aidev/run-*.sh script
# and by the dev stack's services: installs node_modules and writes
# apps/*/version.json, the two things a fresh checkout lacks before anything in it
# can be linted, type-checked, tested or built. Returns non-zero when the install
# fails, so a caller must stop on it (`set -e`, or `source … && …`).
#
# The suites run in the image of .aidev/runtime/Dockerfile under `--network none`,
# so the install is offline, from the pnpm store baked into that image. It is
# skipped only when the marker names this pnpm-lock.yaml and this image, and the
# apps resolve the next and react the lockfile pins (.aidev/check-node-modules.mjs);
# otherwise `pnpm install --offline --frozen-lockfile` runs.
# The marker is written after a successful install that passes that check.
#
# Services and suites can share one bind-mounted checkout, so installs into it
# are serialised on node_modules/.aidev-install.lock; a second caller waits, then
# finds the tree current and skips.

# The image's digest is not visible inside its containers; the time its pnpm store
# was built (and node's version) identify the image instead, the same way for the
# suites and the dev stack, which share one node_modules.
runtime_id="store-$(stat -c %Y "${npm_config_store_dir:-/nonexistent}" 2>/dev/null) node-$(node --version)"
marker_want="$(sha256sum pnpm-lock.yaml | cut -d' ' -f1) $runtime_id"
marker=node_modules/.aidev-pnpm-lock-sha256

mkdir -p node_modules
exec {install_lock_fd}>node_modules/.aidev-install.lock
flock "$install_lock_fd"
if [ "$(cat "$marker" 2>/dev/null)" != "$marker_want" ] || ! node .aidev/check-node-modules.mjs; then
    echo "node_modules is not the install of pnpm-lock.yaml in this image: running pnpm install --offline" >&2
    # pnpm 10 answers "Already up to date" from this file without relinking, so a
    # missing app link would survive the install.
    rm -f node_modules/.pnpm-workspace-state.json
    if ! pnpm install --offline --frozen-lockfile < /dev/null || ! node .aidev/check-node-modules.mjs; then
        echo "pnpm install --offline did not produce a consistent node_modules; not writing $marker" >&2
        exec {install_lock_fd}>&-
        return 1
    fi
    printf '%s\n' "$marker_want" > "$marker.tmp.$$"
    mv -f "$marker.tmp.$$" "$marker"
fi
exec {install_lock_fd}>&-

# Imported by the apps' sidebars and gitignored; the root scripts write it before
# dev/build. Without git metadata (a worktree whose .git points outside the
# mount) the fields are empty, which the apps render as a blank version.
for app in blog wallet; do
    [ -e "apps/$app/version.json" ] || ./scripts/write-version.sh "apps/$app/version.json" < /dev/null > /dev/null 2>&1 \
        || echo '{"branch":"","commithash":"","version":""}' > "apps/$app/version.json"
done
