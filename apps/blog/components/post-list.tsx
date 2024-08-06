import PostListItem from '@/blog/components/post-list-item';
import { useUser } from '@smart-signer/lib/auth/use-user';
import type { Entry } from '@transaction/lib/bridge';
import { useFollowListQuery } from './hooks/use-follow-list';

const PostList = ({ data, isCommunityPage }: { data: Entry[]; isCommunityPage?: boolean }) => {
  const { user } = useUser();
  const { data: blacklist } = useFollowListQuery(user.username, 'blacklisted');

  return (
    <ul>
      {data?.map((post: Entry) => (
        <PostListItem
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
