# Hive-Engine Tokens Plan

## Goal
Add Hive-Engine token information to blog posts so users can see sidechain token rewards/details alongside existing Hive payout data.

## Current Validity Check (2026-03-03)

Plan is still valid for the agreed functional scope (single env-driven token, additive rendering, blog + wallet surfaces, SCOT/comments support), with implementation-level updates below.

### Requirement Status
1. Do not modify existing behavior paths; add only.
   - Status: `Valid` (sidechain UI is additive and gated by env config).
2. All token/reward integration is driven by environment variables.
   - Status: `Valid` (`HE_*` config read via runtime env loader).
3. If no token env configuration is present, Denser must behave exactly as it does now.
   - Status: `Valid` (`isSidechainRewardsConfigured()` short-circuits to no-op).
   - Additional guarantee: if token is empty, `"null"`, or invalid format, sidechain payout UI is disabled and blog branding falls back to default Hive (`Hive Blog` + Hive icon).
4. If token config maps to `scot` or `comments`, show alongside Hive payouts in blog + wallet.
   - Status: `Valid` (post cards, payout hover, post page, comments, wallet HIVE row).
5. CSS changes must be additive only.
   - Status: `Valid` (`.he-sidechain-*` classes appended; no existing rule overrides required for feature).
6. Default logo remains Hive unless env logo override is provided.
   - Status: `Valid` (fallback to Hive icon when token logo missing/fails).
7. Env examples must be append-only.
   - Status: `Valid` (sidechain blocks appended to `.env.blog.example` and `.env.wallet.example`).
8. Optional token theme accent should replace red highlight/arrow/button accents using env color.
   - Status: `Valid` (additive accent class layer driven by `HE_REWARDS_TEXT_COLOR` when sidechain config is valid).
9. Posts with sidechain payout for configured token should rank first; no-token/invalid-token must keep normal ordering.
   - Status: `Valid` (client-side additive ranking enabled only when sidechain config is valid).
10. Add a dedicated `HE PAYOUT` feed filter and make it default when token config is valid.
   - Status: `Valid` (route remains `/he-payout/...`; visible selector label is now `Community`; default posts tab when sidechain config is valid).
11. `HE PAYOUT` should show only posts with token payout in the last 7 days.
   - Status: `Superseded` (latest agreed behavior is full configured community feed, newest-first, for instant loading; token payout display remains additive).
12. Comment sort highlight text should follow env accent color (no hardcoded red).
   - Status: `Valid` (additive override applied to comment sort trigger via `.he-comment-sort-accent`).
13. Post votes tooltip should keep the normal Hive list and add a second curator/token contribution column.
   - Status: `Valid` (voter tooltip now renders Hive reward + token curator reward columns when sidechain config is valid).
14. In the votes tooltip, Hive and token columns should each have independent "top by value" ordering, and include author token summary.
   - Status: `Valid` (Hive column sorted by Hive reward; token column sorted by token curator value; author/curators token totals shown in tooltip header area).
15. `HE PAYOUT` should resolve to the configured token community by default.
   - Status: `Valid` (`/he-payout` default path resolves to `/he-payout/<configured-feed-tag>` when provided; otherwise token lowercase fallback).
16. `HE PAYOUT` should use token community slug (community id/tag), not token symbol tag when they differ.
   - Status: `Valid` (added env-driven `HE_REWARDS_FEED_TAG`/`HE_REWARDS_COMMUNITY_TAG` with fallback to token symbol).
17. `comments` source tokens should use reward-contract pending payout math (not SCOT fields), while preserving SCOT logic unchanged.
   - Status: `Valid` (comments path now computes pending author payout from reward pool interval claims/curve + curation/beneficiary splits; SCOT path unchanged).

