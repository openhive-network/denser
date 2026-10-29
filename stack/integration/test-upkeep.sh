#!/usr/bin/env bash
# Check follow mode's upkeep with stand-ins for docker, git, df and curl on PATH, so
# nothing on the host is touched:
#   - upgrade.sh with too little free disk (a faked df) skips the run (exit 6), says
#     DISK-LOW and disk_low in status/deployed.json, posts to RC_WEBHOOK_URL once a
#     day, and first removes the superseded follow and -subdirectory images, never
#     one a container uses, the current one, or another repository's;
#   - with enough free disk it goes past the guard (here to REFUSED: no checkout);
#   - follow/serve.sh keeps its server running when serving.json can't be written,
#     and writes it again on the next release once it can.
#
#   ./test-upkeep.sh
#
# Needs bash, python3 and setsid. Takes about 15 seconds.
#
# Exit: 0 every check passed; 1 one failed.
set -euo pipefail
cd "$(dirname "$0")"

failed=0
holds() { # holds NAME COMMAND...
    local name=$1
    shift
    if "$@"; then echo "ok   $name"; else echo "FAIL $name"; failed=1; fi
}
json() { python3 -c 'import json, sys; print(eval(sys.argv[2], {}, {"d": json.load(open(sys.argv[1]))}))' "$@"; }

t=$(mktemp -d)
serve_pid=""
trap '[ -z "$serve_pid" ] || kill "$serve_pid" 2>/dev/null || true; rm -rf "$t"' EXIT

repo=registry.gitlab.syncad.com/hive/denser
current_image=$repo/aidev-tests@sha256:cccc
site=$t/site
mkdir -p "$site/follow" "$t/bin"
cp upgrade.sh "$site/"
cp follow/deployed.py follow/environment-image.sh "$site/follow/"
cat > "$site/.env" <<EOF
SITE_HOST=test-upkeep.invalid
DENSER_FOLLOW_IMAGE=$current_image
DENSER_MIN_FREE_GB=5
RC_WEBHOOK_URL=http://webhook.invalid/hooks/test
EOF

# Each stand-in appends its arguments to $t/calls.
cat > "$t/bin/df" <<'EOF'
#!/usr/bin/env bash
echo "Filesystem 1-blocks Used Available Capacity Mounted on"
echo "/dev/fake 96000000000 0 $FAKE_FREE_BYTES 99% /"
EOF
cat > "$t/bin/git" <<'EOF'
#!/usr/bin/env bash
echo "git $*" >> "$FAKE_CALLS"
[ "$*" = "rev-parse HEAD" ] && { echo 0123456789abcdef0123456789abcdef01234567; exit 0; }
exit 1
EOF
cat > "$t/bin/curl" <<'EOF'
#!/usr/bin/env bash
echo "curl $*" >> "$FAKE_CALLS"
cat >> "$FAKE_POSTED"
echo >> "$FAKE_POSTED"
EOF
# Containers: c1 runs the blog-subdirectory image sha256:blogused. Images: the
# current follow image, a superseded one, and an old -subdirectory one.
cat > "$t/bin/docker" <<EOF
#!/usr/bin/env bash
echo "docker \$*" >> "\$FAKE_CALLS"
case "\$*" in
    "ps -aq") echo c1 ;;
    "inspect --format {{.Image}} c1") echo sha256:blogused ;;
    "image inspect --format {{.Id}} $current_image") echo sha256:cccc ;;
    "image ls "*" $repo/aidev-tests")
        echo "sha256:cccc $repo/aidev-tests:<none>"
        echo "sha256:old1 $repo/aidev-tests:<none>"
        echo "sha256:old2 $repo/aidev-tests:2026-10-01" ;;
    "image ls "*" $repo/blog-subdirectory")
        echo "sha256:blogused $repo/blog-subdirectory:integration"
        echo "sha256:blogold $repo/blog-subdirectory:<none>" ;;
    "image ls "*) ;;
    "image inspect "*) exit 1 ;;
esac
exit 0
EOF
chmod +x "$t/bin/"*
export PATH=$t/bin:$PATH FAKE_CALLS=$t/calls FAKE_POSTED=$t/posted

