# Area Mapping Reference

This document maps file paths to test areas and provides context for generating test cases.

## Blog Application (`apps/blog/`)

### Core Pages

| Path Pattern | Area | Priority | Test Focus |
|--------------|------|----------|------------|
| `app/page.tsx` | Homepage | P0 | Post list loads, sorting works |
| `app/(main-and-community)/trending/**` | Trending | P1 | Trending posts display |
| `app/(main-and-community)/hot/**` | Hot | P1 | Hot posts display |
| `app/(main-and-community)/created/**` | New Posts | P1 | New posts display |
| `app/[param]/**` | Dynamic routes | P1 | User/community pages |
| `app/communities/**` | Communities | P2 | Community listing |
| `app/search/**` | Search | P2 | Search functionality |
| `app/api/**` | API Routes | P0 | Server-side APIs |

### Features

| Path Pattern | Area | Priority | Test Focus |
|--------------|------|----------|------------|
| `features/post-rendering/**` | Post Display | P1 | Post content, comments, votes |
| `features/post-editor/**` | Post Editor | P0 | Creating/editing posts |
| `features/list-of-posts/**` | Post Lists | P1 | Feed display, pagination |
| `features/layouts/**` | Layouts | P2 | Page structure, navigation |
| `features/account-profile/**` | User Profile | P1 | Profile data, stats |
| `features/account-settings/**` | Settings | P2 | User preferences |
| `features/account-social/**` | Social | P2 | Follow, badges |
| `features/votes/**` | Voting | P0 | Upvote, downvote |
| `features/mute-follow/**` | Mute/Follow | P2 | User interactions |
| `features/community-profile/**` | Community | P2 | Community pages |
| `features/search/**` | Search | P2 | Search feature |

### Components & Hooks

| Path Pattern | Area | Priority | Test Focus |
|--------------|------|----------|------------|
| `components/dialog-login.tsx` | Authentication | P0 | Login flow |
| `components/hooks/**` | Custom Hooks | P1 | State management |
| `lib/utils.ts` | Utilities | P0 | Calculations, helpers |
| `lib/auth-utils.ts` | Auth Utils | P0 | Authentication |
| `lib/cached-api.ts` | API Caching | P1 | Data fetching |

### Store

| Path Pattern | Area | Priority | Test Focus |
|--------------|------|----------|------------|
| `store/app.ts` | App State | P1 | Global state |
| `store/app-types.ts` | Types | P3 | Type definitions |

## Wallet Application (`apps/wallet/`)

| Path Pattern | Area | Priority | Test Focus |
|--------------|------|----------|------------|
| `pages/[param]/transfers.tsx` | Transfers | P0 | Balance display, transfers |
| `pages/[param]/author-rewards.tsx` | Author Rewards | P1 | Reward calculations |
| `pages/[param]/curation-rewards.tsx` | Curation Rewards | P1 | Curation calculations |
| `pages/[param]/delegations.tsx` | Delegations | P1 | Delegation management |
| `pages/[param]/communities.tsx` | Communities | P2 | Community management |

## Shared Packages

### UI Package (`packages/ui/`)

| Path Pattern | Area | Priority | Test Focus |
|--------------|------|----------|------------|
| `components/**` | UI Components | P2 | Visual rendering |
| `lib/utils.ts` | UI Utils | P0 | Calculations (HP, reputation) |
| `lib/helpers.ts` | Helpers | P1 | Data conversion |
| `lib/reputation.ts` | Reputation | P1 | Reputation calculation |
| `lib/asset-constants.ts` | Constants | P1 | Token definitions |
| `lib/storage-with-ttl.ts` | Storage | P2 | Local storage |
| `hooks/**` | UI Hooks | P2 | Shared hooks |

### Transaction Package (`packages/transaction/`)

