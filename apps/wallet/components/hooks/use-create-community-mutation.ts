import { asset, authority } from '@hiveio/wax';
import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { logger } from '@ui/lib/logger';

export function useCreateCommunityMutation(claimed: boolean) {
  const createCommunityMutation = useMutation({
    mutationFn: async (params: {
      fee?: asset;
      memoKey: string;
      newAccountName: string;
      jsonMetadata: string;
      creator: string;
      active?: authority;
      owner?: authority;
      posting?: authority;
    }) => {
      const { fee, memoKey, newAccountName, jsonMetadata, creator, active, owner, posting } = params;
      const broadcastResult = await (claimed
        ? transactionService.createClaimedAccount(
            creator,
            memoKey,
            newAccountName,
            jsonMetadata,
            active,
            owner,
            posting,
            { observe: true }
          )
        : transactionService.accountCreate(
            fee!,
            memoKey,
            newAccountName,
            jsonMetadata,
            creator,
            active,
            owner,
            posting,
            { observe: true }
          ));
      const response = { ...params, broadcastResult };
      logger.info('Done create comuunity transaction: %o', response);
    },
    onSuccess: (data) => {
      logger.info('useCreateCommunityMutation onSuccess data: %o', data);
    }
  });

  return createCommunityMutation;
}
