# Hive-Engine Token Integration: Changed Files

This document lists all files changed for the additive, env-driven single-token Hive-Engine integration and why each file was changed.

## Planning

- `HIVE_ENGINE_TOKENS_PLAN.md`
  - Added implementation plan and constraints agreed in this task:
    - additive-only approach (no destructive/refactor behavior changes)
    - env-controlled feature toggle
    - single token support only
    - show token values alongside existing Hive values in blog and wallet
    - append-only env examples
    - additive CSS classes only
    - optional text color and optional logo override

## Shared Sidechain Logic

- `packages/ui/lib/sidechain-rewards.ts` (new)
  - Added shared config parsing from env.
  - Added single-token sidechain reward fetch logic for:
    - post-level reward value (blog)
    - account-level reward value (wallet)
  - Added support for two sources:
    - `scot` API path
    - Hive-Engine `comments` contract path
  - Added safe fallback behavior:
    - if env config is missing/disabled/invalid, return `null` so existing app behavior is unchanged.
  - Added optional env-driven UI settings:
    - token text color
    - logo URL/alt text

## Blog App

- `apps/blog/features/list-of-posts/hooks/use-sidechain-post-reward.ts` (new)
  - Added React Query hook to fetch sidechain reward data for a post.

- `apps/blog/features/list-of-posts/sidechain-post-reward.tsx` (new)
  - Added additive UI element that renders token payout values for a post.
  - Uses Hive icon by default and optional env logo override.
  - Supports optional env text-color override.

- `apps/blog/features/list-of-posts/post-list-item.tsx` (modified)
  - Added `SidechainPostReward` next to existing payout display in post cards.

- `apps/blog/features/list-of-posts/payout-hover-content.tsx` (modified)
  - Added `SidechainPostReward` in payout hover details (both pending and paid paths).

- `apps/blog/app/[param]/[p2]/[permlink]/content.tsx` (modified)
  - Added `SidechainPostReward` alongside the existing payout section on single post pages.

## Wallet App

- `apps/wallet/feature/transfers-page/hooks/use-sidechain-wallet-reward.ts` (new)
  - Added React Query hook to fetch sidechain token value for an account.

- `apps/wallet/feature/transfers-page/sidechain-wallet-reward.tsx` (new)
  - Added additive wallet UI element for configured sidechain token value.
  - Uses Hive icon by default and optional env logo override.
  - Supports optional env text-color override.

- `apps/wallet/feature/transfers-page/wallet-balances-table.tsx` (modified)
  - Added `SidechainWalletReward` in the HIVE balance area so sidechain value appears alongside existing Hive totals.

## CSS (Additive Only)

- `packages/tailwindcss/globals.css` (modified)
  - Appended new sidechain-specific classes only:
    - `.he-sidechain-reward`
    - `.he-sidechain-logo`
    - `.he-sidechain-token`
    - `.he-sidechain-amount`
  - No existing selectors were modified.

## Env Examples (Append-Only)

- `.env.blog.example` (modified)
  - Appended optional Hive-Engine sidechain env section for blog.
  - Did not replace or remove existing env keys.

- `.env.wallet.example` (modified)
  - Appended optional Hive-Engine sidechain env section for wallet.
  - Did not replace or remove existing env keys.

## Validation Notes

- Static review of all changed files completed.
- Automated lint/type checks could not be executed in this environment because project lint binaries are unavailable without a local dependency install.

## 2026-03-02 Updates (SCOT Payout Fix)

- `packages/ui/lib/sidechain-rewards.ts` (modified)
  - Fixed inflated SCOT post payout values by replacing raw `pending_token / 10^post_precision` display logic.
  - Pending post payout now uses SCOT reward-curve data from `config` and `info` endpoints:
    - `sourceWeight = total_vote_weight` (fallback `vote_rshares`)
    - `totalPendingRaw = (sourceWeight ^ author_curve_exponent) * reward_pool / pending_rshares`
    - `pendingAuthorRaw = totalPendingRaw * (author_reward_percentage / 100)`
    - `display = pendingAuthorRaw / 10^info_precision`
  - Paid post payout path now shows author-side paid value:
    - `paidAuthorRaw = max(total_payout_value - curator_payout_value - beneficiaries_payout_value, 0)`
    - `display = paidAuthorRaw / 10^info_precision`
  - Wallet SCOT conversion now also prefers SCOT `info.precision` for token display precision consistency.
  - Added SCOT metadata fetch/cache (`/config` + `/info`) used by both post and wallet calculations.
  - Result: the PIMP post payout is now in the expected range instead of showing a 1000x-inflated value.

- Validation run on 2026-03-02:
  - `corepack pnpm -w exec eslint packages/ui/lib/sidechain-rewards.ts` passed.

## 2026-03-03 Updates (Null/Invalid Token Full Fallback)

- `packages/ui/lib/sidechain-rewards.ts` (modified)
  - Added token normalization/validation for `HE_REWARDS_TOKEN`.
  - Treats empty/invalid/sentinel values as not configured:
    - empty string
    - `NULL`, `UNDEFINED`, `NONE`, `N/A`, `NA`, `FALSE`, `0`
    - non-matching symbol format
  - Result: sidechain post/wallet/comment rendering is fully disabled when token is null/invalid.

- `packages/ui/config/site.ts` (modified)
  - Added the same `HE_REWARDS_TOKEN` validity gate for blog branding overrides.
  - `SITE_NAME` / `SITE_LOGO_URL` / `SITE_LOGO_ALT` now apply only when sidechain token config is valid and enabled.
  - If token is null/invalid, header falls back to default `Hive Blog` + Hive logo behavior.

- `apps/blog/features/layouts/site-header/main-bar.tsx` (modified)
  - Switched displayed site name to `siteConfig.name` with hydration-safe default fallback.
  - Keeps logo fallback path to Hive icon when custom brand logo is absent/disabled/failed.

