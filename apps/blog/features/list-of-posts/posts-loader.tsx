import PostListItem from '@/blog/features/list-of-posts/post-list-item';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Entry } from '@transaction/lib/extended-hive.chain';

import { Preferences } from '@/blog/lib/utils';
import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';

const PostList = ({
  data,
  isCommunityPage,
  testFilter,
  nsfwPreferences
}: {
  data: Entry[];
  isCommunityPage?: boolean;
  testFilter?: string;
  nsfwPreferences: Preferences['nsfw'];
}) => {
  const { user } = useUser();
  const { data: blacklist } = useFollowListQuery(user.username, 'blacklisted');

  return (
    <ul data-testid={`post-list-${testFilter}`}>
      {data
        ?.filter((post) => post && post.post_id)
        .map((post: Entry) => (
          <PostListItem
            nsfwPreferences={nsfwPreferences}
            post={post}
            key={post.post_id}
            isCommunityPage={isCommunityPage}
            blacklist={blacklist}
          />
        ))}
    </ul>
  );
};

export default PostList;
