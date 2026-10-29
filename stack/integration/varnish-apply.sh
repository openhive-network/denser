#!/usr/bin/env bash
# Load varnish/ into the running varnish service (compose.cache.yml) when it differs
# from what that service last loaded: varnish reads its VCL only when it starts or
# reloads. `varnishreload` compiles the new VCL first and keeps the running one when
# it fails, so a bad change leaves the old rules serving and exits 1, on every run
# until varnish/ is fixed. status/.varnish-applied holds the digest last loaded.
#
# Run with the stack's COMPOSE_* environment (upgrade.sh, session-stack.sh up).
#
#   ./varnish-apply.sh [--quiet]   # --quiet: print nothing when nothing changed
#
# Exit: 0 loaded, unchanged, or no varnish container (it loads varnish/ when it
# starts); 1 the new VCL was refused, or varnish is not running.
set -euo pipefail
cd "$(dirname "$0")"

quiet=false
[ "${1:-}" = --quiet ] && quiet=true
say() { $quiet || echo "$@"; }

stamp=status/.varnish-applied
digest=$(cd varnish && sha256sum -- * | sha256sum | cut -c1-64)
[ "$(cat "$stamp" 2>/dev/null)" = "$digest" ] && exit 0

if [ -z "$(docker compose ps -a -q varnish)" ]; then
    say "varnish-apply: no varnish container yet; it loads varnish/ when it starts"
    exit 0
fi

if ! output=$(docker compose exec -T varnish varnishreload 2>&1); then
    echo "varnish-apply: REFUSED: varnish did not load varnish/ (${digest:0:12}); it keeps serving its previous VCL" >&2
    tail -n 20 <<< "$output" >&2
    exit 1
fi
echo "$digest" > "$stamp"
echo "varnish-apply: varnish loaded varnish/ (${digest:0:12})"