- `packages/middleware/lib/csp.ts` (modified)
  - Added token validity check before adding sidechain endpoint origins to `connect-src`.
  - Sidechain hosts are now included in CSP only when `HE_REWARDS_*` config is truly active/valid.

- Validation run on 2026-03-03:
  - `corepack pnpm -w exec eslint packages/ui/lib/sidechain-rewards.ts packages/ui/config/site.ts apps/blog/features/layouts/site-header/main-bar.tsx`
    - passed with one pre-existing warning in `main-bar.tsx` (`lastScrollY` hook pattern).

## 2026-03-03 Updates (Single Env Source Of Truth)

- `scripts/sync-env-local.js` (new)
  - Added env sync utility:
    - `blog`: copies `.env.blog` -> `apps/blog/.env.local`
    - `wallet`: copies `.env.wallet` -> `apps/wallet/.env.local`
  - Purpose: avoid configuration drift between root and app-local env files.

- `package.json` (modified)
  - Added helper scripts:
    - `sync:env:blog`
    - `sync:env:wallet`
    - `run:blog:local`
    - `run:wallet:local`
  - `run:*:local` scripts include version write + env sync + direct app dev start.

- Operational change
  - Canonical editable files are now root-level:
    - `.env.blog`
    - `.env.wallet`
  - App `.env.local` files are treated as generated sync targets.

## 2026-03-03 Updates (Env Accent Coverage For Remaining Red UI)

- `apps/blog/features/layouts/site-header/client-effects.tsx` (modified)
  - Uses valid sidechain config + `HE_REWARDS_TEXT_COLOR` to toggle `.he-accent-theme` and set `--he-accent-hsl`.
  - Keeps default behavior when token config is absent/invalid.

- `packages/tailwindcss/globals.css` (modified)
  - Added additive accent override classes:
    - `.he-accent-theme` to map `--destructive`, `--destructive-icon`, and `--link` to env accent color.
    - `.he-signup-accent` for legacy `redHover` sign-up button style.
    - `.he-solid-accent` for legacy hardcoded solid-red auth buttons.
  - No existing selectors were removed or rewritten; additive layer only.

- `apps/blog/features/layouts/site-header/main-bar.tsx` (modified)
  - Added `he-signup-accent` class to top-nav `Sign up` button so it follows env accent color.

- `packages/smart-signer/components/auth/methods/safestorage.tsx` (modified)
  - Added `he-solid-accent` to safe storage action buttons (`Sign in` / `Save and sign in`) so modal CTA color follows env accent.

## 2026-03-03 Updates (Payout-First Post Ranking)

- `apps/blog/features/list-of-posts/posts-loader.tsx` (modified)
  - Added additive ranking layer for post lists:
    - when sidechain config is valid, fetch sidechain payout for visible posts
    - move posts with token amount `> 0` to the top
    - preserve original relative ordering within payout and non-payout groups
  - Default fallback behavior:
    - if token is missing/blank/invalid, ranking is disabled and post order remains normal/default.

- Validation run on 2026-03-03:
  - `corepack pnpm exec eslint apps/blog/features/list-of-posts/posts-loader.tsx --max-warnings=0` passed.

## 2026-03-03 Updates (SCOT CORS Fix For Post Rewards)

- Root cause
  - `https://scot-api.hive-engine.com` does not expose browser CORS headers.
  - Direct client fetches could fail and silently fall back to `0 TOKEN` display.

- `apps/blog/app/api/sidechain/post-reward/route.ts` (new)
  - Added same-origin API proxy endpoint for post sidechain rewards.
  - Server route resolves env config and fetches SCOT/comments reward server-side, returning `{ reward }`.

- `apps/blog/features/list-of-posts/hooks/sidechain-post-reward-api.ts` (new)
  - Added client helper to call `/api/sidechain/post-reward`.

- `apps/blog/features/list-of-posts/hooks/use-sidechain-post-reward.ts` (modified/new in working tree)
  - Switched post reward query from direct sidechain fetch to same-origin proxy helper.

- `apps/blog/features/list-of-posts/posts-loader.tsx` (modified)
  - Switched payout-first ranking reward fetches to same-origin proxy helper.
  - Ranking logic remains gated by valid sidechain config and keeps default order when invalid/disabled.

- Validation run on 2026-03-03:
  - `corepack pnpm exec eslint apps/blog/app/api/sidechain/post-reward/route.ts apps/blog/features/list-of-posts/hooks/sidechain-post-reward-api.ts apps/blog/features/list-of-posts/hooks/use-sidechain-post-reward.ts apps/blog/features/list-of-posts/posts-loader.tsx --max-warnings=0` passed.

## 2026-03-03 Updates (HE PAYOUT Default Feed + 7-Day Payout Filter)

- `apps/blog/app/(main-and-community)/he-payout/*` (new)
  - Added new feed route family:
    - `/he-payout`
    - `/he-payout/my`
    - `/he-payout/[tag]`
  - Routes reuse trending feed source and apply HE payout-only filtering in UI.

- `apps/blog/features/tags-pages/list-of-posts.tsx` (modified)
  - Added `hePayoutOnly` prop passthrough to post list renderer.

- `apps/blog/features/list-of-posts/posts-loader.tsx` (modified)
  - Added `hePayoutOnly` mode:
    - keeps only posts where token payout amount `> 0`
    - and post age is within 7 days
  - Keeps previous default behavior when mode is off.

- `apps/blog/features/layouts/post-select-filter.tsx` (modified)
  - Added `HE PAYOUT` option to posts filter dropdown when sidechain config is valid.
  - Makes dropdown default value `HE PAYOUT` when sidechain config is valid.
  - Falls back to `Trending` when sidechain config is invalid/missing.

- `apps/blog/features/layouts/site-header/main-nav.tsx` (modified)
  - `Posts` nav now targets `/he-payout` when sidechain config is valid, else `/trending`.

