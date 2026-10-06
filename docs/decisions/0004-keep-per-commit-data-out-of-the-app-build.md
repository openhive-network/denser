---
date: 2026-10-06
status: accepted
decision-makers: []
consulted: []
informed: []

id: DR-004
proposed_by: claude
area: build/docker
related_issues: [1057]
related_decisions: []
---

# Keep per-commit data out of the app build; supply it at runtime through react-env

## Context and Problem Statement

The sidebars of both apps showed the running commit by importing a gitignored
`version.json`, which CI wrote into the Docker build context and the Dockerfile
wrote from `GIT_COMMIT_SHA` before `turbo run build`. The commit hash was
therefore an input of the image's build layer: every commit, including a
docs-only one, missed that layer and ran a full `next build` (10-15 min on the
publish builder). The runner stage also declared the per-commit label ARGs
before its `RUN`, so its tool-install layer missed on every commit too.

## Considered Options

* Read the commit at runtime from `REACT_APP_GIT_COMMIT_SHA`, set as an `ENV` in
  the runner stage and published to the browser by react-env's `__ENV.js`
* Keep importing `version.json` at build time

## Decision Outcome

Chosen option: **"read the commit at runtime through react-env"**, because
react-env is already how the apps receive runtime configuration
(`env('WALLET_ENDPOINT')`, the entrypoint writes `__ENV.js` at container start).
That keeps the build layer independent of the commit, so it is reused whenever
no app input changed.

The installer stage receives no `GIT_*`/`BUILD_TIME` args. The runner declares
them, with the image labels and `ENV REACT_APP_GIT_COMMIT_SHA`, after its last
`RUN`. Local root scripts (`dev:blog`, `build:wallet`, ...) set the variable
through `scripts/with-commit-sha.sh`, and `turbo.json` passes it through
without hashing it. Paths that set nothing (the AIDEV dev stack, the fixture
builds, `docker build` without `GIT_COMMIT_SHA`) show a blank version.

### Consequences

* Good, because a commit that changes no app input reuses the build layer (a
  commit-hash-only rebuild of the blog image went from 80 s to 1 s), and the
  runner's install layer stays cached across commits.
* Bad, because build metadata shown by the apps (commit, branch, build time) must
  come from runtime env, not from a build-time import or a `NEXT_PUBLIC_*`
  variable. Any new per-commit `ARG` must be declared in the runner after its
  last `RUN`, never in the builder or installer stages.
