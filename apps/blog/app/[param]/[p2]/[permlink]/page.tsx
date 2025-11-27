import { Suspense } from 'react';
import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import PostContent from './content';
import { getCommunity, getListCommunityRoles, getPost } from '@transaction/lib/bridge-api';
import { getDiscussion } from '@transaction/lib/bridge-api';
import { getActiveVotes } from '@transaction/lib/hive-api';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import Loading from '@ui/components/loading';
import { isUsernameValid, isPermlinkValid } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';


const PostPage = async ({
  params: { param, p2, permlink }
}: {
  params: { param: string; p2: string; permlink: string };
}) => {
  const queryClient = getQueryClient();
  const username = p2.replace('%40', '');
  const community = param;
  const validUser = await isUsernameValid(username);
  if (!validUser) notFound();

  if (!isPermlinkValid(permlink)) notFound();

  const observer = getObserverFromCookies();
  await queryClient.prefetchQuery({
    queryKey: ['postData', username, permlink],
    queryFn: () => getPost(username, permlink, observer)
  });

  await queryClient.prefetchQuery({
    queryKey: ['discussionData', permlink],
    queryFn: () => getDiscussion(username, permlink, observer)
  });

  await queryClient.prefetchQuery({
    queryKey: ['activeVotes', username, permlink],
    queryFn: () => getActiveVotes(username, permlink)
  });

  if (community.startsWith('hive-')) {
    await queryClient.prefetchQuery({
      queryKey: ['communityData', community],
      queryFn: () => getCommunity(community, observer)
    });
    await queryClient.prefetchQuery({
      queryKey: ['rolesList', community],
      queryFn: () => getListCommunityRoles(community)
    });
  }

  return (
    <Hydrate state={dehydrate(queryClient)}>
      <Suspense fallback={<Loading loading={true} />}>
        <PostContent />
      </Suspense>
    </Hydrate>
  );
};
export default PostPage;
