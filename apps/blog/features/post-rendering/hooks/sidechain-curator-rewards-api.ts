'use client';

import { SidechainCuratorReward } from '@ui/lib/sidechain-rewards';

interface SidechainCuratorRewardsApiResponse {
  curators?: SidechainCuratorReward[] | null;
}

export const fetchSidechainCuratorRewardsViaApi = async (
  author: string,
  permlink: string
): Promise<SidechainCuratorReward[]> => {
  const params = new URLSearchParams({
    author,
    permlink
  });

  const response = await fetch(`/api/sidechain/post-curator-rewards?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Sidechain curator rewards API failed (${response.status})`);
  }

  const payload = (await response.json()) as SidechainCuratorRewardsApiResponse;
  return payload.curators ?? [];
};
