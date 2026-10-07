---
status: proposed-not-admitted
id: none
related_issues: [1068]
---

<!-- aidev-proposal-source digest="530c1c4ef9b8f506" path="docs/decisions/0000-serve-next-static-from-the-proxy-out-of-a-cross-release-pool.md" -->

# Proposed decision record (not admitted): serve-next-static-from-the-proxy-out-of-a-cross-release-pool

This record was written by the implementer and **not admitted** to
`docs/decisions/`. It is retained here so the reasoning survives; it is not
a decision, carries no number, and no consumer of decision history reads it.

- Proposed path: `docs/decisions/0000-serve-next-static-from-the-proxy-out-of-a-cross-release-pool.md`
- Issue: #1068
- Workflow: `1068-serve-next-static-precompress-sc0cae4ab-v1`
- Why it was not admitted: Significance and novelty hold: this is a new contract between follow.sh as the pool's producer and caddy as its reader, and later changes to static layout, serving or pruning have to keep it. The record fails accuracy (requirement 4) because its quantified consequence, every route falling 110–127 KiB, is contradicted by the community-feed route in the committed baseline.json.

## Original record metadata

- date: 2026-10-07
- decision-makers: []
- consulted: []
- informed: []
- proposed_by: claude
- area: stack/integration
- related_issues: [1068]
- related_decisions: []

## Original record text

# Serve /_next/static from the proxy, precompressed, out of a pool that outlives releases

## Context and Problem Statement

On the integration site and session stacks caddy proxied every `/blog/*` and
`/wallet/*` request, the immutable `/_next/static/*` assets included, to the Next
standalone servers, and compressed them on every request at caddy's fast default
levels. Follow mode replaces an app's release, `.next/static` with it, on every
swap. A tab opened on the previous release that lazy-loads a chunk afterwards
got a 404. The middleware also put `Set-Cookie` on those responses, so shared
caches would not store them.

## Considered Options

* Serve `/<app>/_next/static/*` from caddy's `file_server` with
  `precompressed br zstd gzip`, rooted at `releases/<app>/static`: a directory
  follow.sh fills with each release's static files before the swap and prunes by age
* Keep proxying the assets to Next and compressing them on the fly
* Serve them from caddy out of the current release's own `.next/static`

## Decision Outcome

Chosen option: **"caddy serves them from a pool that outlives releases"**. Only a
directory that keeps earlier releases' hashed files lets a page from the previous
release load its chunks after a swap. Serving the current release's directory
would still 404 them, and proxying to Next keeps both that 404 and the
per-request compression.

What the code does:

* `scripts/precompress-static.mjs` writes `.br` (quality 11) and `.zst` (level 19)
  sidecars next to compressible static files. It skips a sidecar that would not be
  smaller and keeps the originals. follow.sh's packaging and the production
  `Dockerfile` run it.
* follow.sh copies a release's `.next/static` into `releases/<app>/static` before
  repointing `current`. A failed copy is recorded as a failed `package` stage and
  `current` is not moved. A release packaged before the pool existed is published
  on the next pass. If that fails, follow.sh logs it and returns 1, the release
  keeps serving, and caddy answers 404 for its assets until a pass succeeds.
* After each swap, follow.sh deletes from the pool the files that no release
  published in the last 7 days (`FOLLOW_STATIC_KEEP_DAYS`). Files the current or
  previous release has are kept whatever their age. Pruning runs only after a
  swap.
* caddy serves the pool when `DENSER_STATIC_FROM=releases` (compose.follow.yml,
  compose.session.yml). An existing file gets `Cache-Control: public,
  max-age=31536000, immutable`, and an unknown path gets a 404 without reaching
  Next. With the variable unset (images mode) the assets are proxied to Next as
  before.
* The middleware matcher of both apps leaves out `/_next/static`, `/_next/image`
  and public files by extension, except on paths containing `@` or `%40`
  (account names). That applies to production builds too.

### Consequences

* Good, because the browser gets brotli-11 bytes: in the deterministic Lighthouse
  pass each route's script transfer fell by 110–127 KiB, about 22%. caddy no
  longer recompresses immutable files, and a previous release's chunks stay
  available after a swap.
* Bad, because follow mode's assets now come from the pool, not from the running
  server. Anything that changes how a release's static files are laid out or
  named, or that serves them from somewhere else, must keep `_publish_static`,
  the pool's pruning and `Caddyfile.static.releases` consistent. A future
  middleware that has to run on static assets must change both apps' matchers.
* Bad, because the production image now carries the sidecars (about 7 MB more
  for the blog), but no production proxy in this repository serves them yet.