upgrade() { # upgrade FREE_BYTES: sets rc
    : > "$t/calls"
    rc=0
    FAKE_FREE_BYTES=$1 "$site/upgrade.sh" --quiet > "$t/upgrade.log" 2>&1 || rc=$?
}
called() { grep -qxF "$1" "$t/calls"; }
not_called_like() { ! grep -qE "$1" "$t/calls"; }

# --- low disk ---
upgrade 1000000000
holds "low disk: exit 6" test "$rc" = 6
holds "low disk: says DISK-LOW" grep -q "upgrade: DISK-LOW: 1000 MB free" "$t/upgrade.log"
holds "low disk: status DISK-LOW" test "$(json "$site/status/deployed.json" 'd["upgrade"]["status"]')" = DISK-LOW
holds "low disk: disk_low true" test "$(json "$site/status/deployed.json" 'd["disk_low"]')" = True
holds "low disk: free bytes reported" test "$(json "$site/status/deployed.json" 'd["disk_free_bytes"]')" = 1000000000
holds "low disk: no fetch, pull, build or compose" not_called_like '^git (fetch|merge|status)|^docker (pull|compose|run)'
holds "low disk: webhook posted" grep -q '"text": ":warning: denser integration site test-upkeep.invalid: 1000 MB free' "$t/posted"
holds "prune: superseded follow image by ID" called "docker image rm sha256:blogold sha256:old1 $repo/aidev-tests:2026-10-01"
holds "prune: current image and in-use image kept" not_called_like 'image rm .*(cccc|blogused|blog-subdirectory:integration)'
holds "prune: only the follow and -subdirectory repositories listed" \
    test "$(grep -c "^docker image ls .* $repo/\(aidev-tests\|blog-subdirectory\|wallet-subdirectory\)\$" "$t/calls")/$(grep -c '^docker image ls' "$t/calls")" = 3/3

upgrade 1000000000
holds "low disk again: exit 6" test "$rc" = 6
holds "low disk again: webhook not posted twice in a day" test "$(grep -c . "$t/posted")" = 1

# --- enough disk ---
upgrade 10000000000
holds "enough disk: past the guard (REFUSED, exit 3)" test "$rc" = 3
holds "enough disk: disk_low false" test "$(json "$site/status/deployed.json" 'd["disk_low"]')" = False
holds "enough disk: no prune" not_called_like '^docker image rm'

# --- serve.sh with an unwritable serving.json ---
releases=$t/releases
mkdir -p "$releases/blog/r1/apps/blog" "$releases/blog/r2/apps/blog" "$t/src/apps/blog/node_modules/.bin"
echo '{"revision":"aaaa"}' > "$releases/blog/r1/release.json"
echo '{"revision":"bbbb"}' > "$releases/blog/r2/release.json"
ln -s r1 "$releases/blog/current"
# A directory where the status file's .tmp goes: the write fails even for root.
mkdir "$releases/blog/serving.json.tmp"
printf '#!/usr/bin/env bash\nexec sleep 60\n' > "$t/src/apps/blog/node_modules/.bin/react-env"
chmod +x "$t/src/apps/blog/node_modules/.bin/react-env"
FOLLOW_RELEASES=$releases FOLLOW_SOURCE_DIR=$t/src bash follow/serve.sh blog > "$t/serve.log" 2>&1 &
serve_pid=$!
sleep 5
holds "serve: still running after a failed serving.json write" kill -0 "$serve_pid"
holds "serve: says it could not write serving.json" grep -q "could not write .*serving.json; serving r1 regardless" "$t/serve.log"
holds "serve: no serving.json" test ! -e "$releases/blog/serving.json"
rmdir "$releases/blog/serving.json.tmp"
ln -sfn r2 "$releases/blog/current"
sleep 5
holds "serve: moved onto the next release" grep -q "starting r2" "$t/serve.log"
holds "serve: serving.json written once it can be" test "$(json "$releases/blog/serving.json" 'd["release"]')" = r2
kill "$serve_pid"
wait "$serve_pid" 2>/dev/null || true
serve_pid=""

exit $failed
