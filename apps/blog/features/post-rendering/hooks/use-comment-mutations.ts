import { useRef } from 'react';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getDiscussion } from '@transaction/lib/bridge-api';
import { Preferences, Entry } from '@hive/common-hiveio-packages/wax';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/handle-error';
import { scheduleInvalidations, scheduleValidatedRefetch } from '@/blog/lib/react-query';
import { setStorageItem, removeStorageItem, StorageTTL } from '@ui/lib/storage-with-ttl';

const logger = getLogger('app');

/**
 * Makes comment transaction.
 * Uses optimistic UI - comment appears immediately with full interactivity.
 *
 * @export
 * @return {*}
 */
export function useCommentMutation() {
  const queryClient = useQueryClient();
  const { user } = useUserClient();
  const cleanupRef = useRef<(() => void) | null>(null);

  const commentMutation = useMutation({
    // Optimistic update BEFORE broadcast
    onMutate: async (params: {
      parentAuthor: string;
      parentPermlink: string;
      body: string;
      reputation: number;
      preferences: Preferences;
      discussionAuthor: string;
      discussionPermlink: string;
      observer: string;
    }) => {
      const { parentAuthor, parentPermlink, body, discussionAuthor, discussionPermlink, observer } = params;
      const queryKey = ['discussionData', discussionAuthor, discussionPermlink, observer];

      // Cancel previous validated refetch schedule
      cleanupRef.current?.();
      cleanupRef.current = null;

      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous data for rollback
      const prevData: Record<string, Entry> | undefined = queryClient.getQueryData(queryKey);

      // Generate temporary permlink for optimistic comment
      const tempPermlink = `re-${parentAuthor}-${Date.now()}`;

      // Find parent post for context (could be in discussionData or could be the main post)
      const parentPost = prevData
        ? Object.values(prevData).find(
            (post) => post.author === parentAuthor && post.permlink === parentPermlink
          )
        : undefined;

      // For replies to the main post, parent won't be in discussionData
      // Use discussionAuthor/discussionPermlink to infer if we're replying to the main post
      const isReplyToMainPost = parentAuthor === discussionAuthor && parentPermlink === discussionPermlink;
      const parentDepth = parentPost?.depth ?? (isReplyToMainPost ? 0 : 0);

      // Create optimistic comment with _optimistic flag (allows full interactivity)
      const newComment = {
        active_votes: [],
        author: user.username,
        author_payout_value: '0.000 HBD',
        author_reputation: params.reputation,
        beneficiaries: [],
        blacklists: [],
        body: body,
        parent_author: parentAuthor,
        parent_permlink: parentPermlink,
        category: parentPost?.category ?? '',
        children: 0,
        created: new Date().toISOString(),
        curator_payout_value: '0.000 HBD',
        depth: parentDepth + 1,
        is_paidout: false,
        json_metadata: {
          images: [],
          author: user.username,
          image: ''
        },
        max_accepted_payout: '1000000.000 HBD',
        net_rshares: 0,
        payout: 0,
        payout_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        pending_payout_value: '0.000 HBD',
        percent_hbd: 10000,
        permlink: tempPermlink,
        post_id: Date.now(), // Use timestamp for unique ID
        promoted: '',
        replies: [],
        stats: { hide: false, gray: false, total_votes: 0, flag_weight: 0 },
        title: `Re: ${parentPost?.title ?? 'No title'}`,
        updated: new Date().toISOString(),
        url: `/${parentPost?.category ?? ''}/@${user.username}/${tempPermlink}`,
        _optimistic: true
      };

      // Build updated data - start with previous data or empty object
      const updatedData: Record<string, Entry> = {};

      if (prevData) {
        // Copy existing data, updating parent's children count if found
        for (const [key, post] of Object.entries(prevData)) {
          if (post.permlink === parentPermlink && post.author === parentAuthor) {
            updatedData[key] = {
              ...post,
              children: (post.children || 0) + 1,
              replies: [...(post.replies || []), tempPermlink]
            };
          } else {
            updatedData[key] = post;
          }
        }
      }

      // Add the new comment
      updatedData[tempPermlink] = newComment as Entry;

      // Update cache immediately - this triggers React Query subscribers to re-render
      queryClient.setQueryData<Record<string, Entry>>(queryKey, updatedData);

      logger.info('Optimistic comment added: %o', { tempPermlink, queryKey, hasPrevData: !!prevData });

      // Save shadow draft — insurance against tab crash before Hivemind indexes
      const shadowKey = `shadow-reply-${user.username}-${parentAuthor}-${parentPermlink}`;
      setStorageItem(shadowKey, { body, parentAuthor, parentPermlink }, StorageTTL.SHADOW_DRAFT);

      // Return context for rollback
      return { prevData, queryKey, shadowKey };
    },

    mutationFn: async (params: {
      parentAuthor: string;
      parentPermlink: string;
      body: string;
      preferences: Preferences;
      discussionAuthor: string;
      discussionPermlink: string;
      observer: string;
    }) => {
      const { parentAuthor, parentPermlink, body, preferences, discussionPermlink } = params;

      // Broadcast without waiting for blockchain confirmation
      // A successful broadcast guarantees inclusion in the blockchain
      const broadcastResult = await transactionService.comment(
        parentAuthor,
        parentPermlink,
        body,
        preferences,
        { observe: false }
      );

      logger.info('Comment broadcast successful: %o', { discussionPermlink, broadcastResult });
      return { ...params, broadcastResult };
    },

    onSuccess: (data) => {
      const { parentPermlink, discussionAuthor, discussionPermlink, observer } = data;
      const username = user.username;

      logger.info('useCommentMutation onSuccess data: %o', data);
      toast({
        title: 'Comment posted successfully',
        description: 'Your comment has been posted successfully.',
        variant: 'success'
      });

      // Discussion data has optimistic comment - use validated refetch to avoid
      // overwriting optimistic data with stale API responses from Hivemind
      const queryKey = ['discussionData', discussionAuthor, discussionPermlink, observer];
      const prevData: Record<string, Entry> | undefined = queryClient.getQueryData(queryKey);
      const prevRealCommentCount = prevData
        ? Object.values(prevData).filter(
            (e) => e.author === username && e.parent_permlink === parentPermlink && !e._optimistic
          ).length
        : 0;

      cleanupRef.current = scheduleValidatedRefetch(
        queryClient,
        queryKey,
        () => getDiscussion(discussionAuthor, discussionPermlink, observer),
        (freshData) => {
          if (!freshData) return false;
          const realComments = Object.values(freshData).filter(
            (e) => e.author === username && e.parent_permlink === parentPermlink
          );
          return realComments.length > prevRealCommentCount;
        },
        undefined,
        {
          onValidated: () => {
            removeStorageItem(`shadow-reply-${username}-${data.parentAuthor}-${parentPermlink}`);
          }
        }
      );
    },

    onError: (error: unknown, variables, context) => {
      // Rollback to previous data and remove shadow draft on error
      if (context?.queryKey) {
        if (context.prevData) {
          queryClient.setQueryData(context.queryKey, context.prevData);
        } else {
          queryClient.removeQueries({ queryKey: context.queryKey });
        }
      }
      if (context?.shadowKey) {
        removeStorageItem(context.shadowKey);
      }

      handleError(error, {
        method: 'useCommentMutation',
        params: variables
      });
    }
  });

  return commentMutation;
}

