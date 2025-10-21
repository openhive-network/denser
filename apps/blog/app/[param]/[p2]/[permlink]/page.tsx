import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import PostContent from './content';
import { getCommunity, getListCommunityRoles, getPost } from '@transaction/lib/bridge-api';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';
import { getSimilarPostsByPost } from '@transaction/lib/hivesense-api';
import { getDiscussion } from '@transaction/lib/bridge-api';
import { getActiveVotes } from '@transaction/lib/hive-api';

const PostPage = async ({
  params: { param, p2, permlink }
}: {
  params: { param: string; p2: string; permlink: string };
}) => {
  const queryClient = getQueryClient();
  const username = p2.replace('%40', '');
  const community = param;

  await queryClient.prefetchQuery({
    queryKey: ['postData', username, permlink],
    queryFn: () => getPost(username, permlink)
  });

  await queryClient.prefetchQuery({
    queryKey: ['suggestions', username, permlink],
    queryFn: () =>
      getSimilarPostsByPost({
        author: username,
        permlink,
        observer: DEFAULT_OBSERVER,
        result_limit: 10,
        full_posts: 10
      })
  });

  await queryClient.prefetchQuery({
    queryKey: ['discussionData', permlink],
    queryFn: () => getDiscussion(username, permlink, DEFAULT_OBSERVER)
  });

  await queryClient.prefetchQuery({
    queryKey: ['activeVotes', username, permlink],
    queryFn: () => getActiveVotes(username, permlink)
  });

  if (community.startsWith('hive-')) {
    await queryClient.prefetchQuery({
      queryKey: ['communityData', community],
      queryFn: () => getCommunity(community)
    });
    await queryClient.prefetchQuery({
      queryKey: ['rolesList', community],
      queryFn: () => getListCommunityRoles(community)
    });
  }

  return (
    <Hydrate state={dehydrate(queryClient)}>
      <PostContent />
    </Hydrate>
  );
};
export default PostPage;