- `apps/blog/features/layouts/site-header/main-bar.tsx` (modified)
  - Header brand link now targets `/he-payout` when sidechain config is valid, else `/trending`.

- `apps/blog/features/layouts/communities-my-bar.tsx` (modified)
  - Left sidebar `All posts` link now targets `/he-payout` when sidechain config is valid, else `/trending`.

- `apps/blog/features/layouts/community/communities-sidebar.tsx` (modified)
  - Left sidebar `All posts` link now targets `/he-payout` when sidechain config is valid, else `/trending`.

- `apps/blog/middleware.ts` (modified)
  - Root redirect now dynamic:
    - valid sidechain token config -> `/he-payout`
    - otherwise -> `/trending`
  - Added hard fallback redirect:
    - when sidechain token config is invalid/missing, direct `/he-payout*` URLs are redirected to matching `/trending*` paths.

- Validation run on 2026-03-03:
  - `corepack pnpm exec eslint apps/blog/features/layouts/post-select-filter.tsx apps/blog/features/list-of-posts/posts-loader.tsx apps/blog/features/tags-pages/list-of-posts.tsx apps/blog/features/layouts/site-header/main-nav.tsx apps/blog/features/layouts/communities-my-bar.tsx apps/blog/features/layouts/community/communities-sidebar.tsx apps/blog/middleware.ts` passed.
  - `node .\\node_modules\\eslint\\bin\\eslint.js ...he-payout route files...` passed.
  - `corepack pnpm exec eslint apps/blog/features/layouts/site-header/main-bar.tsx` shows one pre-existing warning (`lastScrollY` hook pattern), no new errors.

## 2026-03-03 Updates (Comment Sort Red Accent Fix)

- `apps/blog/features/post-rendering/comment-select-filter.tsx` (modified)
  - Added additive class `he-comment-sort-accent` to comment sort trigger.
  - Keeps existing component structure; no refactor/destructive style changes.

- `packages/tailwindcss/globals.css` (modified)
  - Added additive CSS rule:
    - `.he-accent-theme .he-comment-sort-accent { color: hsl(var(--destructive)) !important; }`
  - Result: comment sort `Trending` label now follows env accent color instead of hardcoded red.

- Validation run on 2026-03-03:
  - `corepack pnpm exec eslint apps/blog/features/post-rendering/comment-select-filter.tsx` passed.

## 2026-03-03 Updates (Voters Tooltip: Hive + PIMP Curator Columns)

- `packages/ui/lib/sidechain-rewards.ts` (modified)
  - Added `SidechainCuratorReward` model for per-voter sidechain curator values.
  - Added SCOT vote payload support (`active_votes`).
  - Added `fetchSidechainCuratorRewards(author, permlink, config)`:
    - paid path: uses SCOT `curator_payout_value`
    - pending path: derives pending curator pool from reward curve metadata:
      - `totalPendingRaw = (sourceWeight ^ author_curve_exponent) * reward_pool / pending_rshares`
      - `pendingCuratorRaw = totalPendingRaw * (1 - author_reward_percentage/100)`
    - distributes curator pool across voters proportionally by positive vote `rshares`.
  - Returns sorted per-voter token rewards for tooltip rendering.

- `apps/blog/app/api/sidechain/post-curator-rewards/route.ts` (new)
  - Added same-origin API proxy endpoint for post curator reward breakdown:
    - input: `author`, `permlink`
    - output: `{ curators: SidechainCuratorReward[] }`
  - Gated to valid sidechain config + `scot` source only.
  - Invalid/missing config returns empty array to preserve default behavior.

- `apps/blog/features/post-rendering/hooks/sidechain-curator-rewards-api.ts` (new)
  - Added client fetch helper for `/api/sidechain/post-curator-rewards`.

- `apps/blog/features/post-rendering/hooks/use-sidechain-curator-rewards.ts` (new)
  - Added React Query hook for curator breakdown data.
  - Enabled only when sidechain config is valid and source is `scot`.

- `apps/blog/features/post-rendering/votes-details-data.tsx` (modified)
  - Preserved existing Hive voter list rendering.
  - Added additive second column in the same tooltip:
    - column 1: existing Hive voter reward line
    - column 2: `${voter}: <amount> <TOKEN>` curator sidechain contribution (PIMP in your config)
  - Added dual-column header row (`Hive` and `<TOKEN> Curator`) when sidechain is active.
  - If no sidechain token config is valid, tooltip remains default single-column Hive behavior.

- Validation run on 2026-03-03:
  - `corepack pnpm exec eslint packages/ui/lib/sidechain-rewards.ts apps/blog/app/api/sidechain/post-curator-rewards/route.ts apps/blog/features/post-rendering/hooks/sidechain-curator-rewards-api.ts apps/blog/features/post-rendering/hooks/use-sidechain-curator-rewards.ts apps/blog/features/post-rendering/votes-details-data.tsx` passed.

## 2026-03-03 Updates (Voters Tooltip: Independent Sorting + Author Token Summary)

- `apps/blog/features/post-rendering/votes-details-data.tsx` (modified)
  - Updated the dual-column tooltip to use independent ranking per column:
    - `HIVE` column now sorts by highest Hive reward value.
    - `PIMP CURATOR` (token) column now sorts by highest token curator contribution.
  - Added token summary lines in the tooltip:
    - `Author: <amount> <TOKEN>`
    - `Curators: <amount> <TOKEN>`

## 2026-03-05 Updates (Wallet Sidechain Actions: Keychain Signing Fix)

- Root issue
  - Sidechain token action submit (`Transfer`/`Stake`/`Unstake`/`Delegate`) could fail before Keychain prompt with:
    - `TypeError: Cannot destructure property 'loginType' of 'options' as it is undefined.`
  - Cause: signer options were not guaranteed to be set on `transactionService` at mutation time.