### Implementation Notes (Updated from original draft)
1. Shared data layer lives in `packages/ui/lib/sidechain-rewards.ts` (not `apps/blog/lib/...`).
2. Post/comment/wallet fetch logic uses React Query hooks and separate sidechain model types rather than extending `Entry`.
3. SCOT pending payout now uses reward-curve metadata (`/config` + `/info`) instead of direct post `pending_token / 10^precision` display.
4. Additional additive env options were introduced:
   - `SITE_NAME`, `SITE_LOGO_URL`, `SITE_LOGO_ALT` for top-left blog branding override.
   - These overrides are now applied only when sidechain token config is valid and enabled.
5. Sidechain-specific i18n keys were not required by current UI (chip is numeric token display); test IDs are present on rendered sidechain elements.
6. Accent theming is now centralized through additive CSS variables (`.he-accent-theme`) so existing `text-destructive` / `bg-destructive-icon` surfaces inherit env color without refactoring existing components.
7. Legacy hardcoded red button styles were handled additively with wrapper classes (`.he-signup-accent`, `.he-solid-accent`) instead of changing existing component variants.
8. Feed post ordering now supports additive payout-first ranking:
   - When sidechain config is valid, posts with token reward amount `> 0` are shown first.
   - When sidechain config is missing/invalid, feed order remains unchanged.
9. Vote tooltip now has additive dual-column rendering:
   - Column 1: existing Hive voter reward display.
   - Column 2: sidechain token curator reward per voter (SCOT or comments source), gated by valid sidechain config.
10. Vote tooltip ranking and summary are additive and independent:
   - Hive column ranking uses Hive reward value.
   - Token column ranking uses token curator contribution value.
   - Tooltip shows token `Author` and `Curators` totals for clarity.
11. HE PAYOUT default routing is token-community aware:
   - When sidechain config is valid, default posts destinations use `/he-payout/<configured-feed-tag>` (fallback token lowercase).
   - Selecting HE PAYOUT from the posts filter always routes to the configured token community path.
12. HE PAYOUT community targeting supports explicit slug mapping:
   - `HE_REWARDS_FEED_TAG` (or alias `HE_REWARDS_COMMUNITY_TAG`) can define the actual community slug (for example `hive-179927` for SlothBuzz).
   - When not set, fallback remains token symbol lowercase.
13. Comments reward-contract math is source-specific and additive:
   - Pending payout uses `intervalRewardPool * postClaims / intervalPendingClaims` with `postRewardCurve`.
   - Author display mirrors Hive/SCOT semantics by showing author-side share after curation, app tax, and beneficiaries.
   - SCOT/PIMP calculation flow is kept separate and unchanged.

### Remaining Risk/Verification Items
1. Full e2e coverage for sidechain paths is not yet explicitly documented in this file.
2. SCOT API behavior can vary by token; formula should be spot-checked per enabled token during rollout.
3. Payout-first ranking is client-side and depends on token reward fetch completion; during initial load, list may settle after reward queries resolve.
4. SCOT does not provide explicit pending per-voter curator token amounts, so pending curator column values are derived proportionally from post-level pending curation pool and vote rshares.

### Env Source Of Truth (2026-03-03)
1. Canonical blog env file: `D:\Denser\.env.blog`
2. Canonical wallet env file: `D:\Denser\.env.wallet`
3. App-local `.env.local` files are generated/synced copies used by Next.js runtime:
   - `apps/blog/.env.local` <- `.env.blog`
   - `apps/wallet/.env.local` <- `.env.wallet`
4. Sync commands:
   - `corepack pnpm run sync:env:blog`
   - `corepack pnpm run sync:env:wallet`

## Hard Requirements (User Defined)
1. Do not modify existing behavior paths; add only.
2. All token/reward integration is driven by environment variables.
3. If no token env configuration is present, Denser must behave exactly as it does now.
4. If a token is configured in env and maps to either:
   - SCOT reward path, or
   - Hive-Engine `comments` contract reward path,
   then show that token payout data alongside existing Hive payout totals in both:
   - Blog post surfaces
   - Wallet surfaces
