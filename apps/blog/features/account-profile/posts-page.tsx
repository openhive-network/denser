import { getAccountPosts } from '@transaction/lib/bridge-api';
import { ReactNode } from 'react';
import { QueryTypes } from './lib/utils';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getLogger } from '@ui/lib/logging';
import { ObserverProvider, InitialPostsProvider } from '@/blog/components/observer-provider';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';

const logger = getLogger('app');

const PostsPage = async ({
  children,
  param,
  query
}: {
  children: ReactNode;
  param: string;
  query: QueryTypes;
}) => {
  const username = extractUsernameFromParam(param) ?? param;
  const observer = await getObserverFromCookies();
  let initialPosts = null;
  try {
    initialPosts = (await getAccountPosts(query, username, observer, '', '')) ?? null;
  } catch (error) {
    logger.error(error, 'Error in PostsPage:');
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
export default PostsPage;
