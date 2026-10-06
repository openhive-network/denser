---
date: 2026-10-06
status: accepted
decision-makers: []
consulted: []
informed: []

id: DR-003
proposed_by: claude
area: blog/post-rendering
related_issues: [1041, 1039]
related_decisions: []
---

# Render post and reply bodies on the server, and load the content renderer in the browser only for bodies the server didn't render

## Context and Problem Statement

`RendererContainer` rendered every post and comment body with `DefaultRenderer` inside a client
`useMemo`, so each body was rendered once during SSR and again during hydration, and the renderer
(~60 KB transferred, with sanitize-html and Remarkable) shipped in the initial JS of every post page.
Video facade thumbnails were created in an effect after hydration, so on posts that open with a
video the LCP element couldn't paint before hydration finished (audit #1039, P2). The post body and
comments live inside the post page's client component tree (`content.tsx`), and comments must still
render bodies that change in the browser: edits, replies just posted, and editor previews.

## Considered Options

* Render the bodies on the server and pass their HTML to the client components; load the renderer
  with a dynamic `import()` only for a body without server HTML
* Make the post body a server component, passed into the client tree as a slot
* Keep rendering in the client component and lazy-load it with `next/dynamic` (SSR on)

## Decision Outcome

Chosen option: **"render on the server and pass the HTML; load the renderer on demand"**, because
it is the only option that keeps the renderer out of the post page's initial JS while the
comments, which are rendered deep inside client components and change in the browser, keep their
server HTML. A server-component body would cover only the main post. `next/dynamic` with SSR
still references the renderer's chunk from the server HTML.

* `features/post-rendering/lib/render-body.ts` (`renderBody`) is the one place that turns a body
  into displayed HTML: the renderer, then the facade thumbnails (`facade-thumbnails.ts`). The
  leading thumbnail gets `fetchpriority="high"` and a proxied `srcset`; the others are lazy.
* The post page (`page.tsx`) renders the post and every discussion entry with
  `renderDiscussionBodies` and provides them through `RenderedBodiesProvider`, keyed by
  `author/permlink`. `RendererContainer` uses an entry only when its `body` and `mainPost` match.
  Otherwise it renders through `useClientRenderedBody`, which `import()`s `render-body` on first
  use. It also takes a `renderedHtml` prop for callers that render themselves (the community
  description renders synchronously, so its route still bundles the renderer).
* Client code that needs only the renderer plugins' `onMount` hooks imports them from
  `@hive/renderer/src/plugins`, an entry without `DefaultRenderer`.
* `PERF-CHUNKS-03` (`initialChunksPost.spec.ts`) fails if a chunk referenced from a post's server
  HTML contains the renderer.

### Consequences

* Good, because the facade thumbnail and the high-priority hints are in the server HTML, and
  hydration of a post page neither downloads nor re-runs the renderer.
* Bad, because every discussion entry's HTML is added to the RSC payload next to its markdown body,
  so long threads carry roughly twice the body bytes.
* Bad, because no client module on the post page may statically import `lib/renderer`,
  `lib/render-body` or `@hive/renderer`'s main entry. A body shown on the post page outside the
  server-rendered set (a cross-post's original, an edit) appears only after the renderer chunk
  loads.
* A body that fails to render on the server is logged and left out of the map, and the client
  renders it. If the renderer chunk fails to load, the error is logged and that body stays empty.