5. CSS changes must be additive only:
   - add new CSS elements/classes
   - do not modify existing elements or existing style rules
6. Default logo remains Hive unless an env logo override is provided for the new token UI.
7. When generating blog/wallet env examples, keep existing env keys intact and add only new keys (append-only).
8. Additive feed ordering option:
   - when a valid token is configured, posts with token payout must be listed first
   - when token is absent/invalid, ordering must remain the default Hive ranking/order
9. Add dedicated `HE PAYOUT` feed option:
   - appears only when sidechain token config is valid
   - becomes default posts tab when sidechain token config is valid
   - shows the full configured token community feed (newest-first) for fast loading
   - token payout rendering remains additive on cards/tooltips

### Latest Active Config Snapshot (2026-03-03)
1. Active token profile switched back to `PIMP`.
2. Active source switched back to `scot`.
3. Active feed/community slug set to `hive-111011` (Paper in my Pocket).
4. Active accent color set to blue (`#2563eb`).
5. Posts selector label changed from `HE PAYOUT` to `Community` (route remains `/he-payout/...`).

## Wallet Implementation Plan (2026-03-05)

### Process Rule
1. Update this plan MD first before wallet implementation changes, then keep `HIVE_ENGINE_TOKEN_CHANGES.md` in sync after each completed wallet milestone.

### Global Revert Rule (Non-Negotiable)
1. If `REACT_APP_HE_REWARDS_TOKEN` is missing, empty, `null`, invalid, or sidechain config is otherwise invalid, the entire site must revert to default behavior.
2. Revert scope includes both Blog and Wallet:
   - default Hive branding/logo/text
   - default accent colors (no sidechain override)
   - no HE/Community special tabs or token-only filters
   - no sidechain token payout rows/chips in feeds, post views, comments, or wallet balances/history
3. This fallback must be automatic and require no code/config change other than env value removal/invalidation.

### Requested Wallet Scope
1. Wallet header branding:
   - Use the same env-driven logo override behavior as blog.
   - Wallet title text should be `PIMP WALLET`.
   - If sidechain token config is invalid/empty, revert to default Hive Wallet logo/text.
2. Wallet accent color:
   - All wallet red/destructive UI accents should use env color (`HE_REWARDS_TEXT_COLOR`) via additive classes/wrappers only.
   - No hardcoded color constants for this behavior.
   - If env color is empty/invalid, default wallet styling remains unchanged.
3. Wallet balances ordering:
   - Show liquid `PIMP` balance between `HIVE` and `HIVE POWER`.
   - Show `Staked PIMP` balance between `HIVE POWER` and `HBD`.
   - If token config is invalid/empty, wallet balances revert to current default order with no sidechain rows.
4. Wallet account history filtering:
   - Add a dedicated tab that shows only configured token (`PIMP`) transactions.
   - Include transaction categories: buying, selling, staking, unstaking, transferring, receiving.
   - If token config is invalid/empty, hide/disable this token tab and keep default history tabs unchanged.

### Implementation Steps (Wallet)
1. Additive branding layer:
   - Reuse existing site/env config plumbing used by blog for logo override.
   - Add wallet-specific text override (`PIMP WALLET`) gated by valid sidechain config.
2. Additive accent layer:
   - Extend wallet wrapper/theme class to bind destructive surfaces to env accent color.
   - Keep fallback to default classes when no valid sidechain config/color is present.
3. Balance rows insertion:
   - Use current sidechain wallet hook/data source.
   - Split sidechain token values into liquid and staked display rows.
   - Inject rows at exact positions requested without rewriting existing balance components.
4. Token transactions tab:
   - Add new tab entry in wallet history controls.
   - Implement filter predicate for configured token-related operations (buy/sell/stake/unstake/transfer/receive).
   - Keep pagination/sorting behavior consistent with existing history table logic.
5. Validation and documentation:
   - Run wallet-targeted lint/tests for touched files.
   - Append completed work details to `HIVE_ENGINE_TOKEN_CHANGES.md`.

