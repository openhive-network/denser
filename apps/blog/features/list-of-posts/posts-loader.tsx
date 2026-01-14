'use client';

import PostListItem from '@/blog/features/list-of-posts/post-list-item';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { Entry } from '@hive/common-hiveio-packages/wax';
import { Preferences } from '@/blog/lib/utils';
import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import { useTranslation } from '@/blog/i18n/client';

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
  const { user } = useUserClient();
  const { t } = useTranslation('common_blog');
  const { data: blacklist } = useFollowListQuery(user.username, 'blacklisted');

  return (
    <div data-testid={`post-list-${testFilter}`} role="feed" aria-label={t('accessibility.posts_feed')}>
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
    </div>
  );
};

export default PostList;
