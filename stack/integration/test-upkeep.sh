#!/usr/bin/env bash
# Check follow mode's upkeep with stand-ins for docker, git, df and curl on PATH, so
# nothing on the host is touched (no image is really listed or removed):
#   - upgrade.sh with too little free disk (a faked df) skips the run (exit 6), says
#     DISK-LOW and disk_low in status/deployed.json, posts to RC_WEBHOOK_URL once a
#     day, even when status/ takes no writes, and first removes the superseded follow
#     and -subdirectory images, never one a container uses, the current one, the
#     previous release's, or another repository's;
#   - a follow image it can't resolve, or one outside denser's registry path,
#     removes nothing; an image docker refuses to remove is tried once a day;
#   - with enough free disk it goes past the guard (here to REFUSED: no checkout),
#     and a run that brings every app to the tip records its image and prunes;
#   - --quiet runs print nothing on stdout;
#   - follow/serve.sh keeps its server running when serving.json can't be written,
#     and writes it again on the next release once it can.
#
#   ./test-upkeep.sh
#
# Needs bash, python3 and setsid. Takes about 20 seconds. Prints "ok   NAME" or
# "FAIL NAME" per check.
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
previous_image=$repo/aidev-tests@sha256:old1
next_image=$repo/aidev-tests@sha256:dddd
head_rev=0123456789abcdef0123456789abcdef01234567
previous_rev=fedcba9876543210fedcba9876543210fedcba98
checkout=$t/checkout
site=$checkout/stack/integration
mkdir -p "$site/follow" "$checkout/.aidev" "$t/bin" "$t/run"
cp upgrade.sh "$site/"
cp follow/deployed.py follow/environment-image.sh "$site/follow/"
printf '#!/usr/bin/env bash\nexit 0\n' > "$site/caddy-apply.sh"
chmod +x "$site/caddy-apply.sh"
site_env() { # site_env [LINE...]: .env with the site's settings and LINEs
    { echo SITE_HOST=test-upkeep.invalid
      echo DENSER_MIN_FREE_GB=5
      echo RC_WEBHOOK_URL=http://webhook.invalid/hooks/test
      [ $# = 0 ] || printf '%s\n' "$@"; } > "$site/.env"
}
profile() { printf 'environment:\n  kind: "container"\n  image: "%s"\n' "$1"; }
profile "$current_image" > "$checkout/.aidev/project.yaml"

# Releases: each app serves r2; blog's previous release r1 was built at
# $previous_rev, whose project.yaml names $previous_image.
for app in blog wallet; do
    mkdir -p "$site/releases/$app/r2"
    echo "{\"revision\":\"$head_rev\"}" > "$site/releases/$app/r2/release.json"
    ln -s r2 "$site/releases/$app/current"
    echo '{"release":"r2"}' > "$site/releases/$app/serving.json"
done
mkdir -p "$site/releases/blog/r1"
ln -s r1 "$site/releases/blog/previous"
previous_release() { echo "$1" > "$site/releases/blog/r1/release.json"; }
previous_release "{\"revision\":\"$previous_rev\"}"

# Each stand-in appends its arguments to $t/calls.
cat > "$t/bin/df" <<'STUB'
#!/usr/bin/env bash
echo "Filesystem 1-blocks Used Available Capacity Mounted on"
echo "/dev/fake 96000000000 0 $FAKE_FREE_BYTES 99% /"
STUB
# FAKE_GIT=ok: a clean checkout on its branch at the tip; otherwise no checkout.
cat > "$t/bin/git" <<STUB
#!/usr/bin/env bash
echo "git \$*" >> "\$FAKE_CALLS"
case "\$*" in
    "rev-parse HEAD") echo $head_rev; exit 0 ;;
    "show $previous_rev:.aidev/project.yaml") printf 'environment:\n  image: "%s"\n' "$previous_image"; exit 0 ;;
esac
[ "\${FAKE_GIT:-}" = ok ] || exit 1
case "\$*" in
    "symbolic-ref -q --short HEAD") echo aidev/integration ;;
    "rev-parse --short HEAD") echo 0123456 ;;