| Path Pattern | Area | Priority | Test Focus |
|--------------|------|----------|------------|
| `lib/hive-api.ts` | Hive API | P0 | Blockchain API calls |
| `lib/bridge-api.ts` | Bridge API | P0 | Hive bridge calls |
| `lib/hive-chain-service.ts` | Chain Service | P0 | Wax chain instance |
| `lib/utils.ts` | Transaction Utils | P0 | Transaction helpers |

### Smart Signer (`packages/smart-signer/`)

| Path Pattern | Area | Priority | Test Focus |
|--------------|------|----------|------------|
| `lib/auth/**` | Authentication | P0 | Login methods |
| `lib/signer/**` | Signing | P0 | Transaction signing |

## Test Files

| Path Pattern | Area | Priority | Test Focus |
|--------------|------|----------|------------|
| `**/*.spec.ts` | E2E Tests | P3 | Test code changes |
| `**/*.test.ts` | Unit Tests | P3 | Test code changes |
| `playwright/**` | Playwright | P3 | E2E test infrastructure |

## Configuration Files

| Path Pattern | Area | Priority | Test Focus |
|--------------|------|----------|------------|
| `next.config.js` | Next.js Config | P1 | Build, routing |
| `tailwind.config.js` | Tailwind | P3 | Styling |
| `package.json` | Dependencies | P2 | New dependencies |
| `tsconfig.json` | TypeScript | P3 | Type checking |

## Localization

| Path Pattern | Area | Priority | Test Focus |
|--------------|------|----------|------------|
| `locales/**` | i18n | P3 | Translation strings |
| `i18n/**` | i18n Config | P3 | Language setup |

---

## Function-to-Area Mapping

### Critical Functions (P0)

| Function | Package | Test Areas |
|----------|---------|------------|
| `convertToHP()` | `@hive/ui` | Profile HP, Wallet HP, Popover HP |
| `powerdownHive()` | `@hive/ui` | Wallet powerdown display |
| `accountReputation()` | `@hive/ui` | Profile reputation, Post cards, Popovers |
| `parseAsset()` | `@hive/ui` | All asset displays |
| `getAccountFull()` | `@hive/transaction` | Profile data |
| `getDynamicGlobalProperties()` | `@hive/transaction` | HP calculations |

### Important Functions (P1)

| Function | Package | Test Areas |
|----------|---------|------------|
| `convertStringToBig()` | `@hive/ui` | All number conversions |
| `formatNaiAsset()` | `@hive/ui` | Asset formatting |
| `numberWithCommas()` | `@hive/ui` | Number display |
| `getRoundedAbbreveration()` | `@hive/ui` | Large number display |

---

## Change Impact Matrix

When a file changes, these are the potential impact areas:

### `packages/ui/lib/utils.ts`
- Blog: Profile page, Post cards, User popovers
- Wallet: Transfers, Rewards pages
- Impact: HP calculations, asset parsing

### `packages/ui/lib/reputation.ts`
- Blog: Profile page, Post cards, User popovers
- Impact: Reputation display everywhere

### `packages/transaction/lib/hive-api.ts`
- Blog: All pages using account data
- Wallet: All pages
- Impact: Data fetching, may cause loading issues

### `apps/blog/features/layouts/user-profile/profile-layout.tsx`
- Blog: All profile sub-pages
- Impact: Profile header, stats display

### `apps/blog/features/post-rendering/**`
- Blog: Post pages, Comment sections
- Impact: Content display, interactions

---

## Smoke Test Mapping

When changes affect these areas, run corresponding smoke tests:

| Changed Area | Smoke Tests to Run |
|--------------|-------------------|
| Homepage/feeds | SMOKE-01, SMOKE-11 |
| Post navigation | SMOKE-04 |
| Votes | SMOKE-02, SMOKE-05 |
| Payout | SMOKE-03, SMOKE-07 |
| Comments | SMOKE-06 |
| User profile | SMOKE-08, SMOKE-09 |
| Tags | SMOKE-10 |
| Communities | SMOKE-12 |
| Static pages | SMOKE-13 |
| Theme | SMOKE-14 |
| Login | SMOKE-15 |
