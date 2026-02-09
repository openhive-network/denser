'use client';

import { createContext, useContext, ReactNode } from 'react';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';
import type { Entry, Community, IFollowList } from '@hive/common-hiveio-packages/wax';

const ObserverContext = createContext<string>(DEFAULT_OBSERVER);

/**
 * Provides the SSR-resolved observer value to client components.
 * This ensures client-side query keys match SSR-prefetched cache keys,
 * preventing unnecessary refetches and skeleton flashes after hydration.
 */
export const ObserverProvider = ({ value, children }: { value: string; children: ReactNode }) => (
  <ObserverContext.Provider value={value}>{children}</ObserverContext.Provider>
);

/**
 * Returns the observer value that was used during SSR prefetching.
 * Use this as the initial observer for query keys to match SSR cache.
 */
export const useSSRObserver = () => useContext(ObserverContext);

const InitialPostsContext = createContext<Entry[] | null>(null);

/**
 * Provides server-fetched post data directly to client components.
 * This bypasses React Query's Hydrate/dehydrate mechanism which has
 * compatibility issues with Next.js App Router streaming SSR in v4.
 * Client components use this as initialData for useInfiniteQuery.
 */
export const InitialPostsProvider = ({ value, children }: { value: Entry[] | null; children: ReactNode }) => (
  <InitialPostsContext.Provider value={value}>{children}</InitialPostsContext.Provider>
);

export const useInitialPosts = () => useContext(InitialPostsContext);

const InitialCommunitiesContext = createContext<Community[] | null>(null);

/**
 * Provides server-fetched communities list to client components.
 * Used by the sidebar and mobile dropdown to display trending communities
 * without a client-side refetch after hydration.
 */
export const InitialCommunitiesProvider = ({
  value,
  children
}: {
  value: Community[] | null;
  children: ReactNode;
}) => <InitialCommunitiesContext.Provider value={value}>{children}</InitialCommunitiesContext.Provider>;

export const useInitialCommunities = () => useContext(InitialCommunitiesContext);

const InitialCommunityContext = createContext<Community | null>(null);

/**
 * Provides server-fetched single community data to client components.
 * Used by community tag page layouts to pass getCommunity() data
 * without relying on Hydrate/dehydrate.
 */
export const InitialCommunityProvider = ({
  value,
  children
}: {
  value: Community | null;
  children: ReactNode;
}) => <InitialCommunityContext.Provider value={value}>{children}</InitialCommunityContext.Provider>;

export const useInitialCommunity = () => useContext(InitialCommunityContext);

const InitialSubscriptionsContext = createContext<string[][] | null>(null);

/**
 * Provides server-fetched subscriptions to client components.
 * Used by the sidebar to show the user's subscribed communities
 * without a layout shift from trending → subscribed on hydration.
 */
export const InitialSubscriptionsProvider = ({
  value,
  children
}: {
  value: string[][] | null;
  children: ReactNode;
}) => <InitialSubscriptionsContext.Provider value={value}>{children}</InitialSubscriptionsContext.Provider>;

export const useInitialSubscriptions = () => useContext(InitialSubscriptionsContext);

const InitialPostDataContext = createContext<Entry | null>(null);

/**
 * Provides server-fetched single post data to client components.
 * Used by the post detail page to pass getPost() data
 * without relying on Hydrate/dehydrate.
 */
export const InitialPostDataProvider = ({
  value,
  children
}: {
  value: Entry | null;
  children: ReactNode;
}) => <InitialPostDataContext.Provider value={value}>{children}</InitialPostDataContext.Provider>;

export const useInitialPostData = () => useContext(InitialPostDataContext);

const InitialDiscussionContext = createContext<Record<string, Entry> | null>(null);

/**
 * Provides server-fetched discussion (comments) data to client components.
 * Used by the post detail page to pass getDiscussion() data
 * without relying on Hydrate/dehydrate.
 */
export const InitialDiscussionProvider = ({
  value,
  children
}: {
  value: Record<string, Entry> | null;
  children: ReactNode;
}) => <InitialDiscussionContext.Provider value={value}>{children}</InitialDiscussionContext.Provider>;

export const useInitialDiscussion = () => useContext(InitialDiscussionContext);

const InitialFollowListContext = createContext<IFollowList[] | null>(null);

/**
 * Provides server-fetched follow list data to client components.
 * Used by the lists pages (blacklisted, muted, follow_blacklist, follow_muted)
 * without relying on Hydrate/dehydrate which overwrites optimistic updates.
 */
export const InitialFollowListProvider = ({
  value,
  children
}: {
  value: IFollowList[] | null;
  children: ReactNode;
}) => <InitialFollowListContext.Provider value={value}>{children}</InitialFollowListContext.Provider>;

export const useInitialFollowList = () => useContext(InitialFollowListContext);