esac
exit 0
STUB
# Only a webhook post (a body on stdin) is recorded; the oauth check gets nothing.
cat > "$t/bin/curl" <<'STUB'
#!/usr/bin/env bash
echo "curl $*" >> "$FAKE_CALLS"
[[ " $* " == *" --data-binary "* ]] || exit 0
cat >> "$FAKE_POSTED"
echo >> "$FAKE_POSTED"
STUB
# Containers: c1 runs the blog-subdirectory image sha256:blogused. Images: the
# current follow image, the previous release's, a superseded tagged one, and an old
# -subdirectory one. FAKE_RM_REFUSE: a reference `image rm` refuses.
cat > "$t/bin/docker" <<STUB
#!/usr/bin/env bash
echo "docker \$*" >> "\$FAKE_CALLS"
id_of() {
    case "\$1" in
        "$current_image") echo sha256:cccc ;;
        "$previous_image") echo sha256:old1 ;;
        "$next_image") echo sha256:dddd ;;
        *) return 1 ;;
    esac
}
case "\$*" in
    "ps -aq") echo c1 ;;
    "inspect --format {{.Image}} c1") echo sha256:blogused ;;
    "image inspect --format {{.Id}} "*) id_of "\${*: -1}" || exit 1 ;;
    "image inspect "*) id_of "\${*: -1}" > /dev/null || exit 1 ;;
    "image ls "*" $repo/aidev-tests")
        echo "sha256:cccc $repo/aidev-tests:<none>"
        echo "sha256:dddd $repo/aidev-tests:<none>"
        echo "sha256:old1 $repo/aidev-tests:<none>"
        echo "sha256:old2 $repo/aidev-tests:2026-10-01" ;;
    "image ls "*" $repo/blog-subdirectory")
        echo "sha256:blogused $repo/blog-subdirectory:integration"
        echo "sha256:blogold $repo/blog-subdirectory:<none>" ;;
    "image ls "*) ;;
    "image rm "*)
        [ "\${*: -1}" != "\${FAKE_RM_REFUSE:-}" ] \\
            || { echo "Error response from daemon: conflict: unable to delete \${*: -1}" >&2; exit 1; } ;;
esac
exit 0
STUB
chmod +x "$t/bin/"*
export PATH=$t/bin:$PATH FAKE_CALLS=$t/calls FAKE_POSTED=$t/posted XDG_RUNTIME_DIR=$t/run
: > "$t/posted"

upgrade() { # upgrade FREE_BYTES: sets rc; stdout in $t/out, both streams in $t/upgrade.log
    : > "$t/calls"
    rc=0
    FAKE_FREE_BYTES=$1 "$site/upgrade.sh" --quiet > "$t/out" 2> "$t/err" < /dev/null || rc=$?
    cat "$t/out" "$t/err" > "$t/upgrade.log"
}
called() { grep -qxF "$1" "$t/calls"; }
not_called_like() { ! grep -qE "$1" "$t/calls"; }
posts() { grep -c . "$t/posted" || true; }
quiet_stdout() { [ ! -s "$t/out" ]; }
no_image_ls_or_rm() { not_called_like '^docker image (ls|rm)'; }
only_denser_listed() {
    [ "$(grep -c "^docker image ls .* $repo/[a-z-]*\$" "$t/calls")" = "$(grep -c '^docker image ls' "$t/calls")" ]
}
reset_notified() { rm -rf "${t:?}/run" && mkdir "$t/run" && : > "$t/posted"; }

# --- low disk, follow image unresolvable (a truncated project.yaml) ---
site_env
: > "$checkout/.aidev/project.yaml"
upgrade 1000000000
holds "unresolvable image: exit 6" test "$rc" = 6
holds "unresolvable image: no image listed or removed" no_image_ls_or_rm
holds "unresolvable image: says the prune was skipped" grep -q "cannot resolve the follow image; skipping the prune" "$t/upgrade.log"
profile "$current_image" > "$checkout/.aidev/project.yaml"

# --- low disk, a follow image outside denser's registry path, or a blank one ---
for foreign in docker.io/library/postgres:16 " " registry.gitlab.syncad.com/hive/denser/ \
        registry.gitlab.syncad.com/hive/denser-other/x:1; do
    site_env "DENSER_FOLLOW_IMAGE=$foreign"
    upgrade 1000000000
    holds "foreign image '$foreign': no image listed or removed" no_image_ls_or_rm
    holds "foreign image '$foreign': says why" grep -q "is not in registry.gitlab.syncad.com/hive/denser/; not removing any image" "$t/upgrade.log"
done
site_env
reset_notified

