# Denser Blog - Architecture Notes

## Overview

Denser is a blogging application for the Hive blockchain, built with Next.js 16 App Router, React 19, TypeScript, and TanStack React Query.

---

## 1. Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS, Radix UI, shadcn/ui pattern |
| Server State | TanStack React Query 4.x |
| Client State | Zustand |
| Blockchain | @hiveio/wax (Hive SDK) |
| i18n | i18next + next-i18next |
| Forms | React Hook Form + Zod |
| Testing | Playwright |

---

## 2. Monorepo Structure

```
denser/
├── apps/
│   └── blog/              # Main blog application
├── packages/
│   ├── @hive/ui           # Shared UI components
│   ├── @hive/transaction  # Blockchain transaction handling
│   ├── @hive/smart-signer # Multi-method signing (Keychain, HiveAuth)
│   ├── @hive/renderer     # Content rendering
│   ├── @hive/middleware   # Shared Next.js middleware
│   └── ...config packages
```

---

## 3. Routing Structure (Next.js App Router)

### Route Groups

| Route Group | URL Pattern | Purpose |
|-------------|-------------|---------|
| `(main-and-community)/` | /trending, /hot, /created, /payout | Main feeds |
| `[param]/(user-profile)/` | /@username/* | User profiles |
| `[param]/[p2]/[permlink]/` | /community/@author/post-slug | Single posts |

### Key Routes

```
/                    → redirects to /trending (via proxy)
/trending            → Trending posts feed
/hot                 → Hot posts feed
/created             → New posts feed
/@username           → User profile
/@username/posts     → User's blog posts
/@username/settings  → Account settings
/communities         → Communities listing
/search              → Search page
```

---

## 4. SSR/CSR Hybrid Pattern

### Server-Side (React Server Components)

- Layout and Page components are async by default
- Data prefetched via React Query's `prefetchQuery()`
- State dehydrated with `dehydrate(queryClient)`
- Passed to client via `<Hydrate state={...}>` wrapper

### Client-Side (`'use client'`)

- Interactive components (MainBar, VoteButton, dialogs)
- Mutations and real-time updates
- Theme switching, modals

### Hydration Pattern

```typescript
// In layout.tsx or page.tsx (server)
const queryClient = getQueryClient();
await queryClient.prefetchQuery({...});

return (
  <Hydrate state={dehydrate(queryClient)}>
    {children}
  </Hydrate>
);
```

---

## 5. Data Fetching

### Request-Level Caching (`lib/cached-api.ts`)

Uses React's `cache()` function to deduplicate API calls within a single request:

```typescript
import { cache } from 'react';

export const getAccountFullCached = cache(async (username: string) => {
  return getAccountFull(username);
});

export const getPostCached = cache(async (author: string, permlink: string) => {
  return getPost(author, permlink);
});
```

**Purpose**: Prevents duplicate API calls when both `generateMetadata()` and page component need the same data.

### Anonymous Feed Cache (`lib/feed-cache.ts`)

The first page of a ranked feed (trending/hot/created/payout/muted, tag and community feeds) is cached in the server process for requests without an observer (`DEFAULT_OBSERVER`); requests with one always fetch, so a viewer's votes and mutes are never shared or stale. Stale-while-revalidate, bounded in memory, keyed by sort, tag, cursor, limit and the chain id + API node, so mainnet and mirrornet never share entries (`packages/transaction/lib/feed-cache.ts`).

| Env | Default | Meaning |
|-----|---------|---------|
| `DENSER_FEED_CACHE_TTL_S` | 30 | Seconds a feed is served without fetching; `0` turns the cache off |
| `DENSER_FEED_CACHE_STALE_S` | 30 | Seconds past the TTL it is still served while reloaded in the background |
| `DENSER_FEED_CACHE_MAX_MB` | 32 | Memory cap; least recently used feeds are dropped first |

A failed fetch is never stored. While a background reload fails the stale feed keeps being served (logged as a warning); past the stale window a failed fetch answers 503 as before. Only the data is cached: pages stay `private, no-store`. The cache is per process, so every server replica keeps its own.

### React Query Configuration (`lib/react-query.ts`)

- **Server**: Creates new QueryClient per request (SSR-safe)
- **Browser**: Maintains singleton QueryClient instance
- **Default staleTime**: 60 seconds

### Hive API Layer (`packages/transaction/lib/`)

**Bridge API** (`bridge-api.ts`):
- `getPostsRanked()` - Feed posts (trending, hot, created)
- `getPost()` - Single post
- `getAccountPosts()` - User's posts
- `getDiscussion()` - Post comments
- `getCommunities()` - Community list

**Hive API** (`hive-api.ts`):
- `getAccounts()`, `getAccountFull()` - Account data
- `getFollowers()`, `getFollowing()` - Social graph
- `getActiveVotes()` - Vote data
- `getManabars()` - Voting power, RC

**Chain Service** (`chain.ts`):
- `getReadChain()`: wasm-free client (`read-client.ts`) for read-only calls — `chain.api` JSON-RPC
  and the `ExtendedRestApi` REST APIs (hivesense). Same call shape, endpoints and requests as wax
  (`wax-equivalence.test.ts`); `bridge-api.ts`, `hive-api.ts`, `hivesense-api.ts` read through it,
  so an anonymous reader never downloads `wax.common.wasm`.
- `getChain()`: singleton wrapper around WAX (Hive SDK), only for signing, broadcasting, login and
  wasm-only computation; created on first use, and warmed up on idle for logged-in users only
  (`components/chain-warmup.tsx`)
- On the server both are wrapped by `server-failover.ts`: a read-only JSON-RPC call that fails at the
  transport level is retried once on the primary node, then on the other nodes of
  `REACT_APP_ALLOWED_HIVE_API_NODES` (images host excluded), within an 8 s budget per call

**Primary data unreachable → HTTP 503** (`apps/blog/lib/service-unavailable.ts`):
- A server component that cannot render without its data throws `ServiceUnavailableError` when the
  fetch still fails with a transport error (feeds: `features/*/sort-page.tsx`; post page). The route's
  `error.tsx` shows the "temporarily unavailable" UI with a retry.
- `instrumentation.ts` turns that render's 500 into `503` + `Retry-After` (App Router has no API for a
  503). It only works for routes that have not started streaming when the page throws, i.e. without a
  `loading.tsx` above the page; a streamed route keeps its 200.
- Never swallow such a failure into a 200 with a loading skeleton: crawlers index it as empty.

---

## 6. State Management

### Zustand Store (`store/app.ts`)

Intentionally minimal - only essential client state:

```typescript
interface AppState {
  currentProfile: FullAccount | null;       // Logged-in user
  currentProfileKeyType: KeyType | null;    // Key type for signing
  lastReadNotificationDate: number;         // Notification tracking
}
```

**All server data is managed by React Query, not Zustand.**

### React Query

- Caching and automatic invalidation
- Pagination with infinite queries
- Optimistic updates for mutations

---

## 7. Providers Hierarchy (`features/layouts/providers.tsx`)

```
QueryClientProvider (React Query)
  └── ThemeProvider (next-themes)
      └── SignerProvider (@smart-signer)
          └── LoggedUserProvider (vote context)
              └── ModalContainer + Toaster
                  └── {children}