/**
 * Makes update comment transaction.
 *
 * @export
 * @return {*}
 */
export function useUpdateCommentMutation() {
  const queryClient = useQueryClient();
  const { user } = useUserClient();
  const cleanupRef = useRef<(() => void) | null>(null);

  const updateCommentMutation = useMutation({
    // Optimistic update BEFORE broadcast - prevents stale refetches from overwriting
    onMutate: async (params: {
      parentAuthor: string;
      parentPermlink: string;
      permlink: string;
      body: string;
      discussionAuthor: string;
      discussionPermlink: string;
      observer: string;
    }) => {
      const { permlink, body, discussionAuthor, discussionPermlink, observer } = params;
      const queryKey = ['discussionData', discussionAuthor, discussionPermlink, observer];

      // Cancel previous validated refetch schedule
      cleanupRef.current?.();
      cleanupRef.current = null;

      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous data for rollback
      const prevData: Record<string, Entry> | undefined = queryClient.getQueryData(queryKey);

      // Optimistically update the comment body
      if (prevData) {
        const newData: Record<string, Entry> = Object.fromEntries(
          Object.entries(prevData).map(([key, post]) => [
            key,
            post.permlink === permlink ? { ...post, body } : post
          ])
        );
        queryClient.setQueryData<Record<string, Entry>>(queryKey, newData);
      }

      return { prevData, queryKey };
    },

    mutationFn: async (params: {
      parentAuthor: string;
      parentPermlink: string;
      permlink: string;
      body: string;
      discussionAuthor: string;
      discussionPermlink: string;
      observer: string;
    }) => {
      const { parentAuthor, parentPermlink, permlink, body, discussionPermlink } = params;
      const broadcastResult = await transactionService.updateComment(
        parentAuthor,
        parentPermlink,
        permlink,
        body,
        {
          observe: false
        }
      );

      logger.info('Done update comment transaction: %o', { discussionPermlink, broadcastResult });
      return { ...params, broadcastResult };
    },

    onSuccess: (data) => {
      const { username } = user;
      const { permlink, body, discussionAuthor, discussionPermlink, observer } = data;
      logger.info('useUpdateCommentMutation onSuccess data: %o', data);
      toast({
        title: 'Comment updated successfully',
        description: 'Your comment has been updated successfully.',
        variant: 'success'
      });

      // Discussion data has optimistic edit - use validated refetch to avoid
      // overwriting optimistic data with stale API responses from Hivemind
      cleanupRef.current = scheduleValidatedRefetch(
        queryClient,
        ['discussionData', discussionAuthor, discussionPermlink, observer],
        () => getDiscussion(discussionAuthor, discussionPermlink, observer),
        (freshData) => {
          if (!freshData) return false;
          const comment = Object.values(freshData).find(
            (e) => e.permlink === permlink && e.author === username
          );
          return !!comment && comment.body === body;
        }
      );

      // postData doesn't have optimistic data from this mutation
      scheduleInvalidations(queryClient, [['postData', username, permlink, observer]]);
    },

    onError: (error: unknown, variables, context) => {
      // Rollback to previous data on error
      if (context?.queryKey) {
        if (context.prevData) {
          queryClient.setQueryData(context.queryKey, context.prevData);
        }
      }

      handleError(error, {
        method: 'useUpdateCommentMutation',
        params: variables
      });
    }
  });

  return updateCommentMutation;
}

