import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Preferences, Entry } from '@hive/common-hiveio-packages/wax';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/handle-error';
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

  const commentMutation = useMutation({
    // Optimistic update BEFORE broadcast
    onMutate: async (params: {
      parentAuthor: string;
      parentPermlink: string;
      body: string;
      reputation: number;
      preferences: Preferences;
      discussionPermlink: string;
    }) => {
      const { parentAuthor, parentPermlink, body, discussionPermlink } = params;
      const queryKey = ['discussionData', discussionPermlink];

      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous data for rollback
      const prevData: Record<string, Entry> | undefined = queryClient.getQueryData(queryKey);

      if (prevData) {
        // Find parent post for context
        const parentPost = Object.values(prevData).find(
          (post) => post.author === parentAuthor && post.permlink === parentPermlink
        );

        // Generate temporary permlink for optimistic comment
        const tempPermlink = `re-${parentAuthor}-${Date.now()}`;

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
          depth: (parentPost?.depth ?? 0) + 1,
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
          post_id: (parentPost?.post_id ?? 0) + 1,
          promoted: '',
          replies: [],
          title: `Re: ${parentPost?.title ?? 'No title'}`,
          updated: new Date().toISOString(),
          url: `/${parentPost?.category ?? ''}/@${user.username}/${tempPermlink}`,
          _optimistic: true
        };

        // Update parent's children count
        const updatedData: Record<string, Entry> = {};
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

        // Add the new comment
        updatedData[tempPermlink] = newComment as Entry;

        // Update cache immediately
        queryClient.setQueryData<Record<string, Entry>>(queryKey, updatedData);
      }

      // Return context for rollback
      return { prevData, queryKey };
    },

    mutationFn: async (params: {
      parentAuthor: string;
      parentPermlink: string;
      body: string;
      preferences: Preferences;
      discussionPermlink: string;
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
      const { discussionPermlink } = data;
      const queryKey = ['discussionData', discussionPermlink];

      logger.info('useCommentMutation onSuccess data: %o', data);
      toast({
        title: 'Comment posted successfully',
        description: 'Your comment has been posted successfully.',
        variant: 'success'
      });

      // Invalidate after delay to fetch real data from Hivemind
      // Block time is ~3 seconds, but Hivemind indexing can take up to 8 seconds
      // Use 8 seconds to ensure the comment is indexed before we refetch
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 8000);
    },

    onError: (error: unknown, variables, context) => {
      // Rollback to previous data on error
      if (context?.prevData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.prevData);
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
  const updateCommentMutation = useMutation({
    mutationFn: async (params: {
      parentAuthor: string;
      parentPermlink: string;
      permlink: string;
      body: string;
      discussionPermlink: string;
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
      const prevData: Record<string, Entry> | undefined = queryClient.getQueryData([
        'discussionData',
        discussionPermlink
      ]);

      const response = { ...params, broadcastResult, prevData };

      logger.info('Done update comment transaction: %o', response);
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { permlink, discussionPermlink, prevData } = data;
      if (!!prevData) {
        const list = [...Object.keys(prevData).map((key) => prevData[key])];
        const newList = list.map((post) => {
          if (post.permlink === permlink) {
            return { ...post, body: data.body };
          }
          return post;
        });
        const newData: Record<string, Entry> = Object.fromEntries(
          newList.map((post) => [post.permlink, post])
        );
        queryClient.setQueryData<Record<string, Entry>>(['discussionData', discussionPermlink], () => {
          return newData;
        });
      }
    },
    onSuccess: (data) => {
      const { username } = user;
      const { permlink, discussionPermlink } = data;
      logger.info('useUpdateCommentMutation onSuccess data: %o', data);
      toast({
        title: 'Comment updated successfully',
        description: 'Your comment has been updated successfully.',
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['discussionData', discussionPermlink] });
        queryClient.invalidateQueries({ queryKey: ['postData', username, permlink] });
      }, 8000);
    },
    onError: (error: any, variables) => {
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
  const deleteCommentMutation = useMutation({
    mutationFn: async (params: { permlink: string; discussionPermlink: string }) => {
      const { permlink, discussionPermlink } = params;
      const broadcastResult = await transactionService.deleteComment(permlink, { observe: false });
      const prevData: Record<string, Entry> | undefined = queryClient.getQueryData([
        'discussionData',
        discussionPermlink
      ]);
      const response = { ...params, broadcastResult, prevData };
      logger.info('Done delete comment transaction: %o', response);
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { discussionPermlink, prevData } = data;
      if (!!prevData) {
        const list = [...Object.keys(prevData).map((key) => prevData[key])];
        const newList = list.filter((post) => post.permlink !== data.permlink);
        const newData: Record<string, Entry> = Object.fromEntries(
          newList.map((post) => [post.permlink, post])
        );

        queryClient.setQueryData<Record<string, Entry>>(['discussionData', discussionPermlink], () => {
          return newData;
        });
      }
    },
    onSuccess: (data) => {
      const { discussionPermlink } = data;
      logger.info('useDeleteCommentMutation onSuccess data: %o', data);
      toast({
        title: 'Comment deleted successfully',
        description: 'Your comment has been deleted successfully.',
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['discussionData', discussionPermlink] });
      }, 4000);
    },
    onError: (error: any, variables) => {
      handleError(error, {
        method: 'useDeleteCommentMutation',
        params: variables
      });
    }
  });

  return deleteCommentMutation;
}
