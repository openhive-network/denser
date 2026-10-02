import { SortTypes } from '@/blog/lib/utils';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { isTransportError } from '@transaction/lib/wax-errors';
import { ServiceUnavailableError } from '@/blog/lib/service-unavailable';
import { ReactNode } from 'react';
import { getLogger } from '@ui/lib/logging';
import { ObserverProvider, InitialPostsProvider } from '@/blog/components/observer-provider';
import { getFeedFirstPage } from '@/blog/lib/feed-cache';
import FirstCardImagePreload from '@/blog/features/list-of-posts/first-card-image-preload';

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
    initialPosts = await getFeedFirstPage(sort, tag, observer);
  } catch (error) {
    logger.error(error, 'Error in SortPage:');
    // The server-side chain already retried and failed over: answer 503, not a 200 whose
    // feed is only the client-fetch skeleton.
    if (isTransportError(error)) throw new ServiceUnavailableError(error);
  }
  // Pass data directly via context instead of Hydrate/dehydrate.
  // React Query v4's <Hydrate> has compatibility issues with Next.js App Router
  // streaming SSR where dehydrated state doesn't reliably reach the browser
  // query client, causing unnecessary client-side refetches.
  return (
    <ObserverProvider value={observer}>
      <FirstCardImagePreload entries={initialPosts} />
      <InitialPostsProvider value={initialPosts}>{children}</InitialPostsProvider>
    </ObserverProvider>
  );
};

export default SortPage;
