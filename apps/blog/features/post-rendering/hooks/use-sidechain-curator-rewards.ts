'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getSidechainRewardsConfig,
  isSidechainRewardsConfigured
} from '@ui/lib/sidechain-rewards';
import { fetchSidechainCuratorRewardsViaApi } from './sidechain-curator-rewards-api';

export const useSidechainCuratorRewards = (author: string, permlink: string) => {
  const config = getSidechainRewardsConfig();
  const isConfigured = isSidechainRewardsConfigured(config);

  return useQuery({
    queryKey: ['sidechain-curator-rewards', config.token, config.source, author, permlink],
    queryFn: () => fetchSidechainCuratorRewardsViaApi(author, permlink),
    enabled: isConfigured && author.length > 0 && permlink.length > 0,
    staleTime: 60_000,
    retry: false
  });
};
