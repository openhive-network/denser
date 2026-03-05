'use client';

import PostListItem from '@/blog/features/list-of-posts/post-list-item';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { Entry } from '@hive/common-hiveio-packages/wax';
import { Preferences } from '@/blog/lib/utils';
import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  getSidechainRewardsConfig,
  isSidechainRewardsConfigured
} from '@ui/lib/sidechain-rewards';
import { fetchSidechainPostRewardViaApi } from './hooks/sidechain-post-reward-api';

const PostList = ({
  data,
  isCommunityPage,
  testFilter,
  nsfwPreferences,
  hePayoutOnly = false
}: {
  data: Entry[];
  isCommunityPage?: boolean;
  testFilter?: string;
  nsfwPreferences: Preferences['nsfw'];
  hePayoutOnly?: boolean;
}) => {
  const { user } = useUserClient();
  const { data: blacklist } = useFollowListQuery(user.username, 'blacklisted');
  const sidechainConfig = getSidechainRewardsConfig();
  const isSidechainConfigured = isSidechainRewardsConfigured(sidechainConfig);
  const shouldUseSidechainRanking = isSidechainConfigured && !hePayoutOnly;

  const validPosts = useMemo(() => data?.filter((post) => post && post.post_id) ?? [], [data]);

  const rewardQueries = useQueries({
    queries: shouldUseSidechainRanking
      ? validPosts.map((post) => ({
          queryKey: [
            'sidechain-post-reward',
            sidechainConfig.token,
            sidechainConfig.source,
            post.author,
            post.permlink
          ],
          queryFn: () => fetchSidechainPostRewardViaApi(post.author, post.permlink),
          enabled: post.author.length > 0 && post.permlink.length > 0,
          staleTime: 60_000,
          retry: false
        }))
      : []
  });

  const isRewardRankingReady =
    !shouldUseSidechainRanking || rewardQueries.every((query) => query.isFetched || query.isError);

  const rankedPosts = useMemo(() => {
    if (hePayoutOnly) {
      return validPosts;
    }

    if (!isSidechainConfigured || !isRewardRankingReady) {
      return validPosts;
    }

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const withTokenPayout: Entry[] = [];
    const withoutTokenPayout: Entry[] = [];

    for (let index = 0; index < validPosts.length; index += 1) {
      const post = validPosts[index];
      const rewardAmount = rewardQueries[index]?.data?.amount ?? 0;
      const createdMs = Date.parse(post.created);
      const isInSevenDayWindow = Number.isFinite(createdMs) && now - createdMs <= sevenDaysMs;
      const hasTokenPayout = rewardAmount > 0;
      if (hasTokenPayout && isInSevenDayWindow) {
        withTokenPayout.push(post);
      } else {
        withoutTokenPayout.push(post);
      }
    }

    return [...withTokenPayout, ...withoutTokenPayout];
  }, [hePayoutOnly, isSidechainConfigured, isRewardRankingReady, rewardQueries, validPosts]);

  return (
    <ul data-testid={`post-list-${testFilter}`}>
      {rankedPosts.map((post: Entry) => (
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
