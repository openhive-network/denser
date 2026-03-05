'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchSidechainAccountTransactions,
  getSidechainRewardsConfig,
  isSidechainRewardsConfigured
} from '@ui/lib/sidechain-rewards';

export const useSidechainAccountTransactions = (account: string) => {
  const config = getSidechainRewardsConfig();
  const isConfigured = isSidechainRewardsConfigured(config);

  return useQuery({
    queryKey: ['sidechain-account-transactions', config.token, config.source, account],
    queryFn: () => fetchSidechainAccountTransactions(account, config, 500),
    enabled: isConfigured && account.length > 0,
    staleTime: 60_000,
    retry: false
  });
};