- `apps/wallet/feature/transfers-page/hooks/use-sidechain-token-action-mutation.ts` (modified)
  - Added additive signer-session sync in mutation flow:
    - reads active signer data from `useSignerClient()` / `useUserClient()`
    - validates logged-in signer availability
    - calls `transactionService.setSignerOptions(signerOptions)` before broadcasting sidechain custom-json tx
  - Preserves existing mutation API and query invalidation behavior.

- `packages/transaction/index.ts` (modified)
  - Added defensive guard in `signTransaction(...)`:
    - validates `signerOptions` presence (`username`, `loginType`) before calling `getSigner(...)`
    - throws explicit message when signer session is missing
  - Prevents raw runtime destructuring failure and gives deterministic error handling.

- Outcome
  - Sidechain token actions now reliably use the active smart-signer session and proceed to signer flow (including Keychain when user session login type is Keychain).
  - Change is additive/minor and does not alter default wallet behavior when sidechain token feature is disabled.

## 2026-03-05 Updates (Env Accent For Shared Loader Spinner)

- Requested behavior
  - Shared center-page loader spinner should follow env accent color when sidechain token branding is enabled.
  - If token env is missing/invalid, loader should keep default Hive styling.

- `packages/ui/components/loading.tsx` (modified)
  - Kept existing default class (`text-red-600`) for fallback behavior.
  - Added additive class `he-loading-accent` to spinner icon.

- `packages/tailwindcss/globals.css` (modified)
  - Added additive env-accent override:
    - `.he-accent-theme .he-loading-accent { color: hsl(var(--destructive)) !important; }`
  - This uses the existing `he-accent-theme`/`--destructive` pipeline already driven by env color.

- Outcome
  - Loader color now follows configured env accent when sidechain config is active.
  - No sidechain config => default red loader remains unchanged.

## 2026-03-05 Updates (Wallet Post-Transaction Refetch Fix)

- Reported issue
  - Sidechain token transaction succeeded (toast shown) but wallet UI did not update immediately:
    - token balances (liquid/staked) remained stale
    - bottom transaction list remained stale

- `apps/wallet/feature/transfers-page/hooks/use-sidechain-token-action-mutation.ts` (modified)
  - Expanded `onSuccess` refresh flow:
    - invalidate + refetch active queries for:
      - `['accountData', account]`
      - `['profileData', account]`
      - `['Operations', account]`
      - `['accountHistory', account]`
      - `['sidechain-wallet-reward']`
      - `['sidechain-account-transactions']`
  - Added delayed follow-up refetch attempts (`2s`, `5s`, `9s`) for sidechain balances/history/operations to absorb indexer lag.

- Outcome
  - After successful sidechain token tx, wallet PIMP values and bottom history update automatically without manual page reload.

## 2026-03-05 Updates (Instant Post-Success Wallet UI Update)

- Follow-up requirement
  - UI must update immediately right after transaction success (not only after sidechain indexers catch up).

- `apps/wallet/feature/transfers-page/hooks/use-sidechain-token-action-mutation.ts` (modified)
  - Added optimistic cache updates in `onSuccess` for the active account:
    - `sidechain-wallet-reward`:
      - `transfer`: immediate liquid decrease (except self-transfer)
      - `stake`: immediate liquid decrease + staked increase
      - `unstake`: immediate staked decrease
    - `sidechain-account-transactions`:
      - prepends optimistic transaction row using broadcast transaction id and current timestamp.
  - Kept existing invalidation/refetch flow (including delayed retries) for eventual consistency.

- Outcome
  - PIMP balance rows and token transaction list now update instantly after success toast, then reconcile with backend/indexed values in background.

## 2026-03-05 Updates (No-Flicker Instant Wallet Values)

- Reported behavior
  - After instant update, value briefly bounced (example: `626 -> 629 -> 626`) due immediate sidechain refetch returning stale indexer data.

- `apps/wallet/feature/transfers-page/hooks/use-sidechain-token-action-mutation.ts` (modified)
  - Removed immediate sidechain refetch after success for:
    - `sidechain-wallet-reward`
    - `sidechain-account-transactions`
  - Kept optimistic cache updates as authoritative immediate UI state.
  - Sidechain queries are now marked stale (`refetchType: 'none'`) without forcing instant network overwrite.

- Outcome
  - Wallet values and token tx list update instantly and remain stable after success toast (no stale bounce-back flicker).

## 2026-03-06 Updates (TODO Batch A-F)

### A) Favicon from env logo

- `apps/blog/app/layout.tsx` (modified)
  - Added env-driven favicon resolver for metadata icons.
  - Uses sidechain validity gate and env fallback order:
    - `SITE_LOGO_URL` / `REACT_APP_SITE_LOGO_URL`
    - fallback `HE_REWARDS_LOGO_URL` / `REACT_APP_HE_REWARDS_LOGO_URL`
    - default `/favicon.ico` when sidechain branding is inactive/invalid.

- `apps/wallet/app/layout.tsx` (modified)
  - Same env-driven favicon logic as blog for consistency.

### B) Modal red accent cleanup (additive)

- `packages/tailwindcss/globals.css` (modified)
  - Added additive modal-scoped accent overrides under `.he-accent-theme`:
    - background red utility classes
    - text red utility classes
    - red hover utility classes
    - red shadow utility classes
  - Scope limited to modal containers (`role='dialog'` / `role='alertdialog'`).

- Wallet spinner color updates (modified)
  - Replaced hardcoded spinner color `#dc2626` with `hsl(var(--destructive))` in wallet modal-related components:
    - `apps/wallet/components/transfer-dialog.tsx`
    - `apps/wallet/components/revoke-dialog.tsx`
    - `apps/wallet/feature/transfers-page/sidechain-token-action-dialog.tsx`
    - `apps/wallet/feature/transfers-page/delegate-rc-dialog.tsx`
    - plus related wallet spinner surfaces touched in same sweep.

### C) Delegation total under staked token

