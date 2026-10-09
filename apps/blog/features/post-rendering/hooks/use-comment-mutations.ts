import { useRef } from 'react';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { Preferences, Entry } from '@hive/common-hiveio-packages/wax';
import { getLogger } from '@ui/lib/logging';
import { useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import { scheduleValidatedRefetch } from '@/blog/lib/react-query';
import { setStorageItem, removeStorageItem, StorageTTL } from '@ui/lib/storage-with-ttl';
import { withOptimisticReply } from '../lib/optimistic-comment';
import {
  type Discussion,
  type DiscussionParams,
  discussionKey,
  fetchDiscussion,
  restoreDiscussion,
  snapshotDiscussion,
  updateDiscussion
} from '../lib/discussion-cache';

const logger = getLogger('app');

// Not observed: a successful broadcast guarantees inclusion in the blockchain
const BROADCAST_ONLY = { observe: false };

type CommentParams = DiscussionParams & {
  parentAuthor: string;
  parentPermlink: string;
  body: string;
  reputation: number;
  preferences: Preferences;
};
type UpdateCommentParams = DiscussionParams & {
  parentAuthor: string;
  parentPermlink: string;
  permlink: string;
  body: string;
};
type DeleteCommentParams = DiscussionParams & { permlink: string };

/** Makes comment transaction; the reply shows, fully interactive, before the broadcast. */
export function useCommentMutation() {
  const { username } = useUserClient().user;
  const cleanupRef = useRef<(() => void) | null>(null);
  const shadowKey = ({ parentAuthor, parentPermlink }: CommentParams) =>
    `shadow-reply-${username}-${parentAuthor}-${parentPermlink}`;

  return useOperationMutation({
    name: 'useCommentMutation',
    optimistic: async (params: CommentParams, queryClient) => {
      const { parentAuthor, parentPermlink, body } = params;
      const snapshot = await snapshotDiscussion(queryClient, params, cleanupRef);
      const reply = { username, reputation: params.reputation, parentAuthor, parentPermlink, body };
      const { updatedData, tempPermlink } = withOptimisticReply(snapshot.prevData, reply);
      queryClient.setQueryData<Discussion>(snapshot.queryKey, updatedData);
      logger.info('Optimistic comment added: %o', { tempPermlink, queryKey: snapshot.queryKey });
      // Shadow draft: insurance against a tab crash before Hivemind indexes the reply
      setStorageItem(shadowKey(params), { body, parentAuthor, parentPermlink }, StorageTTL.SHADOW_DRAFT);
      return snapshot;
    },
    run: ({ parentAuthor, parentPermlink, body, preferences }: CommentParams) =>
      transactionService.comment(parentAuthor, parentPermlink, body, preferences, BROADCAST_ONLY),
    onSuccess: (_data, params, queryClient) => {
      const { parentPermlink } = params;
      const isOwnReply = (e: Entry) => e.author === username && e.parent_permlink === parentPermlink;
      const prevData = queryClient.getQueryData<Discussion>(discussionKey(params));
      const prevRealCommentCount = Object.values(prevData ?? {}).filter(
        (e) => isOwnReply(e) && !e._optimistic
      ).length;
      // Validated refetch: a stale Hivemind response must not overwrite the optimistic reply
      cleanupRef.current = scheduleValidatedRefetch(
        queryClient,
        discussionKey(params),
        () => fetchDiscussion(params),
        (freshData) =>
          !!freshData && Object.values(freshData).filter(isOwnReply).length > prevRealCommentCount,
        undefined,
        { onValidated: () => removeStorageItem(shadowKey(params)) }
      );
    },
    rollback: (context, params, queryClient) => {
      if (!context) return;
      if (context.prevData) restoreDiscussion(queryClient, context);
      else queryClient.removeQueries({ queryKey: context.queryKey });
      removeStorageItem(shadowKey(params));
    },
    successToast: () => ({
      title: 'Comment posted successfully',
      description: 'Your comment has been posted successfully.'
    })
  });
}

export function useUpdateCommentMutation() {
  const { username } = useUserClient().user;
  const cleanupRef = useRef<(() => void) | null>(null);

  return useOperationMutation({
    name: 'useUpdateCommentMutation',
    optimistic: async (params: UpdateCommentParams, queryClient) => {
      const { permlink, body } = params;
      const snapshot = await snapshotDiscussion(queryClient, params, cleanupRef);
      updateDiscussion(queryClient, snapshot, (entries) =>
        entries.map(([key, post]) => [key, post.permlink === permlink ? { ...post, body } : post])
      );
      return snapshot;
    },
    run: ({ parentAuthor, parentPermlink, permlink, body }: UpdateCommentParams) =>
      transactionService.updateComment(parentAuthor, parentPermlink, permlink, body, BROADCAST_ONLY),
    onSuccess: (_data, params, queryClient) => {
      const { permlink, body } = params;
      cleanupRef.current = scheduleValidatedRefetch(
        queryClient,
        discussionKey(params),
        () => fetchDiscussion(params),
        (freshData) => {
          if (!freshData) return false;
          const comment = Object.values(freshData).find(
            (e) => e.permlink === permlink && e.author === username
          );
          return !!comment && comment.body === body;
        }
      );
    },
    rollback: (context, _params, queryClient) => restoreDiscussion(queryClient, context),
    successToast: () => ({
      title: 'Comment updated successfully',
      description: 'Your comment has been updated successfully.'
    }),
    invalidate: ({ permlink, observer }) => [['postData', username, permlink, observer]],
    invalidateDelays: [8000, 16000, 30000]
  });
}

export function useDeleteCommentMutation() {
  const cleanupRef = useRef<(() => void) | null>(null);

  return useOperationMutation({
    name: 'useDeleteCommentMutation',
    optimistic: async (params: DeleteCommentParams, queryClient) => {
      const snapshot = await snapshotDiscussion(queryClient, params, cleanupRef);
      updateDiscussion(queryClient, snapshot, (entries) =>
        entries.filter(([_, post]) => post.permlink !== params.permlink)
      );
      return snapshot;
    },
    run: ({ permlink }: DeleteCommentParams) => transactionService.deleteComment(permlink, BROADCAST_ONLY),
    onSuccess: (_data, params, queryClient) => {
      cleanupRef.current = scheduleValidatedRefetch(
        queryClient,
        discussionKey(params),
        () => fetchDiscussion(params),
        (freshData) => !!freshData && !Object.values(freshData).some((e) => e.permlink === params.permlink),
        [4000, 10000, 20000]
      );
    },
    rollback: (context, _params, queryClient) => restoreDiscussion(queryClient, context),
    successToast: () => ({
      title: 'Comment deleted successfully',
      description: 'Your comment has been deleted successfully.'
    })
  });
}
