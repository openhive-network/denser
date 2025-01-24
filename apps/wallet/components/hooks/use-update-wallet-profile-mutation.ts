import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
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
      owner: any;
      active: any;
      posting: any;
    }) => {
      const { memo_key, json_metadata, owner, active, posting } = params;

      const transformAuths = (auths: { account: string; threshold: number }[]) => {
        return auths.reduce(
          (acc, { account, threshold }) => {
            acc[account] = threshold;
            return acc;
          },
          {} as { [key: string]: number }
        );
      };

      const transformKeyAuths = (keyAuths: { key: string; threshold: number }[]) => {
        return keyAuths.reduce(
          (acc, { key, threshold }) => {
            acc[key] = threshold;
            return acc;
          },
          {} as { [key: string]: number }
        );
      };

      const transformedOwner = owner
        ? {
            ...owner,
            account_auths: transformAuths(owner.account_auths),
            key_auths: transformKeyAuths(owner.key_auths)
          }
        : undefined;
      const transformedActive = active
        ? {
            ...active,
            account_auths: transformAuths(active.account_auths),
            key_auths: transformKeyAuths(active.key_auths)
          }
        : undefined;
      const transformedPosting = posting
        ? {
            ...posting,
            account_auths: transformAuths(posting.account_auths),
            key_auths: transformKeyAuths(posting.key_auths)
          }
        : undefined;

      const broadcastResult = await transactionService.updateWalletProfile(
        user.username,
        memo_key,
        json_metadata,
        transformedOwner,
        transformedActive,
        transformedPosting,
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
