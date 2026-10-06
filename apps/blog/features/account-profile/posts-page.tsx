import { getAccountPosts } from '@transaction/lib/bridge-api';
import { ReactNode } from 'react';
import { QueryTypes } from './lib/utils';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getLogger } from '@ui/lib/logging';
import { ObserverProvider, InitialPostsProvider } from '@/blog/components/observer-provider';
import { keepObserverVotes } from '@/blog/lib/feed-entries';
import { toCardEntries } from '@/blog/features/list-of-posts/lib/to-card-entries';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';
import FirstCardImagePreload from '@/blog/features/list-of-posts/first-card-image-preload';
import userIllegalContent from '@ui/config/lists/user-illegal-content';

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
    const posts = await getAccountPosts(query, username, observer, '', '');
    initialPosts = posts ? toCardEntries(keepObserverVotes(posts, observer)) : null;
  } catch (error) {
    logger.error(error, 'Error in PostsPage:');
  }
  // Pass data directly via context instead of Hydrate/dehydrate.
  // React Query v4's <Hydrate> has compatibility issues with Next.js App Router
  // streaming SSR where dehydrated state doesn't reliably reach the browser
  // query client, causing unnecessary client-side refetches.
  return (
    <ObserverProvider value={observer}>
      {/* PostsContent renders no feed for legally blocked users, so there is no card image to preload. */}
      <FirstCardImagePreload entries={userIllegalContent.includes(username) ? null : initialPosts} />
      <InitialPostsProvider value={initialPosts}>{children}</InitialPostsProvider>
    </ObserverProvider>
  );
};
export default PostsPage;