### Acceptance Criteria
1. Header shows PIMP logo + `PIMP WALLET` when sidechain config is valid; defaults to Hive Wallet when config is off/invalid.
2. Red/destructive wallet accents follow env color dynamically and revert when env color is empty.
3. Balance rows render in this exact order: `HIVE` -> `PIMP` -> `HIVE POWER` -> `Staked PIMP` -> `HBD`.
4. New transactions tab shows only token-related entries for configured token and does not affect default tabs when disabled.
5. Wallet token balances must be account-specific for the viewed profile (logged-in state is irrelevant).

### Wallet Progress Update (2026-03-05)
1. Account-specific sidechain wallet balances now use the viewed wallet account directly for Hive-Engine fetches.
2. SCOT wallet path now prefers `tokens.balances` (liquid/stake) per account, with SCOT payload fallback only when needed.
3. Wallet balance table now renders additive token rows in requested order:
   - `HIVE`
   - `<TOKEN>` liquid
   - `HIVE POWER`
   - `Staked <TOKEN>`
   - `HIVE DOLLARS`
4. Wallet account history now has additive token tab support using Hive-Engine history endpoint for token transactions.
5. Wallet client effects now apply env accent class (`he-accent-theme`) with automatic full fallback when token config is invalid.
6. CSP now includes sidechain history API host for token-history tab (`history.hive-engine.com` or env override), preventing false empty lists from blocked browser requests.
7. Wallet header logo now supports token logo fallback (`HE_REWARDS_LOGO_URL`) when brand logo is not set, and readonly wallet values use additive accent class so blue styling applies on other users' wallets too.
8. Owner-only sidechain token action menus are implemented:
   - liquid row: `Transfer`, `Stake`
   - staked row: `Unstake`, `Delegate`
   Transactions are signed and broadcast via Hive `custom_json_operation` using env/custom-json id config.

### Wallet Progress Update (2026-03-05, Keychain Signing Reliability)
1. Fixed sidechain token action signer initialization for wallet action dialogs (`Transfer`, `Stake`, `Unstake`, `Delegate`).
2. Implementation is additive/minor-modification:
   - sidechain action mutation now synchronizes `transactionService` signer options from active smart-signer client session before submit.
   - transaction service now has a defensive signer initialization guard to prevent raw runtime destructuring errors.
3. Result:
   - token action flows now follow the same smart-signer/Keychain session path as other wallet signed transactions.
   - user-facing failure mode is now explicit if signer session is missing, instead of crashing with `loginType` destructure error.

### Wallet Progress Update (2026-03-05, Loader Accent Consistency)
1. Shared center loader spinner now supports additive env accent theming via `he-loading-accent`.
2. Behavior remains fallback-safe:
   - valid sidechain env + accent => loader uses configured accent color
   - invalid/missing sidechain env => loader remains default red

### Wallet Progress Update (2026-03-05, Post-Tx UI Refresh Reliability)
1. Improved wallet refresh flow after successful sidechain token transactions.
2. On success, wallet now forces immediate refetch/invalidate for:
   - account/profile queries
   - wallet operation history
   - sidechain token balances (liquid/staked)
   - sidechain token transactions list
3. Added short delayed follow-up refetch retries to handle Hive-Engine index lag so values/lists update without manual reload.

### Wallet Progress Update (2026-03-05, Instant Success UX)
1. Added optimistic post-success wallet cache updates so token balances/history update instantly after successful broadcast.
2. Existing refetch/retry logic remains in place as background reconciliation for authoritative indexer values.

### Wallet Progress Update (2026-03-05, No-Flicker Stabilization)
1. Removed immediate sidechain refetch right after success to prevent stale indexer responses from overriding optimistic values.
2. Sidechain queries are marked stale without forced immediate refetch, keeping post-success values stable on screen.

## Wallet Token Action Plan (2026-03-05)