```

---

## 8. Authentication Flow

### 1. Login Dialog (`components/dialog-login.tsx`)

- Uses `@smart-signer/components/auth/form`
- Prefers posting keys: `preferredKeyTypes={[KeyType.posting]}`
- Supports multiple auth methods: Keychain, HiveAuth, etc.

### 2. Server-side (`lib/auth-utils.ts`)

```typescript
export function getObserverFromCookies(): string {
  // Extracts username from AUTH_PROOF_COOKIE_NAME
  // Returns username or DEFAULT_OBSERVER
}
```

### 3. Client-side

```typescript
import { useUserClient } from '@smart-signer/hooks';

const { user } = useUserClient();
```

---

## 9. Transaction Service

All blockchain operations use centralized service from `@transaction/index`:

```typescript
import { transactionService } from '@transaction/index';

// Voting
await transactionService.upVote(author, permlink, weight, { observe: true });
await transactionService.downVote(author, permlink, weight, { observe: true });

// Social
await transactionService.follow(username, { observe: true });
await transactionService.mute(username, { observe: true });

// Content
await transactionService.comment(parentAuthor, parentPermlink, body, {...});
```

---

## 10. Mutation Pattern

Standard pattern with staggered cache invalidation:

```typescript
const mutation = useMutation({
  mutationFn: async (params) => {
    return transactionService.someAction(params, { observe: true });
  },
  onSuccess: () => {
    // Immediate feedback to user
    toast.success('Action completed');

    // Staggered invalidation for smooth UX
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['primaryData'] });
    }, 3000);
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['secondaryData'] });
    }, 6000);
  }
});
```

---

## 11. Request Flow Example

```
User navigates to /@username/post-slug