- `packages/ui/lib/sidechain-rewards.ts` (modified)
  - Added `delegationAmount` to `SidechainWalletReward`.
  - Added delegation query helper from Hive-Engine:
    - `tokens.delegations`, query `{ from: account, symbol }`
    - aggregated total delegated quantity.

- `apps/wallet/feature/transfers-page/wallet-balances-table.tsx` (modified)
  - Added delegation total line under staked token row:
    - `Delegation total: <amount> <TOKEN>`.

### D) Unstake period under staked token

- `packages/ui/lib/sidechain-rewards.ts` (modified)
  - Added token metadata query helper from `tokens.tokens` for:
    - `unstakingCooldown`
    - `numberTransactions`
  - Added wallet model fields:
    - `unstakeCooldownDays`
    - `unstakeTransactions`

- `apps/wallet/feature/transfers-page/wallet-balances-table.tsx` (modified)
  - Added unstake period line under staked token row:
    - `Unstake period: <days/transactions>`
    - safe fallback `N/A`.

### E) Transactions include delegations

- `apps/wallet/feature/transfers-page/account-history.tsx` (modified)
  - Extended token transaction filter with delegation operation patterns:
    - `delegat`
    - `undeleg`.

- `apps/wallet/feature/transfers-page/sidechain-history-table.tsx` (modified)
  - Added delegation and undelegation sentence rendering.

### F) Complete transfer copy + bold counterparty

- `apps/wallet/feature/transfers-page/sidechain-history-table.tsx` (modified)
  - Updated token history phrasing to complete sentence style.
  - Counterparty accounts now render as bold profile links.
  - Transfer examples:
    - `<amount> <TOKEN> received from <account>`
    - `<amount> <TOKEN> sent to <account>`.

### Supporting update

- `apps/wallet/feature/transfers-page/hooks/use-sidechain-token-action-mutation.ts` (modified)
  - Optimistic cache update now increments `delegationAmount` immediately for successful `delegate` action.

## 2026-03-06 Follow-up Updates (TX formatting + sender context + unstake schedule detail)

- `apps/wallet/feature/transfers-page/sidechain-history-table.tsx` (modified)
  - Added normalized token quantity formatter for consistent decimals across all token history rows.
  - Distribution/claim/issue receive rows now include sender when present:
    - `<amount> <TOKEN> received from <bold account-link>`.
  - Keeps bold linked counterparty style for transfer/delegation rows.
  - Added special naming for Hive-Engine distribution contract sender:
    - when account is `contract_distribution`, render plain text label `PIMP rewards distribution`
    - label is intentionally not clickable.

- `apps/wallet/feature/transfers-page/wallet-balances-table.tsx` (modified)
  - Added unstake payout schedule detail under staked token row:
    - total unstake amount (current staked balance)
    - per-payment amount
    - payment interval + payment count.

- Validation run on 2026-03-06:
  - `corepack pnpm exec eslint apps/wallet/feature/transfers-page/sidechain-history-table.tsx apps/wallet/feature/transfers-page/wallet-balances-table.tsx`
    - passed with warnings only (no errors).
  - `corepack pnpm -C apps/wallet exec tsc --noEmit`
    - passed.

## 2026-03-03 Updates (HE PAYOUT Defaults To Configured Token Community)

- Goal
  - Make `HE PAYOUT` show the configured token community directly:
    - `PIMP` -> `/he-payout/pimp`
    - `SLOTHBUZZ` -> `/he-payout/slothbuzz`

- `apps/blog/app/(main-and-community)/he-payout/content.tsx` (modified)
  - Added optional `tag` prop and passed it to `SortedPagesPosts`.
  - This allows `/he-payout` route content to bind to the configured token community tag.

- `apps/blog/app/(main-and-community)/he-payout/page.tsx` (modified)
  - Added env-driven token-community resolver for SSR.
  - Passes resolved token tag into both `SortPage` prefetch and `Content`.
  - Keeps safe fallback to empty tag when token config is invalid/missing.

- `apps/blog/features/layouts/site-header/main-nav.tsx` (modified)
  - `Posts` nav now links to `/he-payout/<token-lowercase>` when sidechain config is valid.

- `apps/blog/features/layouts/site-header/main-bar.tsx` (modified)
  - Top-left brand link now links to `/he-payout/<token-lowercase>` when sidechain config is valid.

- `apps/blog/features/layouts/communities-my-bar.tsx` (modified)
  - `All posts` link now targets token-community HE payout path when configured.

- `apps/blog/features/layouts/community/communities-sidebar.tsx` (modified)
  - `All posts` link now targets token-community HE payout path when configured.

- `apps/blog/features/layouts/post-select-filter.tsx` (modified)
  - Selecting `HE PAYOUT` now always routes to configured token-community path.
  - No longer reuses the current page tag when `HE PAYOUT` is selected.

- `apps/blog/middleware.ts` (modified)
  - Root redirect now points to token-community path when HE rewards config is valid:
    - `/he-payout/<token-lowercase>`
  - Added redirect from bare `/he-payout` to token-community path when configured.
  - Preserves existing invalid-config fallback:
    - `/he-payout*` -> `/trending*`.

- Validation run on 2026-03-03:
  - `node .\\node_modules\\eslint\\bin\\eslint.js \"apps/blog/app/(main-and-community)/he-payout/content.tsx\" \"apps/blog/app/(main-and-community)/he-payout/page.tsx\" apps/blog/features/layouts/post-select-filter.tsx apps/blog/features/layouts/site-header/main-nav.tsx apps/blog/features/layouts/site-header/main-bar.tsx apps/blog/features/layouts/communities-my-bar.tsx apps/blog/features/layouts/community/communities-sidebar.tsx apps/blog/middleware.ts`
    - passed with one pre-existing warning in `main-bar.tsx` (`lastScrollY` hook pattern), no new errors.

## 2026-03-03 Updates (HE PAYOUT Uses Community Slug, Not Token Symbol Tag)

