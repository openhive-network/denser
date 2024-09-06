import { asset, authority, createHiveChain } from '@hiveio/wax';
import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { logger } from '@ui/lib/logger';

export function useCreateCommunityMutation(claimed: boolean) {
  const createCommunityMutation = useMutation({
    mutationFn: async (params: {
      memoKey: string;
      newAccountName: string;
      creator: string;
      active: string;
      owner: string;
      posting: string;
    }) => {
      const { memoKey, newAccountName, creator, active, owner, posting } = params;
      const fee = (await createHiveChain()).hive(3000);
      const jsonMetadata = '';

      const activeAuthority = {
        weight_threshold: 1,
        key_auths: {
          [active]: 1
        },
        account_auths: {}
      };

      const ownerAuthority = {
        weight_threshold: 1,
        key_auths: {
          [owner]: 1
        },
        account_auths: {}
      };

      const postingAuthority = {
        weight_threshold: 1,
        key_auths: {
          [posting]: 1
        },
        account_auths: {}
      };

      const broadcastResult = await (claimed
        ? transactionService.createClaimedAccount(
            creator,
            memoKey,
            newAccountName,
            jsonMetadata,
            activeAuthority,
            ownerAuthority,
            postingAuthority,
            { observe: true }
          )
        : transactionService.accountCreate(
            fee,
            memoKey,
            newAccountName,
            jsonMetadata,
            creator,
            activeAuthority,
            ownerAuthority,
            postingAuthority,
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