### New Requested Scope
1. Liquid token row (`PIMP`) must provide signed/broadcast actions:
   - `Transfer` (liquid token transfer)
   - `Stake` (move liquid token to staked balance)
2. Staked token row (`Staked PIMP`) must provide signed/broadcast actions:
   - `Unstake`
   - `Delegate`
3. All actions must be additive and env-gated:
   - show only when sidechain token config is valid
   - if token config is missing/invalid, wallet remains default behavior

### Transaction Design
1. Use Hive `custom_json_operation` for Hive-Engine token actions.
2. Default custom_json id:
   - `ssc-mainnet-hive` (mainnet)
   - optional env override for non-mainnet deployments.
3. Contract/action mapping (token contract):
   - Transfer: `contractName=tokens`, `contractAction=transfer`
   - Stake: `contractName=tokens`, `contractAction=stake`
   - Unstake: `contractName=tokens`, `contractAction=unstake`
   - Delegate: `contractName=tokens`, `contractAction=delegate`
4. Signing/auth:
   - require active auth for the wallet owner account
   - broadcast through existing transaction service flow with existing success/error toast handling pattern.

### UI/UX Plan
1. Liquid token row:
   - owner view: dropdown trigger + menu (`Transfer`, `Stake`)
   - non-owner view: read-only value only
2. Staked token row:
   - owner view: dropdown trigger + menu (`Unstake`, `Delegate`)
   - non-owner view: read-only value only
3. Dialog behavior:
   - reuse wallet transfer dialog UX pattern (amount + account where relevant + confirmation)
   - `Transfer` and `Delegate` require destination account input
   - `Stake` and `Unstake` require amount only
4. Numeric precision:
   - enforce token precision from Hive-Engine token metadata
   - prevent submit if amount exceeds available liquid/staked balance.

### Capability Gating
1. Query token metadata (`tokens.tokens`) to detect support flags:
   - staking enabled -> show `Stake`/`Unstake`
   - delegation enabled -> show `Delegate`
2. If a capability is disabled on token contract, hide that action.
3. If metadata query fails, fail closed (hide sidechain action controls, keep read-only balances).

### File-Level Implementation Plan
1. `packages/transaction/index.ts`
   - add additive sidechain token custom-json transaction helpers.
2. `apps/wallet/components/hooks/*` (new)
   - add mutations for token transfer/stake/unstake/delegate.
3. `apps/wallet/feature/transfers-page/wallet-balances-table.tsx`
   - add owner-only dropdown action menus for liquid/staked token rows.
4. `apps/wallet/feature/transfers-page/*` (new dialog component)
   - add token action dialog(s) and form validation.
5. `packages/ui/lib/sidechain-rewards.ts`
   - add token capability metadata fetch helper for UI gating and precision-safe validation.
6. `apps/wallet/locales/en/common_wallet.json`
   - add i18n keys for token action labels/messages.

### Acceptance Criteria (New Scope)
1. On owner wallet:
   - Liquid token row shows `Transfer` and `Stake` actions and broadcasts valid signed tx.
   - Staked token row shows `Unstake` and `Delegate` actions and broadcasts valid signed tx.
2. On non-owner wallet:
   - token rows remain read-only (no action menus).
3. Action visibility respects token capabilities (staking/delegation flags).
4. If token env is missing/invalid, all sidechain token actions disappear and wallet remains default.

## Assumptions
- Primary surfaces: post cards in feeds and single post footer (where payout is currently shown).
- Initial UX: keep current HBD/HP payout UI and append Hive-Engine token chips/rows (not replace).
- Data should be optional and resilient: if Hive-Engine data is unavailable, existing UI remains unchanged.

## Scope (Phase 1)
1. Add Hive-Engine token data model support in shared types.
2. Add a blog-side token data fetch layer for `author + permlink`.
3. Attach token data to post objects used by:
   - Feed list items
   - Single post page
