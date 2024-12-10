'use client';

import PostListItem from '@/blog/components/post-list-item';
import type { Entry } from '@transaction/lib/bridge';
import { useFollowListQuery } from './hooks/use-follow-list';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';

const PostList = ({ data, isCommunityPage }: { data: Entry[]; isCommunityPage?: boolean }) => {
  const { user } = useUserClient();
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
