'use client';

import { useMemo } from 'react';
import PostListItem from '@/blog/features/list-of-posts/post-list-item';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { Preferences } from '@/blog/lib/utils';
import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import { PRIORITY_IMAGE_COUNT } from './lib/card-image';
import type { CardEntry } from './lib/card-entry';

const PostList = ({
  data,
  isCommunityPage,
  testFilter,
  nsfwPreferences,
  prioritizeLeadingImages = false
}: {
  data: CardEntry[];
  isCommunityPage?: boolean;
  testFilter?: string;
  nsfwPreferences: Preferences['nsfw'];
  prioritizeLeadingImages?: boolean;
}) => {
  const { user } = useUserClient();
  const { data: blacklist } = useFollowListQuery(user.username, 'blacklisted');
  const blacklistedAuthors = useMemo(() => new Set(blacklist?.map((entry) => entry.name)), [blacklist]);

  return (
    <ul data-testid={`post-list-${testFilter}`}>
      {data
        ?.filter((post) => post?.author && post.permlink)
        .map((post: CardEntry, index) => (
          <PostListItem
            nsfwPreferences={nsfwPreferences}
            post={post}
            key={`${post.author}/${post.permlink}`}
            isCommunityPage={isCommunityPage}
            isAuthorBlacklisted={blacklistedAuthors.has(post.author)}
            isImagePriority={prioritizeLeadingImages && index < PRIORITY_IMAGE_COUNT}
          />
        ))}
    </ul>
  );
};

export default PostList;