4. Render token indicators in:
   - Feed post footer/payout hover
   - Single post footer near payout block
5. Add minimal i18n keys and test IDs for UI and e2e assertions.
6. Add additive payout-first feed ranking when sidechain token config is active.

## Env-First Design Constraints
1. Feature toggle is env-driven and defaults to disabled.
2. Exactly one token is allowed in env configuration.
3. Source for that token is env-defined (`scot` or `comments`).
4. Endpoint URLs are env-defined to avoid hard-coding source services.
5. If token/source config is invalid, skip sidechain integration and continue without breaking page rendering.

## CSS Constraints
1. Add new wrapper elements/classes for sidechain token UI.
2. Add new CSS rules only for those new classes.
3. Do not edit existing class definitions, existing selectors, or existing component style contracts.
4. Expose text color of new token UI via env-driven style config (for example, red to blue).
5. Logo rendering for new token UI must support env override while defaulting to Hive logo.
6. Remaining hardcoded red highlight elements in blog surfaces should be overridden through additive env-accent classes.

## Out of Scope (Phase 1)
- Wallet-level Hive-Engine portfolio/trading flows.
- Historical token analytics.
- Complex caching infrastructure beyond React Query defaults.

## Implementation Steps

### 1. Data Contract
- Extend `Entry`/post-adjacent types to allow optional Hive-Engine token info, e.g.:
  - token symbol
  - amount/value (if available)
  - source/status (pending/paid if available)

### 2. Data Access Layer
- Create a dedicated blog utility (`apps/blog/lib/...`) that fetches Hive-Engine token info by post identity.
- Keep API endpoint configurable via env vars (with safe default disabled state).
- Normalize API response into the new typed shape.
- Fail closed (return empty array on network/parse errors).

### 2.1 Source Routing by Env
- For the single configured token:
  - if source is `scot`, fetch using SCOT post payload path.
  - if source is `comments`, fetch using Hive-Engine contract path.
- Render the token payout next to current Hive payout displays (not replacing current values).

### 3. Query Integration
- Feed path: enrich post card data with token info using lazy query per visible post (or batched query if endpoint supports batch).
- Post page path: fetch token info for current post in existing query layer.
- Avoid blocking first paint; token UI can hydrate after main post data.

### 4. UI Integration
- Feed list item:
  - Add compact token chip row near payout.
  - Preserve existing payout number and hover behavior.
- Post page:
  - Add token row inside footer stats block near current payout/votes section.
- Payout hover:
  - Add optional token section when token data exists.

### 4.1 Feed Ranking Integration
- Add a post-list ranking layer that runs only when `isSidechainRewardsConfigured(config)` is true.
- Evaluate token payout amount for visible posts via existing sidechain post reward query path.
- Stable partition feed results:
  - group A: posts with token amount `> 0`
  - group B: posts with token amount `<= 0` or no reward
  - final order: `A + B`, preserving relative order inside each group.
- If token config is absent/invalid, skip ranking and render original data order unchanged.

### 4.2 HE PAYOUT Feed Integration
- Add new route family:
  - `/he-payout`
  - `/he-payout/my`
  - `/he-payout/[tag]`
- Backing source list uses the community feed path in `created` mode (newest first).
- `HE PAYOUT` now behaves as a fast community feed view:
  - no payout-only filtering at list level
  - token payout display remains additive in each post/comment card
  - community source is env-driven (`HE_REWARDS_FEED_TAG` / `HE_REWARDS_COMMUNITY_TAG`, fallback token slug)
- Default routing behavior:
  - if sidechain config valid: root/posts default to `/he-payout/<configured-feed-tag>`
  - if sidechain config invalid/missing: default remains `/trending`.

### 5. i18n + Test Hooks
- Add translation keys to `apps/blog/locales/en/common_blog.json`.
- Add `data-testid` selectors for token container/chips on both surfaces.