# --- low disk, no status/.follow-images yet; docker refuses one image ---
FAKE_RM_REFUSE=sha256:blogold upgrade 1000000000
holds "low disk: exit 6" test "$rc" = 6
holds "low disk: says DISK-LOW" grep -q "upgrade: DISK-LOW: 1000 MB free" "$t/upgrade.log"
holds "low disk: status DISK-LOW" test "$(json "$site/status/deployed.json" 'd["upgrade"]["status"]')" = DISK-LOW
holds "low disk: disk_low true" test "$(json "$site/status/deployed.json" 'd["disk_low"]')" = True
holds "low disk: free bytes reported" test "$(json "$site/status/deployed.json" 'd["disk_free_bytes"]')" = 1000000000
holds "low disk: no fetch, pull, build or compose" not_called_like '^git (fetch|merge|status)|^docker (pull|compose|run)'
holds "low disk: webhook posted" grep -q '"text": ":warning: denser integration site test-upkeep.invalid: 1000 MB free' "$t/posted"
holds "prune: superseded tagged follow image" called "docker image rm $repo/aidev-tests:2026-10-01"
holds "prune: superseded -subdirectory image by ID" called "docker image rm sha256:blogold"
holds "prune: current, previous release's and in-use images kept" not_called_like 'image rm .*(cccc|old1|blogused|blog-subdirectory:integration)'
holds "prune: only the follow and -subdirectory repositories listed" \
    test "$(grep -c "^docker image ls .* $repo/\(aidev-tests\|blog-subdirectory\|wallet-subdirectory\)\$" "$t/calls")/$(grep -c '^docker image ls' "$t/calls")" = 3/3
holds "prune: the refused image reported" grep -q "1 images were not removed" "$t/err"
holds "prune: the refused image recorded" grep -qx "$(date -u +%F) sha256:blogold" "$site/status/.prune-failed"
holds "prune: --quiet prints nothing on stdout" quiet_stdout

FAKE_RM_REFUSE=sha256:blogold upgrade 1000000000
holds "low disk again: exit 6" test "$rc" = 6
holds "low disk again: webhook not posted twice in a day" test "$(posts)" = 1
holds "low disk again: the refused image not tried again today" not_called_like '^docker image rm sha256:blogold$'
holds "low disk again: nothing on stdout" quiet_stdout
rm -f "$site/status/.prune-failed"

# --- low disk, the previous release's image can't be told ---
previous_release '{"revision":null}'
upgrade 1000000000
holds "previous unknown: follow repository not listed" not_called_like "^docker image ls .* $repo/aidev-tests\$"
holds "previous unknown: -subdirectory images still removed" called "docker image rm sha256:blogold"
holds "previous unknown: follow images kept" not_called_like 'image rm .*aidev-tests|image rm sha256:(cccc|dddd|old1)'
previous_release "{\"revision\":\"$previous_rev\"}"

# --- low disk with status/ taking no writes: still one post a day ---
reset_notified
# Directories where the status files go: every write fails, even for root.
mkdir "$site/status/deployed.json.tmp" "$site/status/.disk-low-notified" "$site/status/.prune-failed.tmp"
for _ in 1 2 3; do FAKE_RM_REFUSE=sha256:blogold upgrade 1000000000; done
holds "status unwritable: three runs post once" test "$(posts)" = 1
holds "status unwritable: still exit 6" test "$rc" = 6
rmdir "$site/status/deployed.json.tmp" "$site/status/.disk-low-notified" "$site/status/.prune-failed.tmp"

# --- enough disk ---
upgrade 10000000000
holds "enough disk: past the guard (REFUSED, exit 3)" test "$rc" = 3
holds "enough disk: disk_low false" test "$(json "$site/status/deployed.json" 'd["disk_low"]')" = False
holds "enough disk: no prune" not_called_like '^docker image rm'

# --- a run that brings every app to the tip: records its image, then prunes ---
rm -f "$site/status/.follow-images"
echo "$head_rev $current_image" > "$site/status/.followed"
FAKE_GIT=ok upgrade 10000000000
holds "completed run: exit 0" test "$rc" = 0
holds "completed run: no build (tip and image unchanged)" not_called_like '^docker compose .* run '
holds "completed run: image recorded" test "$(cat "$site/status/.follow-images")" = "$current_image"
holds "completed run: superseded images removed" called "docker image rm $repo/aidev-tests:2026-10-01"
holds "completed run: previous release's image kept" not_called_like 'image rm .*(cccc|old1)'
holds "completed run: only denser repositories listed" only_denser_listed
holds "completed run: nothing on stdout" quiet_stdout

profile "$next_image" > "$checkout/.aidev/project.yaml"
FAKE_GIT=ok upgrade 10000000000
holds "new image: built" called "docker compose --progress quiet run --rm --no-deps -T follower bash stack/integration/follow/follow.sh once"
holds "new image: both images recorded, newest last" \
    test "$(paste -sd ' ' "$site/status/.follow-images")" = "$current_image $next_image"
holds "new image: the image before it removed" called "docker image rm sha256:old1"
holds "new image: current and previous images kept" not_called_like 'image rm .*(cccc|dddd)'
holds "new image: nothing on stdout" quiet_stdout

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
