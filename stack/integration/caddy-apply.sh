#!/usr/bin/env bash
# Load caddy/ into the running caddy service when it differs from what that service
# last loaded. caddy/ is mounted as a directory, so the container sees a changed file
# at once, but caddy reads its config only when it starts or reloads.
#
# The config ($DENSER_CADDYFILE in the container) is validated first, and `caddy
# reload` keeps the running config when the new one fails to load: a bad change
# leaves the old routes serving and exits 1, on every run until caddy/ is fixed.
# status/.caddy-applied holds the digest of the caddy/ last loaded.
#
# Run with the stack's COMPOSE_* environment (upgrade.sh, session-stack.sh up).
#
#   ./caddy-apply.sh [--quiet]   # --quiet: print nothing when nothing changed
#
# Exit: 0 loaded, unchanged, or no caddy container (it loads caddy/ when it starts);
# 1 the new config was refused, or caddy is not running.
set -euo pipefail
cd "$(dirname "$0")"

quiet=false
[ "${1:-}" = --quiet ] && quiet=true
say() { $quiet || echo "$@"; }

stamp=status/.caddy-applied
digest=$(cd caddy && sha256sum -- * | sha256sum | cut -c1-64)
[ "$(cat "$stamp" 2>/dev/null)" = "$digest" ] && exit 0

if [ -z "$(docker compose ps -a -q caddy)" ]; then
    say "caddy-apply: no caddy container yet; it loads caddy/ when it starts"
    exit 0
fi

# shellcheck disable=SC2016 # expanded in the container
if ! output=$(docker compose exec -T caddy sh -c '
    caddy validate --config "$DENSER_CADDYFILE" --adapter caddyfile &&
    caddy reload --config "$DENSER_CADDYFILE" --adapter caddyfile' 2>&1); then
    echo "caddy-apply: REFUSED: caddy did not load caddy/ (${digest:0:12}); it keeps serving its previous config" >&2
    tail -n 20 <<< "$output" >&2
    exit 1
fi
echo "$digest" > "$stamp"
echo "caddy-apply: caddy loaded caddy/ (${digest:0:12})"
