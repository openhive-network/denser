import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LevelAuthority, transactionService, UpdateAuthorityAction } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/**
 * Update Authority.
 *
 * @export
 * @return {*}
 */

export function useUpdateAuthorityMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const updateAuthorityMutation = useMutation({
    mutationFn: async ({ level, action }: { level: LevelAuthority; action: UpdateAuthorityAction }) => {
      const broadcastResult = await transactionService.updateAuthority(user.username, level, action, {
        observe: true
      });
      const response = {
        level,
        action: action.type,
        ...action.payload,
        username: user.username,
        broadcastResult
      };

      return response;
    },
    onSuccess: (data) => {
      const { username } = data;
      queryClient.invalidateQueries(['authority', username]);
      logger.info('useUpdateAuthorityMutation onSuccess data: %o', data);
    }
  });
  return updateAuthorityMutation;
}