/**
 * Makes delete comment transaction.
 *
 * @export
 * @return {*}
 */
export function useDeleteCommentMutation() {
  const queryClient = useQueryClient();
  const cleanupRef = useRef<(() => void) | null>(null);

  const deleteCommentMutation = useMutation({
    // Optimistic update BEFORE broadcast - prevents stale refetches from overwriting
    onMutate: async (params: {
      permlink: string;
      discussionAuthor: string;
      discussionPermlink: string;
      observer: string;
    }) => {
      const { permlink, discussionAuthor, discussionPermlink, observer } = params;
      const queryKey = ['discussionData', discussionAuthor, discussionPermlink, observer];

      // Cancel previous validated refetch schedule
      cleanupRef.current?.();
      cleanupRef.current = null;

      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous data for rollback
      const prevData: Record<string, Entry> | undefined = queryClient.getQueryData(queryKey);

      // Optimistically remove the comment
      if (prevData) {
        const newData: Record<string, Entry> = Object.fromEntries(
          Object.entries(prevData).filter(([_, post]) => post.permlink !== permlink)
        );
        queryClient.setQueryData<Record<string, Entry>>(queryKey, newData);
      }

      return { prevData, queryKey };
    },

    mutationFn: async (params: {
      permlink: string;
      discussionAuthor: string;
      discussionPermlink: string;
      observer: string;
    }) => {
      const { permlink, discussionPermlink } = params;
      const broadcastResult = await transactionService.deleteComment(permlink, { observe: false });
      logger.info('Done delete comment transaction: %o', { discussionPermlink, broadcastResult });
      return { ...params, broadcastResult };
    },

    onSuccess: (data) => {
      const { permlink, discussionAuthor, discussionPermlink, observer } = data;
      logger.info('useDeleteCommentMutation onSuccess data: %o', data);
      toast({
        title: 'Comment deleted successfully',
        description: 'Your comment has been deleted successfully.',
        variant: 'success'
      });

      // Discussion data has optimistic deletion - use validated refetch to avoid
      // overwriting optimistic data with stale API responses from Hivemind
      cleanupRef.current = scheduleValidatedRefetch(
        queryClient,
        ['discussionData', discussionAuthor, discussionPermlink, observer],
        () => getDiscussion(discussionAuthor, discussionPermlink, observer),
        (freshData) => {
          if (!freshData) return false;
          return !Object.values(freshData).some((e) => e.permlink === permlink);
        },
        [4000, 10000, 20000]
      );
    },

    onError: (error: unknown, variables, context) => {
      // Rollback to previous data on error
      if (context?.queryKey) {
        if (context.prevData) {
          queryClient.setQueryData(context.queryKey, context.prevData);
        }
      }

      handleError(error, {
        method: 'useDeleteCommentMutation',
        params: variables
      });
    }
  });

  return deleteCommentMutation;
}