- Root issue observed
  - For `SLOTHBUZZ`, routing to `/he-payout/slothbuzz` loaded an unmoderated tag feed with sparse/no results.
  - The active SlothBuzz community feed is represented by community slug `hive-179927`.

- `packages/ui/lib/sidechain-rewards.ts` (modified)
  - Added `feedTag` to `SidechainRewardsConfig`.
  - Added env parsing for community/feed slug:
    - `HE_REWARDS_FEED_TAG`
    - alias `HE_REWARDS_COMMUNITY_TAG`
  - Added helper:
    - `getSidechainRewardsFeedTag(config)`
      - uses configured feed slug when valid
      - falls back to `token.toLowerCase()` otherwise.

- `apps/blog/app/(main-and-community)/he-payout/page.tsx` (modified)
  - SSR env resolver now supports `HE_REWARDS_FEED_TAG`/`HE_REWARDS_COMMUNITY_TAG`.
  - Page prefetch/content now target configured community slug.

- Routing + navigation surfaces updated to use feed/community slug helper:
  - `apps/blog/features/layouts/post-select-filter.tsx`
  - `apps/blog/features/layouts/site-header/main-nav.tsx`
  - `apps/blog/features/layouts/site-header/main-bar.tsx`
  - `apps/blog/features/layouts/communities-my-bar.tsx`
  - `apps/blog/features/layouts/community/communities-sidebar.tsx`
  - `apps/blog/middleware.ts` (root + `/he-payout` redirect now use configured feed slug)

- Environment updated for SlothBuzz:
  - `REACT_APP_HE_REWARDS_FEED_TAG=hive-179927`
  - applied in:
    - `.env.blog`
    - `.env.wallet`
    - `apps/blog/.env.local`
    - `apps/wallet/.env.local`

- Validation run on 2026-03-03:
  - `node .\\node_modules\\eslint\\bin\\eslint.js packages/ui/lib/sidechain-rewards.ts \"apps/blog/app/(main-and-community)/he-payout/page.tsx\" apps/blog/features/layouts/post-select-filter.tsx apps/blog/features/layouts/site-header/main-nav.tsx apps/blog/features/layouts/site-header/main-bar.tsx apps/blog/features/layouts/communities-my-bar.tsx apps/blog/features/layouts/community/communities-sidebar.tsx apps/blog/middleware.ts`
    - passed with one pre-existing warning in `main-bar.tsx` (`lastScrollY` hook pattern), no new errors.

## 2026-03-03 Updates (Comments Reward-Contract Pending Payout Calculation)

- Root issue
  - `comments` source posts frequently had `totalPayoutValue` fields missing while still pending.
  - Existing frontend logic therefore defaulted to `0` reward for active `comments`-contract posts.
  - Additionally, `cashoutTime` from `comments.posts` is often numeric (ms timestamp), but parser expected ISO string, causing pending posts to be treated as paid.

- `packages/ui/lib/sidechain-rewards.ts` (modified)
  - Updated `comments` post payload model to include reward-contract fields used by calculation:
    - `voteRshareSum`, `curatorPayoutValue`, `beneficiariesPayoutValue`, `beneficiaries`, `app`, numeric/string `cashoutTime`.
  - Added `comments.rewardPools` payload/config models for reward math (`intervalRewardPool`, `intervalPendingClaims`, curve/splits config).
  - Added helper functions to mirror reward-contract logic for pending estimates:
    - post claim curve (`postRewardCurve` / `postRewardCurveParameter`)
    - beneficiary split calculation
  - `comments` source payout flow now:
    - pending: computes post pending from reward pool interval claims, then derives author-side share after curation/app-tax/beneficiaries
    - paid: derives author-side from `totalPayoutValue - curatorPayoutValue - beneficiariesPayoutValue`
  - Fixed timestamp parsing to support ISO strings, numeric strings, and epoch numbers for correct pending/paid status detection.
  - Kept SCOT code path unchanged (PIMP logic not overwritten).

- Verified behavior
  - Example post present in `comments.posts` now returns non-zero pending reward via local API:
    - `GET /api/sidechain/post-reward?author=ahmadmanga&permlink=digimon-survive-lets-play-47-renamon-and-haru-cg5`
    - returns pending `SLOTHBUZZ` author reward (`~0.03578` at test time).
  - For the reported post:
    - `@patlebo/slothbuzz-interface-update` has no row in `comments.posts` for symbol `SLOTHBUZZ`, so API returns `null` (no reward data available from reward contract for that authorperm).

- Validation run on 2026-03-03:
  - `corepack pnpm exec eslint packages/ui/lib/sidechain-rewards.ts` passed.

## 2026-03-03 Updates (HE PAYOUT Community Feed Performance Mode)

- Goal
  - Make HE PAYOUT open a full community feed immediately (fast path), while still showing additive token values on cards.

- Updated HE PAYOUT route sort mode from `trending` to `created`:
  - `apps/blog/app/(main-and-community)/he-payout/content.tsx`
  - `apps/blog/app/(main-and-community)/he-payout/[tag]/content.tsx`
  - `apps/blog/app/(main-and-community)/he-payout/my/content.tsx`
  - `apps/blog/app/(main-and-community)/he-payout/page.tsx`
  - `apps/blog/app/(main-and-community)/he-payout/[tag]/page.tsx`
  - `apps/blog/app/(main-and-community)/he-payout/my/page.tsx`

- Result
  - HE PAYOUT now uses newest-first community feed behavior (same fetch model as normal community post streams).
  - No payout-only list filtering is applied in HE PAYOUT mode.
  - Token payout display remains additive on top of normal Hive payout display.

- Validation run on 2026-03-03:
  - `corepack pnpm exec eslint "apps/blog/app/*/he-payout/**/*.tsx"` passed.

## 2026-03-03 Updates (Curator Breakdown Enabled For Comments Source)

