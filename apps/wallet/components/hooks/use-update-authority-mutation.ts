import { AccountAuthorityUpdateOperation } from '@hiveio/wax';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/**
 * Update Authority.
 *
 * @export
 * @return {*}
 */

export function useUpdateAuthorityOperationMutation() {
  const { user } = useUserClient();
  const queryClient = useQueryClient();
  const updateAuthorityMutation = useMutation({
    mutationFn: async (operations: AccountAuthorityUpdateOperation) => {
      const keyType = operations.role('owner').changed ? 'owner' : undefined;
      const broadcastResult = await transactionService.updateAuthority(operations, {
        observe: true,
        singleSignKeyType: keyType
      });
      const response = { username: user.username, broadcastResult };
      return response;
    },
    onSuccess: (data) => {
      const { username } = data;
      queryClient.invalidateQueries(['authority', username]);
      logger.info('useUpdateAuthorityOperationMutation onSuccess data: %o', data);
    }
  });
  return updateAuthorityMutation;
}
