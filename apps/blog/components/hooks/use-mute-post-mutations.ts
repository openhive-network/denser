import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Mute/Unmute posts in community.
 *
 * @export
 * @return {*}
 */
export function useMutePostMutation() {
  const queryClient = useQueryClient();

  const mutePostMutation = useMutation({
    mutationFn: async (params: {
      community: string;
      username: string;
      permlink: string;
      notes: string;
      discussionPermlink: string;
      discussionAuthor: string;
    }) => {
      const { community, username, permlink, notes } = params;
      const broadcastResult = await transactionService.mutePost(community, username, permlink, notes, {
        observe: true
      });
      const response = { ...params, broadcastResult };
      logger.info('Done mutePost transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useMutePostMutation onSuccess data: %o', data);
      const { username, permlink, discussionPermlink, discussionAuthor } = data;
      queryClient.invalidateQueries({ queryKey: ['postData', username, permlink] });
      queryClient.invalidateQueries({
        queryKey: ['discussionData', discussionAuthor, discussionPermlink]
      });
    }
  });
  return mutePostMutation;
}

export function useUnmutePostMutation() {
  const queryClient = useQueryClient();

  const unmutePostMutation = useMutation({
    mutationFn: async (params: {
      community: string;
      username: string;
      permlink: string;
      notes: string;
      discussionPermlink: string;
      discussionAuthor: string;
    }) => {
      const { community, username, permlink, notes } = params;
      const broadcastResult = await transactionService.unmutePost(community, username, permlink, notes, {
        observe: true
      });
      const response = { ...params, broadcastResult };
      logger.info('Done unmutePost transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useUnmutePostMutation onSuccess data: %o', data);
      const { username, permlink, discussionPermlink, discussionAuthor } = data;
      queryClient.invalidateQueries({ queryKey: ['postData', username, permlink] });
      queryClient.invalidateQueries({
        queryKey: ['discussionData', discussionAuthor, discussionPermlink]
      });
    }
  });

  return unmutePostMutation;
}
