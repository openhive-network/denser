#!/usr/bin/env bash
# Load varnish/ into the running varnish services when it differs from what they last
# loaded: the HTML cache (`varnish`, compose.cache.yml, default.vcl) and the bot gate
# (`bot-gate`, compose.bot-gate.yml, bot-gate.vcl), whichever run. Varnish reads its
# VCL only when it starts or reloads. `varnishreload` compiles the new VCL first and
# keeps the running one when it fails, so a bad change leaves the old rules serving and
# exits 1, on every run until varnish/ is fixed. Each service is given its own file, so
# a VCL loaded by hand (varnishadm) is replaced, not reloaded.
# status/.varnish-applied holds the digest last loaded.
#
# Run with the stack's COMPOSE_* environment (upgrade.sh, session-stack.sh up).
#
#   ./varnish-apply.sh [--quiet]   # --quiet: print nothing when nothing changed
#
# Exit: 0 loaded, unchanged, or no varnish container (it loads varnish/ when it
# starts); 1 the new VCL was refused, or a varnish service is not running.
set -euo pipefail
cd "$(dirname "$0")"

quiet=false
[ "${1:-}" = --quiet ] && quiet=true
say() { $quiet || echo "$@"; }

stamp=status/.varnish-applied
digest=$(cd varnish && sha256sum -- * | sha256sum | cut -c1-64)
[ "$(cat "$stamp" 2>/dev/null)" = "$digest" ] && exit 0

loaded=()
for service_vcl in varnish:default.vcl bot-gate:bot-gate.vcl; do
    service=${service_vcl%%:*}
    vcl=${service_vcl#*:}
    # A service the stack's compose files don't have is not an error here.
    [ -n "$(docker compose ps -a -q "$service" 2>/dev/null)" ] || continue
    if ! output=$(docker compose exec -T "$service" varnishreload "/etc/varnish/$vcl" 2>&1); then
        echo "varnish-apply: REFUSED: $service did not load varnish/$vcl (${digest:0:12}); it keeps serving its previous VCL" >&2
        tail -n 20 <<< "$output" >&2
        exit 1
    fi
    loaded+=("$service")
done

if [ "${#loaded[@]}" = 0 ]; then
    say "varnish-apply: no varnish container yet; it loads varnish/ when it starts"
    exit 0
fi
echo "$digest" > "$stamp"
echo "varnish-apply: ${loaded[*]} loaded varnish/ (${digest:0:12})"
