'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getSidechainRewardsConfig,
  isSidechainRewardsConfigured
} from '@ui/lib/sidechain-rewards';
import { fetchSidechainPostRewardViaApi } from './sidechain-post-reward-api';

export const useSidechainPostReward = (author: string, permlink: string) => {
  const config = getSidechainRewardsConfig();
  const isConfigured = isSidechainRewardsConfigured(config);

  return useQuery({
    queryKey: ['sidechain-post-reward', config.token, config.source, author, permlink],
    queryFn: () => fetchSidechainPostRewardViaApi(author, permlink),
    enabled: isConfigured && author.length > 0 && permlink.length > 0,
    staleTime: 60_000,
    retry: false
  });
};
