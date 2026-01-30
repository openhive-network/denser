import { Suspense } from 'react';
import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import PostContent from './content';
import { getPostCached } from '@/blog/lib/cached-api';
import { getCommunity, getListCommunityRoles } from '@transaction/lib/bridge-api';
import { getDiscussion } from '@transaction/lib/bridge-api';
import { getActiveVotes } from '@transaction/lib/hive-api';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import Loading from '@ui/components/loading';
import { isUsernameValid, isPermlinkValid, isValidUserParam } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';
import { isCommunity } from '@ui/lib/utils';

const logger = getLogger('app');

const PostPage = async ({
  params
}: {
  params: Promise<{ param: string; p2: string; permlink: string }>;
}) => {
  const { param, p2, permlink } = await params;
  // p2 should start with @ or %40 for valid post URLs
  if (!isValidUserParam(p2)) {
    notFound();
  }

  const queryClient = getQueryClient();
  const username = p2.replace('%40', '').replace('@', '');
  const community = param;
  const validUser = await isUsernameValid(username);
  if (!validUser) notFound();

  if (!isPermlinkValid(permlink)) notFound();
  try {
    const observer = await getObserverFromCookies();
    await Promise.all([
      // Use cached version - deduplicated with layout's generateMetadata within the same request
      queryClient.prefetchQuery({
        queryKey: ['postData', username, permlink, observer],
        queryFn: () => getPostCached(username, permlink, observer)
      }),
      queryClient.prefetchQuery({
        queryKey: ['discussionData', username, permlink, observer],
        queryFn: () => getDiscussion(username, permlink, observer)
      }),
      queryClient.prefetchQuery({
        queryKey: ['activeVotes', username, permlink],
        queryFn: () => getActiveVotes(username, permlink)
      }),
      ...(isCommunity(community)
        ? [
            queryClient.prefetchQuery({
              queryKey: ['community', community, observer],
              queryFn: () => getCommunity(community, observer)
            }),
            queryClient.prefetchQuery({
              queryKey: ['rolesList', community],
              queryFn: () => getListCommunityRoles(community)
            })
          ]
        : [])
    ]);
  } catch (error) {
    logger.error(error, 'Error in PostPage:');
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<Loading loading={true} />}>
        <PostContent />
      </Suspense>
    </HydrationBoundary>
  );
};
export default PostPage;
