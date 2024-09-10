import { EAvailableCommunityRoles } from '@hiveio/wax';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Set roles in community.
 *
 * @export
 * @return {*}
 */

export function useSetRoleMutation() {
  const queryClient = useQueryClient();
  const setRoleMutation = useMutation({
    mutationFn: async (params: { community: string; username: string; role: EAvailableCommunityRoles }) => {
      const { community, username, role } = params;
      const broadcastResult = await transactionService.setRole(community, username, role, {
        observe: true
      });
      const response = { ...params, broadcastResult };
      logger.info('Done set role transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useSetRoleMutation onSuccess data: %o', data);
      const { community } = data;
      queryClient.invalidateQueries({ queryKey: ['rolesList', community] });
    }
  });

  return setRoleMutation;
}
