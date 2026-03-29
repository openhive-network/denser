import PostContent from './content';
import { getPostCached } from '@/blog/lib/cached-api';
import { getCommunity, getDiscussion, getFollowList } from '@transaction/lib/bridge-api';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { isUsernameValid, isPermlinkValid, isValidUserParam } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';
import { isCommunity } from '@ui/lib/utils';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';
import {
  ObserverProvider,
  InitialPostDataProvider,
  InitialDiscussionProvider,
  InitialCommunityProvider,
  InitialFollowListProvider
} from '@/blog/components/observer-provider';

const logger = getLogger('app');

const PostPage = async ({
  params: { param, p2, permlink },
  searchParams
}: {
  params: { param: string; p2: string; permlink: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) => {
  if (!isValidUserParam(p2)) notFound();

  const username = p2.replace('%40', '').replace('@', '');
  const community = param;
  const validUser = await isUsernameValid(username);
  if (!validUser) notFound();
  if (!isPermlinkValid(permlink)) notFound();

  const observer = await getObserverFromCookies();

  const isLoggedIn = observer !== DEFAULT_OBSERVER;

  let postData = null;
  let discussionData = null;
  let communityData = null;
  let mutedListData = null;

  try {
    // Fetch post, discussion, and optionally community in parallel.
    // ActiveVotes and rolesList are secondary — fetched client-side only.
    const [postResult, discussionResult, mutedListResult, communityResult] = await Promise.allSettled([
      // Use cached version — deduplicated with layout's generateMetadata within the same request
      getPostCached(username, permlink, observer),
      getDiscussion(username, permlink, observer),
      // Prefetch the user's muted list so comments are filtered from the first render
      isLoggedIn ? getFollowList(observer, 'muted') : Promise.resolve(null),
      isCommunity(community) ? getCommunity(community, observer) : Promise.resolve(null)
    ]);

    postData = postResult.status === 'fulfilled' ? (postResult.value ?? null) : null;
    if (postResult.status === 'rejected') {
      logger.error(postResult.reason, 'Error fetching post data:');
    }

    discussionData = discussionResult.status === 'fulfilled' ? (discussionResult.value ?? null) : null;
    if (discussionResult.status === 'rejected') {
      logger.error(discussionResult.reason, 'Error fetching discussion data:');
    }
    if (isLoggedIn) {
      mutedListData = mutedListResult.status === 'fulfilled' ? (mutedListResult.value ?? null) : null;
      if (mutedListResult.status === 'rejected') {
        logger.error(mutedListResult.reason, 'Error fetching muted list:');
      }
    }

    if (isCommunity(community)) {
      communityData = communityResult.status === 'fulfilled' ? (communityResult.value ?? null) : null;
      if (communityResult.status === 'rejected') {
        logger.error(communityResult.reason, 'Error fetching community data:');
      }
    }
  } catch (error) {
    logger.error(error, 'Error in PostPage:');
  }

  // Skip 404 when navigating from post creation — the client has optimistic data
  // in React Query cache that will render while Hivemind indexes the post.
  if (!postData && !searchParams?.pending) notFound();

  // Pass data directly via context instead of Hydrate/dehydrate.
  // React Query v4's <Hydrate> has compatibility issues with Next.js App Router
  // streaming SSR where dehydrated state doesn't reliably reach the browser
  // query client, causing unnecessary client-side refetches and spinners.
  return (
    <ObserverProvider value={observer}>
      <InitialPostDataProvider value={postData}>
        <InitialDiscussionProvider value={discussionData}>
          <InitialCommunityProvider value={communityData}>
            <InitialFollowListProvider value={mutedListData}>
              <PostContent />
            </InitialFollowListProvider>
          </InitialCommunityProvider>
        </InitialDiscussionProvider>
      </InitialPostDataProvider>
    </ObserverProvider>
  );
};
export default PostPage;