### 6. Validation
- Run blog lint and typecheck.
- Run focused Playwright checks for:
  - Feed post card token rendering
  - Post page token rendering
  - Graceful behavior when endpoint fails/returns no token data
  - Graceful behavior when env config is absent (feature effectively no-op)
  - Graceful behavior when only one source (`scot` or `comments`) is configured

## Risks and Mitigations
- Hive-Engine endpoint instability: use tolerant parsing + empty fallback.
- Extra network overhead in feeds: start with lightweight lazy loading and evaluate batch optimization if needed.
- UI noise: keep token rendering compact and hidden when empty.
- Misconfigured env: validate at startup and log warnings while preserving existing app behavior.

## Proposed Env Contract
1. `HE_REWARDS_ENABLED`
   - `true|false`
   - Master switch. Default: `false`.
2. `HE_REWARDS_TOKEN`
   - Single token symbol.
   - Example: `PIMP`
3. `HE_REWARDS_SOURCE`
   - Source for the single token (`scot` or `comments`).
   - Example: `scot`
4. `HE_SCOT_API_BASE_URL`
   - Base URL for SCOT endpoints (required when `HE_REWARDS_SOURCE=scot`).
   - Example: `https://scot-api.hive-engine.com`
5. `HE_COMMENTS_RPC_URL`
   - Hive-Engine RPC URL for `comments` contract queries (required when `HE_REWARDS_SOURCE=comments`).
   - Example: `https://api.hive-engine.com/rpc`
6. `HE_CHAIN_MODE`
   - Optional chain selector for query params if needed (`hive` default).
7. `HE_REWARDS_TIMEOUT_MS`
   - Optional network timeout for sidechain calls.
8. `HE_REWARDS_DEBUG`
   - Optional debug logging toggle.
9. `HE_REWARDS_TEXT_COLOR`
   - Optional CSS color value for added token text.
   - Example: `#1d4ed8` or `blue`
   - Default: use the token UI default color.
10. `HE_REWARDS_LOGO_URL`
   - Optional logo URL/path for new token UI.
   - If set, replaces the default Hive logo in the added sidechain token section.
   - If not set, Hive logo remains default.
   - Example: `https://cdn.example.com/token-logo.svg`
11. `HE_REWARDS_LOGO_ALT`
   - Optional alt text for custom logo.
   - Default: `Token logo`

## Env Example Authoring Rule
1. Do not replace or rewrite existing keys in `.env.blog.example` or `.env.wallet.example`.
2. Add a new clearly labeled block for sidechain reward env keys.
3. Preserve current ordering/content outside the new appended block.

## Deliverables
- New/updated typed token model.
- Token fetch utility + query hooks.
- Feed and post page token UI.
- i18n keys + test IDs.
- Basic e2e coverage for the new token display.

## Tomorrow TODO Intake Plan (2026-03-06)

Source: `todo.md`

### A) Change Favicon To Env Logo
1. Add env-driven favicon override so browser tab icon uses the configured site logo.
2. Keep fallback behavior:
   - if sidechain config invalid/missing, or logo env empty, keep default Hive favicon.
3. Scope:
   - blog app metadata favicon
   - wallet app metadata favicon (same env behavior for consistency)

### B) Replace Remaining Red In Modals With Env Accent
1. Audit wallet/blog modal components for remaining hardcoded red classes/colors.
2. Apply additive class-based override only (`he-*` classes in global styles), no destructive rewrites.
3. Keep default fallback:
   - if sidechain accent env is not active, modal colors stay default.

### C) Show Delegation Total Under Staked Token
1. Extend sidechain wallet data model to include token delegation totals for viewed account.
2. Render delegation total directly under `Staked <TOKEN>` row (read-only text line).
3. Account-specific behavior:
   - data always reflects currently viewed wallet account, not logged-in account.

### D) Show Unstake Period Under Staked Token
1. Read token unstake settings from Hive-Engine token metadata/config.
2. Render unstake period text under `Staked <TOKEN>` row.
3. Fallback behavior:
   - if metadata does not expose unstake period, render safe placeholder (for example `N/A`) or hide line per confirmed UX.

