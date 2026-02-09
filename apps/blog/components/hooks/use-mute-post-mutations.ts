import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Entry, EntryStat } from '@hive/common-hiveio-packages/wax';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/handle-error';
import { scheduleInvalidations } from '@/blog/lib/react-query';

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
    onMutate: async (params: {
      community: string;
      username: string;
      permlink: string;
      notes: string;
      discussionPermlink: string;
      discussionAuthor: string;
    }) => {
      const { username, permlink, discussionPermlink } = params;
      const postDataKey = ['postData', username, permlink];
      const discussionKey = ['discussionData', discussionPermlink];

      await queryClient.cancelQueries({ queryKey: postDataKey });
      await queryClient.cancelQueries({ queryKey: discussionKey });

      const prevPostData: Entry | undefined = queryClient.getQueryData(postDataKey);
      const prevDiscussionData: Record<string, Entry> | undefined = queryClient.getQueryData(discussionKey);

      if (prevPostData) {
        queryClient.setQueryData<Entry>(postDataKey, {
          ...prevPostData,
          stats: { ...prevPostData.stats, _temporary: true } as EntryStat
        });
      }

      if (prevDiscussionData) {
        const newDiscussionData: Record<string, Entry> = Object.fromEntries(
          Object.entries(prevDiscussionData).map(([key, post]) => [
            key,
            post.author === username && post.permlink === permlink
              ? { ...post, stats: { ...post.stats, _temporary: true } as EntryStat }
              : post
          ])
        );
        queryClient.setQueryData(discussionKey, newDiscussionData);
      }

      return { prevPostData, prevDiscussionData, postDataKey, discussionKey };
    },

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
      logger.info('Done mute post transaction: %o', { discussionPermlink, broadcastResult });
      return { ...params, broadcastResult };
    },

    onSettled: (data) => {
      if (!data) return;
      const { username, permlink, discussionPermlink } = data;
      const postData: Entry | undefined = queryClient.getQueryData(['postData', username, permlink]);
      if (postData) {
        queryClient.setQueryData<Entry>(['postData', username, permlink], {
          ...postData,
          stats: { ...postData.stats, _temporary: true } as EntryStat
        });
      }
      const discussionData: Record<string, Entry> | undefined = queryClient.getQueryData([
        'discussionData',
        discussionPermlink
      ]);
      if (discussionData) {
        const updated: Record<string, Entry> = Object.fromEntries(
          Object.entries(discussionData).map(([key, post]) => [
            key,
            post.author === username && post.permlink === permlink
              ? { ...post, stats: { ...post.stats, _temporary: true } as EntryStat }
              : post
          ])
        );
        queryClient.setQueryData(['discussionData', discussionPermlink], updated);
      }
    },

    onSuccess: (data) => {
      const { username, permlink, discussionPermlink } = data;
      toast({
        title: 'Post muted',
        description: 'Post has been muted successfully.',
        variant: 'success'
      });
      scheduleInvalidations(
        queryClient,
        [
          ['postData', username, permlink],
          ['discussionData', discussionPermlink]
        ],
        [4000, 10000, 20000]
      );
    },

    onError: (error: unknown, variables, context) => {
      if (context?.prevPostData) {
        queryClient.setQueryData(context.postDataKey, context.prevPostData);
      }
      if (context?.prevDiscussionData) {
        queryClient.setQueryData(context.discussionKey, context.prevDiscussionData);
      }

      handleError(error, {
        method: 'useMutePostMutation',
        params: variables
      });
    }
  });
  return mutePostMutation;
}

export function useUnmutePostMutation() {
  const queryClient = useQueryClient();

  const unmutePostMutation = useMutation({
    onMutate: async (params: {
      community: string;
      username: string;
      permlink: string;
      notes: string;
      discussionPermlink: string;
      discussionAuthor: string;
    }) => {
      const { username, permlink, discussionPermlink } = params;
      const postDataKey = ['postData', username, permlink];
      const discussionKey = ['discussionData', discussionPermlink];

      await queryClient.cancelQueries({ queryKey: postDataKey });
      await queryClient.cancelQueries({ queryKey: discussionKey });

      const prevPostData: Entry | undefined = queryClient.getQueryData(postDataKey);
      const prevDiscussionData: Record<string, Entry> | undefined = queryClient.getQueryData(discussionKey);

      if (prevPostData) {
        queryClient.setQueryData<Entry>(postDataKey, {
          ...prevPostData,
          stats: { ...prevPostData.stats, _temporary: true } as EntryStat
        });
      }

      if (prevDiscussionData) {
        const newDiscussionData: Record<string, Entry> = Object.fromEntries(
          Object.entries(prevDiscussionData).map(([key, post]) => [
            key,
            post.author === username && post.permlink === permlink
              ? { ...post, stats: { ...post.stats, _temporary: true } as EntryStat }
              : post
          ])
        );
        queryClient.setQueryData(discussionKey, newDiscussionData);
      }

      return { prevPostData, prevDiscussionData, postDataKey, discussionKey };
    },

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
      logger.info('Done unmute post transaction: %o', { discussionPermlink, broadcastResult });
      return { ...params, broadcastResult };
    },

    onSettled: (data) => {
      if (!data) return;
      const { username, permlink, discussionPermlink } = data;
      const postData: Entry | undefined = queryClient.getQueryData(['postData', username, permlink]);
      if (postData) {
        queryClient.setQueryData<Entry>(['postData', username, permlink], {
          ...postData,
          stats: { ...postData.stats, _temporary: true } as EntryStat
        });
      }
      const discussionData: Record<string, Entry> | undefined = queryClient.getQueryData([
        'discussionData',
        discussionPermlink
      ]);
      if (discussionData) {
        const updated: Record<string, Entry> = Object.fromEntries(
          Object.entries(discussionData).map(([key, post]) => [
            key,
            post.author === username && post.permlink === permlink
              ? { ...post, stats: { ...post.stats, _temporary: true } as EntryStat }
              : post
          ])
        );
        queryClient.setQueryData(['discussionData', discussionPermlink], updated);
      }
    },

    onSuccess: (data) => {
      const { username, permlink, discussionPermlink } = data;
      toast({
        title: 'Post unmuted',
        description: 'Post has been unmuted successfully.',
        variant: 'success'
      });
      scheduleInvalidations(
        queryClient,
        [
          ['postData', username, permlink],
          ['discussionData', discussionPermlink]
        ],
        [4000, 10000, 20000]
      );
    },

    onError: (error: unknown, variables, context) => {
      if (context?.prevPostData) {
        queryClient.setQueryData(context.postDataKey, context.prevPostData);
      }
      if (context?.prevDiscussionData) {
        queryClient.setQueryData(context.discussionKey, context.prevDiscussionData);
      }

      handleError(error, {
        method: 'useUnmutePostMutation',
        params: variables
      });
    }
  });

  return unmutePostMutation;
}
