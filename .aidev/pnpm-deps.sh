# Sourced, not executed, from the repository root by every .aidev/run-*.sh script:
# installs node_modules and writes apps/*/version.json, the two things a fresh
# checkout lacks before anything in it can be linted, type-checked, tested or built.
#
# The suites run in the image of .aidev/runtime/Dockerfile under `--network none`,
# so the install is offline, from the pnpm store baked into that image. It runs
# only when pnpm-lock.yaml differs from what node_modules was last installed from;
# the marker is written after a successful install, so an interrupted one is redone.

lock_hash=$(sha256sum pnpm-lock.yaml | cut -d' ' -f1)
marker=node_modules/.aidev-pnpm-lock-sha256
if [ "$(cat "$marker" 2>/dev/null)" != "$lock_hash" ]; then
    echo "pnpm-lock.yaml differs from node_modules: running pnpm install --offline" >&2
    pnpm install --offline --frozen-lockfile < /dev/null
    echo "$lock_hash" > "$marker"
fi

# Imported by the apps' sidebars and gitignored; the root scripts write it before
# dev/build. Without git metadata (a worktree whose .git points outside the
# mount) the fields are empty, which the apps render as a blank version.
for app in blog wallet; do
    [ -e "apps/$app/version.json" ] || ./scripts/write-version.sh "apps/$app/version.json" < /dev/null > /dev/null 2>&1 \
        || echo '{"branch":"","commithash":"","version":""}' > "apps/$app/version.json"
done