- Root issue
  - Curator breakdown tooltip column was gated to `scot` source only, so `comments` source tokens (for example THGAMING/SLOTHBUZZ style integrations) showed no sidechain curator column.

- `packages/ui/lib/sidechain-rewards.ts` (modified)
  - Extended `fetchSidechainCuratorRewards(...)` to support `comments` source.
  - Added `comments.votes` query support and vote payload model.
  - Implemented comments curator pool distribution:
    - pending: derive curator pool from reward pool interval math (`intervalRewardPool * postClaims / intervalPendingClaims * curationRewardPercentage`).
    - paid: use `posts.curatorPayoutValue`.
    - distribute curator pool across positive vote weights (`curationWeight` fallback `rshares`), aggregate by voter, sort descending.

- `apps/blog/app/api/sidechain/post-curator-rewards/route.ts` (modified)
  - Removed `scot`-only gate; endpoint now returns curator data for any valid sidechain config source.

- `apps/blog/features/post-rendering/hooks/use-sidechain-curator-rewards.ts` (modified)
  - Removed `scot`-only enable condition; hook now runs for valid `scot` or `comments` source.

- `apps/blog/features/post-rendering/votes-details-data.tsx` (modified)
  - Removed UI gate `source === 'scot'`; two-column tooltip now appears for any valid sidechain source.

- Validation run on 2026-03-03:
  - `corepack pnpm exec eslint packages/ui/lib/sidechain-rewards.ts apps/blog/app/api/sidechain/post-curator-rewards/route.ts apps/blog/features/post-rendering/hooks/use-sidechain-curator-rewards.ts apps/blog/features/post-rendering/votes-details-data.tsx` passed.

## 2026-03-03 Updates (Active Profile Switched Back To PIMP + Blue + PIMP Community)

- Environment/profile changes
  - Switched active sidechain profile back to:
    - `REACT_APP_HE_REWARDS_TOKEN=PIMP`
    - `REACT_APP_HE_REWARDS_SOURCE=scot`
    - `REACT_APP_HE_REWARDS_TEXT_COLOR=#2563eb`
  - Set explicit community slug for default posts route:
    - `REACT_APP_HE_REWARDS_FEED_TAG=hive-111011`
  - Updated brand/logo env values back to PIMP profile (`PIMP CENTRAL`, `pimptoken` avatar).
  - Applied in:
    - `.env.blog`
    - `.env.wallet`
    - `apps/blog/.env.local`
    - `apps/wallet/.env.local`

- UI label change
  - `apps/blog/features/layouts/post-select-filter.tsx` (modified)
    - changed selector item label from `HE PAYOUT` to `Community` (route value remains `/he-payout`).

- Validation run on 2026-03-03:
  - `corepack pnpm exec eslint apps/blog/features/layouts/post-select-filter.tsx` passed.

## 2026-03-05 Updates (Wallet: Account-Specific Token Balances + Token History Tab)

- Goal
  - Ensure wallet token balances match the viewed account (even when not logged in).
  - Add wallet-only token transaction tab.
  - Keep full fallback to default Hive Wallet behavior when token env is invalid/empty.

- `packages/ui/lib/sidechain-rewards.ts` (modified)
  - Normalized account input to lowercase for wallet-side sidechain fetches.
  - SCOT wallet flow now uses account-specific `tokens.balances` liquid/stake as primary data source.
  - Kept SCOT payload (`earned_token`, `staked_tokens`) as fallback when balance row is missing.
  - Removed hard dependency on SCOT account payload presence for wallet balance rendering; if SCOT payload is missing, per-account Hive-Engine balances still resolve.
  - Added timestamp normalization for sidechain account history rows via shared date parser.

- `apps/wallet/feature/transfers-page/wallet-balances-table.tsx` (modified)
  - Removed old single inline sidechain chip under HIVE row.
  - Added additive balance rows in requested order:
    - `<TOKEN>` liquid row between `HIVE` and `HIVE POWER`
    - `Staked <TOKEN>` row between `HIVE POWER` and `HIVE DOLLARS`
  - Rows are gated by valid sidechain config and mount-safe rendering to avoid hydration mismatch.

- `apps/wallet/feature/transfers-page/sidechain-wallet-reward.tsx` (modified)
  - Added balance mode support: `pending | liquid | staked | total`.
  - Added zero-safe fallback rendering when data is temporarily unavailable.
  - Keeps env logo/text color support and config gating.

- `apps/wallet/feature/transfers-page/hooks/use-sidechain-account-transactions.ts` (new)
  - Added React Query hook for Hive-Engine token account history retrieval.

- `apps/wallet/feature/transfers-page/sidechain-history-table.tsx` (new)
  - Added token history table UI for sidechain operations.
  - Includes operation formatting for buy/sell/stake/unstake/transfer/receive-style entries.

- `apps/wallet/components/transfers-history-filter.tsx` (modified)
  - Added additive history tabs:
    - `Hive`
    - `<TOKEN>`
  - Token tab appears only when sidechain config is valid.
  - Existing Hive checkboxes/search remain unchanged for Hive tab behavior.

- `apps/wallet/feature/transfers-page/account-history.tsx` (modified)
  - Added sidechain config gating and token-tab route.
  - Uses sidechain transactions list when token tab is selected.
  - Filters token list to relevant ops (buy/sell/stake/transfer/receive/distribution/claim).

- `apps/wallet/feature/transfers-page/lib/utils.ts` (modified)
  - Updated `TransferFilters` initial shape to include `historyView` key.

- `apps/wallet/app/client-effects.tsx` (modified)
  - Added additive env accent application (`.he-accent-theme` + `--he-accent-hsl`) for wallet, same fallback model as blog.

- `apps/wallet/components/site-header.tsx` (modified)
  - Added wallet branding mode for valid sidechain config:
    - logo follows blog env branding (`SITE_LOGO_URL`/fallback Hive icon)
    - text becomes `<TOKEN> WALLET` (for PIMP config: `PIMP WALLET`)
  - Added `he-signup-accent` class for env accent consistency.

