import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Authorizes, transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
import { Authority } from '@hiveio/dhive/lib/chain/account';

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
      owner: Authority | undefined;
      active: Authority | undefined;
      posting: Authority | undefined;
    }) => {
      const { memo_key, json_metadata, owner, active, posting } = params;
      const transformAuthority = (authority: Authority | undefined): Authorizes | undefined => {
        if (!authority) return undefined;

        return {
          ...authority,
          account_auths: Object.fromEntries(authority.account_auths),
          key_auths: Object.fromEntries(authority.key_auths.map(([key, value]) => [key.toString(), value]))
        };
      };

      const broadcastResult = await transactionService.updateWalletProfile(
        memo_key,
        json_metadata,
        transformAuthority(owner),
        transformAuthority(active),
        transformAuthority(posting),
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
