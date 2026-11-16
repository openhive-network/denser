# Logged-out hf25 post before and after #1640: an A/B on recorded data (2026-11-16)

The integration check put the hf25 post (`/blog/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit`)
logged out at 1,020 ms median TBT for f3fca4e2, and at 1,306 and 1,186 ms for aa0ffdfd and
51c4090c, after #1640 moved the comments to per-comment user selection (issue #1644). This A/B
measures the post on recorded data, with the code as the only difference.

## Result

On recorded data, #1640 did not add main-thread work for a logged-out reader. It reduced it:
busy time per load went from 925 to 860 ms (4× CPU), and components rendered per load from
18,701 to 14,126. The rise in the integration results does not reproduce. Like the rise in
`logged-in-tbt-ab-2026-11-16.md`, it is within what live data and the measurement window move.

What #1640 added per comment for a logged-out reader:

- five `useSyncExternalStore` readers of the user query (`useUserSelect`: two in
  `CommentListItemContent`, two in `VotesComponent`, one in `AlertDialogFlag`), each its own
  QueryCache listener. The cache calls every listener for every event of every query, so each
  query event on the page made about 210 listener calls.
- two memoized components (`CommentListItemContent`, `CommentFooterStats`), each with its own
  `useTranslation`.

The listeners cost about 3 ms of busy time per load at 4× CPU: the listener closure and the
cache's listener loop. #1644 replaces them with one QueryCache listener per client, shared by
every `useUserSelect` reader, which tells the readers only of user query events. The memo
wrappers stay. They compare one prop (`CommentFooterStats`) or seven (`CommentListItemContent`),
and they are what keeps the comment header and footer stats from re-rendering when a signed-in
user is applied.

## Method

- Builds: production builds (`NEXT_PUBLIC_BASE_PATH=/blog`) made by
  `.aidev/run-lighthouse-fixture.sh` for three trees: 51c4090c with #1640 reverted (the blog code
  of f3fca4e2; #1641 and #1643 changed only the wallet and `time-ago`), 51c4090c, and 51c4090c
  with #1644.
- Lighthouse: the `lighthouse_fixture` suite on the hf25 route only (`--route ... --runs 7`),
  replaying the `lighthouse` recording (13.5, mobile simulated, CPU benchmark 4,650-4,780).
- CPU profile and commit counts: each build served as a standalone server against the dev
  stack's fixture proxy (the `lighthouse` recording), loaded logged out in Chromium with 4× CPU
  throttling. Chrome's sampling profiler (CDP `Profiler`, 200 µs) runs over the load and the
  following 8 s, and busy time is every sample except `(idle)` and `(program)`. A DevTools global
  hook counts the function components that ran in each commit. The three builds alternated, in
  two rounds of 4 loads each.

## Measurements

Lighthouse TBT, logged out, hf25, 7 runs each (ms):

| Tree | Median | Runs |
|---|---|---|
| #1640 reverted | 627 | 569-692 |
| 51c4090c | 607 | 595-718 |
| 51c4090c, second pass | 585 | 526-600 |
| 51c4090c + #1644 | 591 | 524-672 |

The differences between these medians are within each tree's spread.

CPU profile, logged out, 8 loads each:

| Tree | Busy median (ms) | Busy range | Components rendered | Post-hydration commit |
|---|---|---|---|---|
| #1640 reverted | 925 | 891-950 | 18,701 | 9,273 |
| 51c4090c | 860 | 786-939 | 14,126 | 4,618 |
| 51c4090c + #1644 | 827 | 757-876 | 14,126 | 4,618 |

The commit counts are the same on every load of a build. The hydration commit renders 7,163
components before #1640 and 7,243 after, 80 more, from the new memo components. The post-hydration
commit loses the 40 comments that re-rendered from their own user subscription. The 33 ms
between 51c4090c and #1644 is more than the listeners' attributed time and within 51c4090c's
spread. Only the listener time is attributable to the change.

## Other per-render cost seen

Every `useTranslation` call reads `document.cookie` for the language
(`packages/ui/lib/i18n-client.ts`, `readLocaleCookie`): about 58 ms of busy time per load at
4× CPU, the largest self time outside React and the module loader. The getter costs about
1.4 µs per read without cookies, and the parse is negligible, so caching the parse would not
remove it. #1640 added two of these calls per comment, a few ms of it. The read is not
changed here.

## Not covered

- The integration host itself and live data. The fixing revision's integration Lighthouse
  result comes after the promote.
- Logged in. The recording has no signed-in user. The fixture specs cover logged-in behaviour.
