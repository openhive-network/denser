import PostListItem from '@/blog/components/post-list-item';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Entry } from '@transaction/lib/extended-hive.chain';
import { useFollowListQuery } from './hooks/use-follow-list';
import { Preferences } from '@/blog/lib/utils';

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
      {data?.map((post: Entry) => (
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
