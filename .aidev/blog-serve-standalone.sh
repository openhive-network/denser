#!/usr/bin/env bash
# Command of the blog services in .aidev/test-stack.compose.yml: serve the
# checkout's production build (apps/blog/.next/standalone, from the blog_build
# suite, .aidev/run-blog-build.sh) on :3000 with this container's REACT_APP_*
# environment.
#
# The checkout is mounted read-only and shared by every blog service, so the
# server runs from a private copy: the same steps as the `start:standalone`
# script and playwright.fixture.config.ts's webServer (static and public copied
# in, react-env writing __ENV.js from the environment) plus the Dockerfile's
# lib/markdowns, done under /tmp instead of in the checkout. Two services with
# different environments therefore never overwrite each other's __ENV.js, and
# the stack leaves no files behind.
#
# Waits for the build's completion marker; a build that never completes leaves
# the service up but serving nothing, and the suite reports the missing build.
set -euo pipefail

blog=/work/apps/blog
marker="$blog/.next/aidev-build-complete"
srv=/tmp/blog-standalone

until [ -f "$marker" ]; do
    [ -n "${waiting:-}" ] || { echo "blog: waiting for $marker (the blog_build suite)"; waiting=1; }
    sleep 2
done
echo "blog: serving the build of $(cat "$marker")"

rm -rf "$srv"
cp -a "$blog/.next/standalone" "$srv"
cp -a "$blog/.next/static" "$srv/apps/blog/.next/static"
rm -rf "$srv/apps/blog/public"
cp -a "$blog/public" "$srv/apps/blog/public"
# The static pages (tos.html, privacy.html, faq.html) read lib/markdowns at run
# time, which the standalone trace does not carry; the production Dockerfile
# copies them in the same way.
if [ -d "$blog/lib/markdowns" ]; then
    mkdir -p "$srv/apps/blog/lib"
    cp -a "$blog/lib/markdowns" "$srv/apps/blog/lib/markdowns"
fi

cd "$srv/apps/blog"
exec "$blog/node_modules/.bin/react-env" -- node server.js
