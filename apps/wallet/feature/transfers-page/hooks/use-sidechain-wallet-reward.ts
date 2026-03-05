'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchSidechainWalletReward,
  getSidechainRewardsConfig,
  isSidechainRewardsConfigured
} from '@ui/lib/sidechain-rewards';

export const useSidechainWalletReward = (account: string) => {
  const config = getSidechainRewardsConfig();
  const isConfigured = isSidechainRewardsConfigured(config);

  return useQuery({
    queryKey: ['sidechain-wallet-reward', config.token, config.source, account],
    queryFn: () => fetchSidechainWalletReward(account, config),
    enabled: isConfigured && account.length > 0,
    staleTime: 60_000,
    retry: false
  });
};
