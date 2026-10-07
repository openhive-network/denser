---
status: proposed-not-admitted
id: none
related_issues: [1075]
---

<!-- aidev-proposal-source digest="8790158bc349c350" path="docs/decisions/0000-block-on-route-metadata-for-every-user-agent.md" -->

# Proposed decision record (not admitted): block-on-route-metadata-for-every-user-agent

This record was written by the implementer and **not admitted** to
`docs/decisions/`. It is retained here so the reasoning survives; it is not
a decision, carries no number, and no consumer of decision history reads it.

- Proposed path: `docs/decisions/0000-block-on-route-metadata-for-every-user-agent.md`
- Issue: #1075
- Workflow: `1075-ssr-22-is-flaky-community-og-sc0cae4ab-v1`
- Why it was not admitted: Rejected on accuracy (requirement 4). The record promises tags in <head> for every user agent, but Next's runtime still streams metadata when the User-Agent header is missing, so `htmlLimitedBots: /.*/` never applies there, and the record doesn't say so. Significance and novelty are plausible for a commitment that puts metadata on every page's time-to-first-byte path, but they don't outweigh the overstated guarantee.

## Original record metadata

- date: 2026-10-07
- decision-makers: []
- consulted: []
- informed: []
- proposed_by: claude
- area: blog/seo
- related_issues: [1075]
- related_decisions: []

## Original record text

# Block the blog's HTML response on route metadata for every user agent

## Context and Problem Statement

Next 16 streams `generateMetadata` output to user agents that are not in `htmlLimitedBots`. If
metadata resolves after the shell has flushed, the title, OpenGraph and Twitter tags render into a
hidden `<div>` in `<body>` and not in `<head>`. Which one you get depends on timing. On the community
route the metadata's `getCommunity` call races the layout's `getCommunityPageData`, so the tags
landed in `<body>` some of the time (fixture test SSR-22 was flaky). Next's default bot list does
not cover every link-preview fetcher (for example Telegram, Mastodon and Signal are missing). Those
fetchers read only `<head>` and do not run JS, so they sometimes got no social card.

## Considered Options

* Set `htmlLimitedBots: /.*/` so metadata blocks for every user agent
* Have each route's `generateMetadata` resolve from the same request-deduplicated call the layout
  already awaits, so it is normally ready by the time the shell flushes
* Leave streaming on, and have the SSR tests send a bot user agent

## Decision Outcome

Chosen option: **"Set `htmlLimitedBots: /.*/`"**, because it is the only option that guarantees
the tags are in `<head>` for every user agent and every route. Dedup only makes the race unlikely
because both sides resolve on the same promise, and it has to be repeated on every route. A
bot-UA test would hide the gap from the fetchers that are missing from the list.

### Consequences

* Good, because every response carries its metadata in the server `<head>`, whatever the user agent
  or cache state. SSR-19/21/22 now send a regular desktop Chrome user agent to check this.
* Bad, because `generateMetadata` now sits on every page's time-to-first-byte path. Routes have to
  keep it cheap: reuse data the layout or page already awaits (`getPostCached`,
  `getProfileAccount`). A slow or uncached metadata fetch now delays the whole response, including
  any `loading.tsx` skeleton.
* Bad, because the community route's metadata still does a separate `getCommunity` fetch. It runs
  in parallel with the layout's fetch, so the response waits for whichever finishes last. This
  change does not dedupe it.
