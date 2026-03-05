'use client';

import { SidechainPostReward } from '@ui/lib/sidechain-rewards';

interface SidechainPostRewardApiResponse {
  reward?: SidechainPostReward | null;
}

export const fetchSidechainPostRewardViaApi = async (
  author: string,
  permlink: string
): Promise<SidechainPostReward | null> => {
  const params = new URLSearchParams({
    author,
    permlink
  });

  const response = await fetch(`/api/sidechain/post-reward?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Sidechain post reward API failed (${response.status})`);
  }

  const payload = (await response.json()) as SidechainPostRewardApiResponse;
  return payload.reward ?? null;
};
