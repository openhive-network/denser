'use client';

import PostListItem from '@/blog/features/list-of-posts/post-list-item';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { Entry } from '@hive/common-hiveio-packages/wax';
import { Preferences } from '@/blog/lib/utils';
import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';

// The first feed images are the LCP candidates, so they must not wait for lazy-loading.
const PRIORITY_IMAGE_COUNT = 2;

const PostList = ({
  data,
  isCommunityPage,
  testFilter,
  nsfwPreferences,
  prioritizeLeadingImages = false
}: {
  data: Entry[];
  isCommunityPage?: boolean;
  testFilter?: string;
  nsfwPreferences: Preferences['nsfw'];
  prioritizeLeadingImages?: boolean;
}) => {
  const { user } = useUserClient();
  const { data: blacklist } = useFollowListQuery(user.username, 'blacklisted');

  return (
    <ul data-testid={`post-list-${testFilter}`}>
      {data
        ?.filter((post) => post?.author && post.permlink)
        .map((post: Entry, index) => (
          <PostListItem
            nsfwPreferences={nsfwPreferences}
            post={post}
            key={`${post.author}/${post.permlink}`}
            isCommunityPage={isCommunityPage}
            blacklist={blacklist}
            isImagePriority={prioritizeLeadingImages && index < PRIORITY_IMAGE_COUNT}
          />
        ))}
    </ul>
  );
};

export default PostList;
