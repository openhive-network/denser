import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Authorizes, transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes update wallet profile transaction.
 *
 * @export
 * @return {*}
 */
export function useUpdateProfileMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const updateProfileWalletMutation = useMutation({
    mutationFn: async (params: {
      memo_key: string;
      json_metadata: string;
      owner: Authorizes;
      active: Authorizes;
      posting: Authorizes;
    }) => {
      const { memo_key, json_metadata, owner, active, posting } = params;
      const broadcastResult = await transactionService.updateWalletProfile(
        memo_key,
        json_metadata,
        owner,
        active,
        posting,
        { observe: true }
      );
      const response = { ...params, broadcastResult };
      logger.info('Done update wallet profile transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { username } = user;
      queryClient.invalidateQueries({ queryKey: ['walletProfileData', username] });
      logger.info('useUpdateWalletProfileMutation onSuccess data: %o', data);
    }
  });

  return updateProfileWalletMutation;
}
