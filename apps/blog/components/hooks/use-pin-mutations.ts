import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Entry } from '@transaction/lib/extended-hive.chain';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Pin/Unpin posts in community.
 *
 * @export
 * @return {*}
 */
export function usePinMutation() {
  const queryClient = useQueryClient();
  const pinMutation = useMutation({
    mutationFn: async (params: { community: string; username: string; permlink: string }) => {
      const { community, username, permlink } = params;
      const broadcastResult = await transactionService.pin(community, username, permlink, {
        observe: true
      });
      const prevDiscussionData: Record<string, Entry> | undefined = queryClient.getQueryData([
        'discussionData',
        permlink
      ]);
      const response = { ...params, broadcastResult, prevDiscussionData };
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { prevDiscussionData, username, permlink } = data;
      if (!!prevDiscussionData) {
        const list = [...Object.keys(prevDiscussionData).map((key) => prevDiscussionData[key])];
        const updatedList = list.map((post) => {
          if (post.author === username && post.permlink === permlink) {
            return { ...post, stats: { ...post.stats, _temporary: true } };
          }
          return post;
        });
        const newDiscussionData = Object.fromEntries(updatedList.map((post) => [post.permlink, post]));
        queryClient.setQueryData(['discussionData', permlink], newDiscussionData);
      }
    },
    onSuccess: (data) => {
      const { permlink } = data;
      toast({
        title: 'Pinned',
        description: 'Post has been pinned successfully.',
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['discussionData', permlink] });
      }, 4000);
    }
  });

  return pinMutation;
}

export function useUnpinMutation() {
  const queryClient = useQueryClient();
  const unpinMutation = useMutation({
    mutationFn: async (params: { community: string; username: string; permlink: string }) => {
      const { community, username, permlink } = params;
      const broadcastResult = await transactionService.unpin(community, username, permlink, {
        observe: true
      });
      const prevDiscussionData: Record<string, Entry> | undefined = queryClient.getQueryData([
        'discussionData',
        permlink
      ]);
      const response = { ...params, broadcastResult, prevDiscussionData };
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { prevDiscussionData, username, permlink } = data;
      if (!!prevDiscussionData) {
        const list = [...Object.keys(prevDiscussionData).map((key) => prevDiscussionData[key])];
        const updatedList = list.map((post) => {
          if (post.author === username && post.permlink === permlink) {
            return { ...post, stats: { ...post.stats, _temporary: true } };
          }
          return post;
        });
        const newDiscussionData = Object.fromEntries(updatedList.map((post) => [post.permlink, post]));
        queryClient.setQueryData(['discussionData', permlink], newDiscussionData);
      }
    },
    onSuccess: (data) => {
      const { permlink } = data;
      toast({
        title: 'Unpinned',
        description: 'Post has been unpinned successfully.',
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['discussionData', permlink] });
      }, 4000);
    }
  });

  return unpinMutation;
}
