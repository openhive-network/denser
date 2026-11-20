import type { TFunction } from 'i18next';
import { useTranslation } from '@/blog/i18n/client';
import type { QueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { Entry, EntryStat } from '@hive/common-hiveio-packages/wax';
import {
  OBSERVE,
  useOperationMutation,
  type OperationToast
} from '@ui/components/hooks/use-operation-mutation';

type MutePostParams = {
  community: string;
  username: string;
  permlink: string;
  notes: string;
  discussionPermlink: string;
  discussionAuthor: string;
};

const postDataKey = ({ username, permlink }: MutePostParams) => ['postData', username, permlink];
const discussionKey = ({ discussionPermlink }: MutePostParams) => ['discussionData', discussionPermlink];

const markTemporary = (post: Entry): Entry => ({
  ...post,
  stats: { ...post.stats, _temporary: true } as EntryStat
});

function markPostTemporary(queryClient: QueryClient, params: MutePostParams) {
  const { username, permlink } = params;
  const postData: Entry | undefined = queryClient.getQueryData(postDataKey(params));
  if (postData) queryClient.setQueryData<Entry>(postDataKey(params), markTemporary(postData));
  const discussionData: Record<string, Entry> | undefined = queryClient.getQueryData(discussionKey(params));
  if (discussionData) {
    const updated: Record<string, Entry> = Object.fromEntries(
      Object.entries(discussionData).map(([key, post]) => [
        key,
        post.author === username && post.permlink === permlink ? markTemporary(post) : post
      ])
    );
    queryClient.setQueryData(discussionKey(params), updated);
  }
}

function useModeratePostMutation(
  name: string,
  broadcast: typeof transactionService.mutePost,
  successToast: (t: TFunction<'common_blog'>) => OperationToast
) {
  const { t } = useTranslation('common_blog');
  return useOperationMutation({
    name,
    optimistic: async (params: MutePostParams, queryClient) => {
      await queryClient.cancelQueries({ queryKey: postDataKey(params) });
      await queryClient.cancelQueries({ queryKey: discussionKey(params) });
      const prevPostData: Entry | undefined = queryClient.getQueryData(postDataKey(params));
      const prevDiscussionData: Record<string, Entry> | undefined = queryClient.getQueryData(
        discussionKey(params)
      );
      markPostTemporary(queryClient, params);
      return { prevPostData, prevDiscussionData };
    },
    run: ({ community, username, permlink, notes }: MutePostParams) =>
      broadcast(community, username, permlink, notes, OBSERVE),
    onSuccess: (_data, params, queryClient) => markPostTemporary(queryClient, params),
    rollback: (context, params, queryClient) => {
      if (context?.prevPostData) queryClient.setQueryData(postDataKey(params), context.prevPostData);
      if (context?.prevDiscussionData)
        queryClient.setQueryData(discussionKey(params), context.prevDiscussionData);
    },
    successToast: () => successToast(t),
    invalidate: (params) => [postDataKey(params), discussionKey(params)],
    invalidateDelays: [4000, 10000, 20000]
  });
}

/** Mutes a post in a community. */
export const useMutePostMutation = () =>
  useModeratePostMutation('useMutePostMutation', transactionService.mutePost, (t) => ({
    title: t('post_content.moderation_toasts.muted_title'),
    description: t('post_content.moderation_toasts.muted_description')
  }));

/** Unmutes a post in a community. */
export const useUnmutePostMutation = () =>
  useModeratePostMutation('useUnmutePostMutation', transactionService.unmutePost, (t) => ({
    title: t('post_content.moderation_toasts.unmuted_title'),
    description: t('post_content.moderation_toasts.unmuted_description')
  }));
