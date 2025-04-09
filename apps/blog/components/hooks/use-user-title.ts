import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Set user from community title.
 *
 * @export
 * @return {*}
 */

export function useUserTitleMutation() {
  const queryClient = useQueryClient();
  const userTitleMutation = useMutation({
    mutationFn: async (params: { community: string; username: string; title: string; permlink: string }) => {
      const { community, username, title } = params;
      const broadcastResult = await transactionService.setUserTitle(community, username, title, {
        observe: true
      });
      const response = { ...params, broadcastResult };
      logger.info('Done setUserTitle transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useUserTitleMutation onSuccess data: %o', data);
      const { community, username, permlink } = data;
      queryClient.invalidateQueries({ queryKey: ['subscribers', community] });
      queryClient.invalidateQueries({ queryKey: ['postData', username, permlink] });
      queryClient.invalidateQueries({ queryKey: ['discussionData', permlink] });
    }
  });

  return userTitleMutation;
}