1. Middleware
   └── Check redirects, CSP headers

2. Layout (server)
   ├── generateMetadata() → getPostCached()
   ├── prefetchQuery() for post, comments, votes
   └── dehydrate() → <Hydrate>

3. Page (server)
   ├── Validate params (username, permlink)
   ├── Same prefetch (deduplicated by cache())
   └── Return PostContent component

4. Browser
   ├── Receive HTML with dehydrated cache
   ├── React hydrates with cached data
   └── Client components become interactive

5. User interaction
   ├── Mutation (vote, comment) via transactionService
   └── Optimistic update → staggered invalidation
```

---

## 12. Feature Modules (`apps/blog/features/`)

| Feature | Purpose |
|---------|---------|
| `post-rendering/` | Display posts and comments |
| `post-editor/` | Create/edit posts |
| `list-of-posts/` | Post feeds and listing |
| `votes/` | Voting functionality |
| `mute-follow/` | Follow/unfollow/mute actions |
| `account-profile/` | User profile views |
| `account-settings/` | User settings |
| `account-social/` | Follow lists, badges |
| `account-lists/` | Followers/following lists |
| `activity-log/` | Notifications |
| `community-profile/` | Community pages |
| `communities-list/` | Communities browser |
| `search/` | Search functionality |
| `layouts/` | Layout components, providers |

---

## 13. Key Files Reference

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout, Providers wrapper, metadata |
| `proxy.ts` | Root redirect (/ → /trending), CSP |
| `lib/react-query.ts` | QueryClient factory for SSR/CSR |
| `lib/cached-api.ts` | Request-level API deduplication |
| `lib/feed-cache.ts` | Server-side cache of anonymous feed data |
| `lib/auth-utils.ts` | Server-side auth helpers |
| `store/app.ts` | Minimal Zustand store |
| `features/layouts/providers.tsx` | Client provider hierarchy |
| `features/layouts/site-header/main-bar.tsx` | Header/navigation |
| `components/dialog-login.tsx` | Login modal |

---

## 14. Environment Configuration

Key environment variables (see `.env.blog.example`):

```bash
# API Endpoints
HIVE_BLOG_API_ENDPOINT=https://api.hive.blog

# Feature Flags
NEXT_PUBLIC_STRICT_MODE=false

# Authentication
NEXT_PUBLIC_BACKEND_AUTHENTICATION=false
```

---

## 15. Performance Optimizations

- **Prefetching**: Dual triggers (1500px scroll + button)
- **Deduplication**: React `cache()` wrapper on API calls
- **Memoization**: `useMemo`, `useCallback` where needed
- **Lazy loading**: Dynamic imports
- **PWA**: next-pwa support

---

## Summary

Denser blog is a well-organized Next.js 16 application with:

- Feature-driven architecture (16 feature modules)
- SSR with React Query hydration pattern
- Minimal Zustand store (only session state)
- Direct Hive blockchain integration
- Strong TypeScript typing throughout
- Centralized transaction service for all blockchain ops
- Playwright for UI interactions and testing
