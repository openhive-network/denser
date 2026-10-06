#!/usr/bin/env sh
# Runs the given command with REACT_APP_GIT_COMMIT_SHA set to the checkout's commit
# (kept when already set). The apps' sidebars read it at runtime through react-env.
REACT_APP_GIT_COMMIT_SHA="${REACT_APP_GIT_COMMIT_SHA:-$(git rev-parse HEAD 2>/dev/null)}"
export REACT_APP_GIT_COMMIT_SHA
exec "$@"
