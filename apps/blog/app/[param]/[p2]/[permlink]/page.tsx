import PostContent from './content';
import { getPostCached } from '@/blog/lib/cached-api';
import { getCommunity, getDiscussion } from '@transaction/lib/bridge-api';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { isUsernameValid, isPermlinkValid, isValidUserParam } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';
import { isCommunity } from '@ui/lib/utils';
import {
  ObserverProvider,
  InitialPostDataProvider,
  InitialDiscussionProvider,
  InitialCommunityProvider
} from '@/blog/components/observer-provider';

const logger = getLogger('app');

const PostPage = async ({
  params: { param, p2, permlink }
}: {
  params: { param: string; p2: string; permlink: string };
}) => {
  if (!isValidUserParam(p2)) notFound();

  const username = p2.replace('%40', '').replace('@', '');
  const community = param;
  const validUser = await isUsernameValid(username);
  if (!validUser) notFound();
  if (!isPermlinkValid(permlink)) notFound();

  const observer = await getObserverFromCookies();

  let postData = null;
  let discussionData = null;
  let communityData = null;

  try {
    // Fetch post, discussion, and optionally community in parallel.
    // ActiveVotes and rolesList are secondary — fetched client-side only.
    const results = await Promise.allSettled([
      // Use cached version — deduplicated with layout's generateMetadata within the same request
      getPostCached(username, permlink, observer),
      getDiscussion(username, permlink, observer),
      ...(isCommunity(community) ? [getCommunity(community, observer)] : [])
    ]);

    postData = results[0].status === 'fulfilled' ? (results[0].value ?? null) : null;
    if (results[0].status === 'rejected') {
      logger.error(results[0].reason, 'Error fetching post data:');
    }

    discussionData = results[1].status === 'fulfilled' ? (results[1].value ?? null) : null;
    if (results[1].status === 'rejected') {
      logger.error(results[1].reason, 'Error fetching discussion data:');
    }

    if (isCommunity(community) && results[2]) {
      communityData = results[2].status === 'fulfilled' ? (results[2].value ?? null) : null;
      if (results[2].status === 'rejected') {
        logger.error(results[2].reason, 'Error fetching community data:');
      }
    }
  } catch (error) {
    logger.error(error, 'Error in PostPage:');
  }

  // Pass data directly via context instead of Hydrate/dehydrate.
  // React Query v4's <Hydrate> has compatibility issues with Next.js App Router
  // streaming SSR where dehydrated state doesn't reliably reach the browser
  // query client, causing unnecessary client-side refetches and spinners.
  return (
    <ObserverProvider value={observer}>
      <InitialPostDataProvider value={postData}>
        <InitialDiscussionProvider value={discussionData}>
          <InitialCommunityProvider value={communityData}>
            <PostContent />
          </InitialCommunityProvider>
        </InitialDiscussionProvider>
      </InitialPostDataProvider>
    </ObserverProvider>
  );
};
export default PostPage;
