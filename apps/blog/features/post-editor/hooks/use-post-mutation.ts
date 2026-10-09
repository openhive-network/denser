import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import { scheduleValidatedRefetch } from '@/blog/lib/react-query';
import { getPost } from '@transaction/lib/bridge-api';
import { setStorageItem, removeStorageItem, StorageTTL } from '@ui/lib/storage-with-ttl';
import { buildOptimisticPost, type PostParams } from '../lib/optimistic-post';
import { broadcastPost } from '../lib/broadcast-post';

const FEED_REFRESH_DELAYS = [8000, 16000, 30000];

const shadowPostKey = (username: string, permlink: string) => `shadow-post-${username}-${permlink}`;

/** Makes post transaction; a new post's page is available from the cache right after broadcast. */
export function usePostMutation() {
  const { username } = useUserClient().user;
  return useOperationMutation({
    name: 'usePostMutation',
    optimistic: (params: PostParams, queryClient) => {
      const { permlink, title, body, tags, category, summary, editMode } = params;
      if (!editMode) {
        // Observer is username when logged in (required to post)
        queryClient.setQueryData(
          ['postData', username, permlink, username],
          buildOptimisticPost(params, username)
        );
        // Shadow draft: insurance against a tab crash before Hivemind indexes the post
        setStorageItem(
          shadowPostKey(username, permlink),
          { title, body, tags, category, summary },
          StorageTTL.SHADOW_DRAFT
        );
      }
      return { username, permlink };
    },
    run: broadcastPost,
    onSuccess: (_data, { permlink }, queryClient) => {
      // Validated refetch: a stale Hivemind response must not overwrite the optimistic post
      scheduleValidatedRefetch(
        queryClient,
        ['postData', username, permlink, username],
        () => getPost(username, permlink, username),
        (freshData) => freshData != null && !freshData._optimistic,
        undefined,
        { onValidated: () => removeStorageItem(shadowPostKey(username, permlink)) }
      );
    },
    rollback: (context, { editMode }, queryClient) => {
      if (!context || editMode) return;
      queryClient.removeQueries({
        queryKey: ['postData', context.username, context.permlink, context.username]
      });
      removeStorageItem(shadowPostKey(context.username, context.permlink));
    },
    successToast: () => ({
      title: 'Post submitted successfully',
      description: 'Your post has been submitted'
    }),
    invalidate: () => [['entriesInfinite'], ['accountEntriesInfinite']],
    invalidateDelays: FEED_REFRESH_DELAYS
  });
}

export function useDeletePostMutation() {
  const { username } = useUserClient().user;
  return useOperationMutation({
    name: 'useDeletePostMutation',
    run: ({ permlink }: { permlink: string }) =>
      transactionService.deleteComment(permlink, { observe: false }),
    successToast: () => ({ title: 'Post deleted successfully', description: 'Your post has been deleted' }),
    invalidate: ({ permlink }) => [['postData', username, permlink, username], ['entriesInfinite']],
    invalidateDelays: FEED_REFRESH_DELAYS
  });
}
