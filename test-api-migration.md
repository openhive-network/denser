# Hivesense API Migration Summary

## Changes Implemented

### 1. TypeScript Type Definitions (`packages/transaction/lib/extended-hive.chain.ts`)
- Added new parameter interfaces: `PostsSearchParams`, `PostsSimilarParams`, `PostsByIdsParams`
- Added `PostStub` type for posts with only author/permlink
- Added `MixedPostsResponse` type for mixed full/stub responses
- Updated `ExtendedRestApi` type with new endpoints while keeping legacy ones for backward compatibility

### 2. API Client Functions (`apps/blog/lib/get-data.tsx`)
- Created `searchPosts()` - replaces `getSimilarPosts()` using `/posts/search`
- Created `getSimilarPostsByPost()` - replaces `getSuggestions()` using `/posts/{author}/{permlink}/similar`
- Created `getPostsByIds()` - new function for fetching full post data by IDs
- Added `isPostStub()` helper to identify stub entries
- Kept legacy functions for backward compatibility

### 3. React Components

#### AIResult Component (`apps/blog/feature/search/ai-result.tsx`)
- Complete rewrite for new paging model
- Single initial API call fetches all results (up to 1000)
- Client-side state management for stubs and pagination
- Uses `getPostsByIds()` to fetch additional pages on demand
- Removed `useInfiniteQuery` in favor of simple `useQuery` + state management

#### Post Page Suggestions (`apps/blog/pages/[param]/[p2]/[permlink]/index.tsx`)
- Updated to use `getSimilarPostsByPost()` instead of `getSuggestions()`
- Filters results to only include full posts (no stubs for suggestions)
- Maintains backward compatibility with existing `SuggestionsList` component

### 4. Infrastructure (`hivesense/rewrite_rules.conf`)
- Added rewrite rule for `/posts/by-ids` endpoint

## New Paging Model

### Old Model:
```
1. Initial request: /similarposts?limit=20
2. Next page: /similarposts?limit=20&start_author=X&start_permlink=Y
3. Repeat for each page
```

### New Model:
```
1. Single request: /posts/search?result_limit=1000&full_posts=20
   - Returns first 20 posts fully expanded
   - Returns remaining 980 as stubs (author/permlink only)
2. Client stores stubs locally
3. On scroll: /posts/by-ids with next batch of stubs
   - Max 50 posts per request
```

## Benefits
- Reduced server calls (1 initial + batch fetches vs many sequential calls)
- Better performance for users (all results known upfront)
- Simpler state management (no complex pagination tracking)
- More predictable behavior (total result count known immediately)

## Migration Notes
- Legacy endpoints still work (backward compatibility)
- New functions coexist with old ones
- Can migrate components incrementally
- No breaking changes to existing code