### E) Transactions Must Show Delegations
1. Extend token transactions filter/list to include delegation operations.
2. Ensure both delegate and undelegate/related events appear in token transaction tab when present.
3. Keep existing token-history filtering additive and env-gated.

### F) Transaction Copy Must Be Complete
1. Improve token transaction descriptions to complete sentence form:
   - example: `X PIMP received from Y`
2. Make sender/receiver account (`Y`) bold and link to profile.
3. Apply same style/wording consistency across transfer/delegate/stake/unstake rows where applicable.

### Implementation Order
1. A (favicon) + B (modal accent sweep)
2. C + D (staked token details block)
3. E + F (history operation coverage + wording/format)
4. Validation + docs update (`HIVE_ENGINE_TOKEN_CHANGES.md`, `UNIT_TEST_RESULTS.md`)

### Acceptance Criteria
1. Favicon follows env logo when configured, and reverts to Hive default when env token/logo is invalid.
2. Modal red accents are fully covered by env accent without modifying existing component style contracts destructively.
3. `Staked <TOKEN>` section shows:
   - staked value
   - delegation total
   - unstake period
4. Token history tab includes delegation events and complete human-readable messages with bold counterparty account.
5. Global fallback rule still holds: removing/invalidating token env fully reverts site to default Hive behavior.

## TODO Implementation Progress (2026-03-06)

### A) Favicon from env
1. Implemented in both app root metadata layouts:
   - blog: env-driven favicon resolution with fallback to `/favicon.ico`
   - wallet: env-driven favicon resolution with fallback to `/favicon.ico`
2. Gated by valid sidechain token config so invalid/empty token keeps default Hive favicon.

### B) Modal red -> env accent
1. Added additive modal-scoped CSS overrides under `.he-accent-theme` for:
   - `bg-red-*`
   - `text-red-*`
   - `hover:text-red-*`
   - `hover:bg-red-*`
   - `shadow-red-*`
2. Updated wallet modal spinner color usages from hardcoded `#dc2626` to `hsl(var(--destructive))`.

### C) Delegation total under staked token
1. Added Hive-Engine delegation aggregation (`tokens.delegations`, `from=<account>`, `symbol=<token>`).
2. Added `delegationAmount` to sidechain wallet model.
3. Rendered `Delegation total: <amount> <TOKEN>` under staked token row.

### D) Unstake period under staked token
1. Added token contract metadata fetch (`tokens.tokens`) for:
   - `unstakingCooldown`
   - `numberTransactions`
2. Added wallet model fields:
   - `unstakeCooldownDays`
   - `unstakeTransactions`
3. Rendered `Unstake period: ...` under staked token row with safe `N/A` fallback.

### E) Transactions include delegations
1. Extended token transactions filter to include delegation operation names (`delegat` / `undeleg`).
2. Added delegation/undelegation sentence rendering in token history table.

### F) Complete transaction copy with bold counterparty
1. Updated token transaction messages to complete sentence style.
2. Counterparty account names now render as bold profile links.
3. Transfer copy now includes:
   - `<amount> <TOKEN> received from <bold account>`
   - `<amount> <TOKEN> sent to <bold account>`

### Follow-up Progress (2026-03-06, UX consistency pass)
1. Token history quantity display is now normalized for consistent decimals across rows:
   - trims trailing zero decimals
   - keeps meaningful fractional precision
   - preserves readable numeric formatting
2. `received` history rows now include sender when available:
   - `<amount> <TOKEN> received from <bold account-link>`
3. Staked-token section now shows unstake payout schedule detail:
   - total amount to be unstaked (current staked balance basis)
   - per-payment amount
   - interval and payment count.
4. Distribution contract sender labeling updated:
   - `contract_distribution` now renders as plain text `PIMP rewards distribution`
   - label is non-clickable by design.
