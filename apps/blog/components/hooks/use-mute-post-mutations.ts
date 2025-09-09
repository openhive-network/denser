import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Entry } from '@transaction/lib/extended-hive.chain';
import { toast } from '@ui/components/hooks/use-toast';
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
      const { community, username, permlink, notes, discussionPermlink } = params;
      const broadcastResult = await transactionService.mutePost(community, username, permlink, notes, {
        observe: true
      });
      const prevPostData: Entry | undefined = queryClient.getQueryData(['postData', username, permlink]);
      const prevDiscussionData: Record<string, Entry> | undefined = queryClient.getQueryData([
        'discussionData',
        discussionPermlink
      ]);
      const response = { ...params, broadcastResult, prevPostData, prevDiscussionData };
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { prevPostData, prevDiscussionData, username, permlink, discussionPermlink } = data;
      if (!!prevPostData) {
        queryClient.setQueryData(['postData', username, permlink], {
          ...prevPostData,
          stats: { ...prevPostData.stats, _temporary: true }
        });
      }
      if (!!prevDiscussionData) {
        const list = [...Object.keys(prevDiscussionData).map((key) => prevDiscussionData[key])];
        const updatedList = list.map((post) => {
          if (post.author === username && post.permlink === permlink) {
            return { ...post, stats: { ...post.stats, _temporary: true } };
          }
          return post;
        });
        const newDiscussionData = Object.fromEntries(updatedList.map((post) => [post.permlink, post]));
        queryClient.setQueryData(['discussionData', discussionPermlink], newDiscussionData);
      }
    },
    onSuccess: (data) => {
      const { username, permlink, discussionPermlink } = data;

      toast({
        title: 'Post muted',
        description: `Post has been muted successfully.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['postData', username, permlink] });
        queryClient.invalidateQueries({
          queryKey: ['discussionData', discussionPermlink]
        });
      }, 4000);
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
      const { community, username, permlink, notes, discussionPermlink } = params;
      const broadcastResult = await transactionService.unmutePost(community, username, permlink, notes, {
        observe: true
      });
      const prevPostData: Entry | undefined = queryClient.getQueryData(['postData', username, permlink]);
      const prevDiscussionData: Record<string, Entry> | undefined = queryClient.getQueryData([
        'discussionData',
        discussionPermlink
      ]);
      const response = { ...params, broadcastResult, prevPostData, prevDiscussionData };
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { prevPostData, prevDiscussionData, username, permlink, discussionPermlink } = data;
      if (!!prevPostData) {
        queryClient.setQueryData(['postData', username, permlink], {
          ...prevPostData,
          stats: { ...prevPostData.stats, _temporary: true }
        });
      }
      if (!!prevDiscussionData) {
        const list = [...Object.keys(prevDiscussionData).map((key) => prevDiscussionData[key])];
        const updatedList = list.map((post) => {
          if (post.author === username && post.permlink === permlink) {
            return { ...post, stats: { ...post.stats, _temporary: true } };
          }
          return post;
        });
        const newDiscussionData = Object.fromEntries(updatedList.map((post) => [post.permlink, post]));
        queryClient.setQueryData(['discussionData', discussionPermlink], newDiscussionData);
      }
    },
    onSuccess: (data) => {
      const { username, permlink, discussionPermlink } = data;
      toast({
        title: 'Post unmuted',
        description: `Post has been unmuted successfully.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['postData', username, permlink] });
        queryClient.invalidateQueries({
          queryKey: ['discussionData', discussionPermlink]
        });
      }, 4000);
    }
  });

  return unmutePostMutation;
}
