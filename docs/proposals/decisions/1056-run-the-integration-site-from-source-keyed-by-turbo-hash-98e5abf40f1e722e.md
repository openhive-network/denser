---
status: proposed-not-admitted
id: none
related_issues: [1056]
---

<!-- aidev-proposal-source digest="98e5abf40f1e722e" path="docs/decisions/0000-run-the-integration-site-from-source-keyed-by-turbo-hash.md" -->

# Proposed decision record (not admitted): run-the-integration-site-from-source-keyed-by-turbo-hash

This record was written by the implementer and **not admitted** to
`docs/decisions/`. It is retained here so the reasoning survives; it is not
a decision, carries no number, and no consumer of decision history reads it.

- Proposed path: `docs/decisions/0000-run-the-integration-site-from-source-keyed-by-turbo-hash.md`
- Issue: #1056
- Workflow: `1056-integration-site-and-session-sc0cae4ab-v1`
- Why it was not admitted: Fails ACCURACY (requirement 4): the record says test-only commits rebuild nothing and that turbo.json keeps test-only paths out of the key, but the delivered inputs exclude only `playwright/**`. Package test files and app-root Playwright configs still change the key and trigger a rebuild. Significance and novelty would otherwise plausibly be met.

## Original record metadata

- date: 2026-10-06
- decision-makers: []
- consulted: []
- informed: []
- proposed_by: claude
- area: deploy/integration-site
- related_issues: [1056]
- related_decisions: []

## Original record text

# Run the integration site from a source checkout, rebuilding each app when its Turbo build hash changes

## Context and Problem Statement

The integration site (`stack/integration`) ran the `blog-subdirectory` and
`wallet-subdirectory` images that every AIDEV promote built and pushed
(`publish:` in `.aidev/project.yaml`). Each promote rebuilt both images for
10-15 minutes, docs-only promotes included, and a failed image build left the
site silently on an older revision. Something had to decide, per commit, which
app needs a new production build, and how a new build replaces the running one.

## Considered Options

* Keep building images on every promote (the previous model)
* Follow the branch from a checkout, classifying changed paths with hand-written lists
* Follow the branch from a checkout, keyed by Turbo's hash of each app's `build` task

## Decision Outcome

Chosen option: **"Follow the branch from a checkout, keyed by Turbo's hash of each
app's `build` task"**, because Turbo's task hash already covers what an app's
`next build` reads: its own files, the workspace packages it depends on, the
lockfile's resolution of its external dependencies, `turbo.json` and the
`NEXT_PUBLIC_*` environment. A new package or dependency edge is classified
correctly without anyone updating a list. `follow/follow.sh` adds the
environment image, the base path and the root `package.json` /
`pnpm-workspace.yaml` to that hash to make the key. When an app's key changes, it
gets a production build in the checkout, packaged as a release directory. The
release is started once on a scratch port and only then swapped in.
`follow/serve.sh` serves the previous release for the whole build. A build or
start that fails leaves the previous release serving and reports `ROLLED-BACK`.
The integration site retries on its next timer run. A session's watch loop
retries only once the tree moves. Session stacks (`session-stack.sh`) use the
same compose files and scripts.

### Consequences

* Good, because a docs-, test- or stack-only commit rebuilds nothing, and a blog-only
  commit rebuilds only the blog, with no registry round trip.
* Good, because the site stays up while a build runs: the swap is a server restart
  of about a second, which caddy's `lb_try_duration` absorbs.
* Bad, because the key must stay deterministic. A file a build or server writes
  inside an app must be git-ignored by a pattern Turbo's own file walker also
  understands, because a checkout whose git metadata is outside the container
  (a worktree) is hashed without git. `public/auth/worker.js` needed a per-app
  pattern for that reason. Test-only paths stay out of the key through the `build`
  task's `inputs` in `turbo.json`.
* Bad, because a build-time setting that Turbo does not hash (anything other than
  `NEXT_PUBLIC_*`, which next.config.js does not read today) has to be added to the
  key in `follow.sh`, or a change to it will not rebuild.
* Bad, because the apps now build and run in the project's test image
  (`environment.image`), so that image is part of production-like serving and
  must keep being able to build both apps.
* The `publish:` channel is not removed by this change. It goes once the site
  reports `"mode": "follow"`, so the site never goes stale. Production images
  still come from GitLab CI on `develop`/`main`.