- `apps/wallet/components/main-nav.tsx` (modified)
  - Replaced hardcoded red utility classes with destructive theme classes so env accent color is respected.

- `apps/wallet/components/wallet-menu.tsx` (modified)
  - Replaced hardcoded red hover classes with `hover:text-destructive` for env accent compatibility.

- `apps/wallet/feature/transfers-page/history-table.tsx` (modified)
  - Replaced hardcoded `text-red-300` no-transactions state with `text-destructive`.

- Validation run on 2026-03-05:
  - `corepack pnpm exec eslint ...touched wallet/sidechain files...` passed with warnings only (no errors).
  - `corepack pnpm -C apps/wallet exec tsc --noEmit` passed.

## 2026-03-05 Patch (Wallet Token History Empty List)

- Root cause
  - Wallet token-history fetch uses `https://history.hive-engine.com/accountHistory`, but CSP `connect-src` did not allow `history.hive-engine.com`.
  - Browser blocked the request, query fallback returned an empty list, and UI showed `No transactions found`.

- `packages/middleware/lib/csp.ts` (modified)
  - Added sidechain history host allowance when HE rewards config is valid:
    - `REACT_APP_HE_HISTORY_API_BASE_URL` origin (if provided)
    - fallback host `https://history.hive-engine.com`

- Operational note
  - Next.js dev server must be restarted after this change so new CSP headers are applied.

## 2026-03-05 Patch (Wallet UI Polish: Logo + Accent + Token Row Alignment)

- Root issues reported
  - Header still showed Hive icon instead of PIMP logo in wallet.
  - When viewing other accounts, readonly wallet value text did not follow env accent color.
  - Token balance rows showed token logo in-value and numeric typography looked misaligned.

- `apps/wallet/components/site-header.tsx` (modified)
  - Wallet token-brand logo source now prefers:
    - `SITE_LOGO_URL` (brand logo), or fallback
    - `HE_REWARDS_LOGO_URL` (token logo)
  - Keeps Hive icon fallback when neither logo is available.

- `apps/wallet/feature/transfers-page/sidechain-wallet-reward.tsx` (modified)
  - Added `showLogo` prop (default `true`).
  - Added thousands-separator formatting for token amounts (for example `218,960.9368`).
  - Normalized wallet token amount typography to `text-sm font-semibold` so it matches native Hive value size.

- `apps/wallet/feature/transfers-page/wallet-balances-table.tsx` (modified)
  - Disabled inline token logo in wallet liquid/staked token rows (`showLogo={false}`).
  - Added `he-wallet-accent-value` class to readonly balance values so accent color applies when viewing other accounts too.

- `packages/tailwindcss/globals.css` (modified)
  - Added additive rule:
    - `.he-accent-theme .he-wallet-accent-value { color: hsl(var(--destructive)); }`

- Validation run on 2026-03-05:
  - `corepack pnpm exec eslint apps/wallet/components/site-header.tsx apps/wallet/feature/transfers-page/wallet-balances-table.tsx apps/wallet/feature/transfers-page/sidechain-wallet-reward.tsx` passed with warnings only (no errors).
  - `corepack pnpm -C apps/wallet exec tsc --noEmit` passed.

## 2026-03-05 Implementation (Wallet Sidechain Token Actions: Transfer/Stake/Unstake/Delegate)

- Requested behavior
  - Liquid token row: add owner actions `Transfer` and `Stake`.
  - Staked token row: add owner actions `Unstake` and `Delegate`.
  - Actions must sign and broadcast real transactions.

- `packages/transaction/index.ts` (modified)
  - Added additive sidechain token transaction helpers using `custom_json_operation`:
    - `transferSidechainToken(...)`
    - `stakeSidechainToken(...)`
    - `unstakeSidechainToken(...)`
    - `delegateSidechainToken(...)`
  - Added shared helper for custom_json id resolution with default:
    - `ssc-mainnet-hive`

- `packages/ui/lib/sidechain-rewards.ts` (modified)
  - Added `customJsonId` to sidechain rewards config.
  - Added env parsing:
    - `HE_CUSTOM_JSON_ID` (fallback `ssc-mainnet-hive`).

- `apps/wallet/feature/transfers-page/hooks/use-sidechain-token-action-mutation.ts` (new)
  - Added mutation hook that maps action type to transaction service method.
  - Invalidates account/token queries on success to refresh balances and token history.

- `apps/wallet/feature/transfers-page/sidechain-token-action-dialog.tsx` (new)
  - Added action dialog for sidechain token operations:
    - validates amount, precision, available balance
    - validates destination account for transfer/delegate
    - submits signed transaction and shows success toast

- `apps/wallet/feature/transfers-page/wallet-balances-table.tsx` (modified)
  - Added owner-only dropdown menus:
    - Liquid row: `Transfer`, `Stake`
    - Staked row: `Unstake`, `Delegate`
  - Non-owner wallets remain read-only.

- `.env.blog.example` / `.env.wallet.example` (modified)
  - Added optional env key:
    - `REACT_APP_HE_CUSTOM_JSON_ID=ssc-mainnet-hive`

- Validation run on 2026-03-05:
  - `corepack pnpm exec eslint packages/transaction/index.ts apps/wallet/feature/transfers-page/hooks/use-sidechain-token-action-mutation.ts apps/wallet/feature/transfers-page/sidechain-token-action-dialog.tsx apps/wallet/feature/transfers-page/wallet-balances-table.tsx packages/ui/lib/sidechain-rewards.ts` passed with warnings only (no errors).
  - `corepack pnpm exec eslint apps/wallet/feature/transfers-page/sidechain-token-action-dialog.tsx` passed.
  - `corepack pnpm -C apps/wallet exec tsc --noEmit` passed.
