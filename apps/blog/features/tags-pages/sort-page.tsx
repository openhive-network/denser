import { SortTypes } from '@/blog/lib/utils';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getPostsRanked } from '@transaction/lib/bridge-api';
import { ReactNode } from 'react';
import { getLogger } from '@ui/lib/logging';
import { ObserverProvider, InitialPostsProvider } from '@/blog/components/observer-provider';

const logger = getLogger('app');

const SortPage = async ({
  children,
  sort,
  tag = ''
}: {
  children: ReactNode;
  sort: SortTypes;
  tag?: string;
}) => {
  // Get observer from cookies - returns user's observer if logged in, DEFAULT_OBSERVER for anonymous
  // Community data (getCommunity) is already prefetched in the layout's PrefetchComponent
  const observer = await getObserverFromCookies();
  let initialPosts = null;
  try {
    initialPosts = (await getPostsRanked(sort, tag, '', '', observer)) ?? null;
  } catch (error) {
    logger.error(error, 'Error in SortPage:');
  }
  // Pass data directly via context instead of Hydrate/dehydrate.
  // React Query v4's <Hydrate> has compatibility issues with Next.js App Router
  // streaming SSR where dehydrated state doesn't reliably reach the browser
  // query client, causing unnecessary client-side refetches.
  return (
    <ObserverProvider value={observer}>
      <InitialPostsProvider value={initialPosts}>{children}</InitialPostsProvider>
    </ObserverProvider>
  );
};

export default SortPage;
