import { NaiAsset } from '@hiveio/wax';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Beneficiarie } from '@hive/common-hiveio-packages/wax';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/handle-error';
import { formatNaiAsset } from '@ui/lib/helpers';
import { scheduleInvalidations, scheduleValidatedRefetch } from '@/blog/lib/react-query';
import { getPost } from '@transaction/lib/bridge-api';
import { setStorageItem, removeStorageItem, StorageTTL } from '@ui/lib/storage-with-ttl';

const logger = getLogger('app');

/**
 * Makes post transaction.
 * Uses optimistic UI - post page is available immediately after broadcast.
 *
 * @export
 * @return {*}
 */
export function usePostMutation() {
  const queryClient = useQueryClient();
  const { user } = useUserClient();

  const postMutation = useMutation({
    // Seed cache with optimistic post data before broadcast
    onMutate: async (params: {
      permlink: string;
      title: string;
      body: string;
      reputation: number;
      tags: string[];
      category: string;
      summary: string;
      altAuthor: string;
      image?: string;
      editMode: boolean;
      beneficiaries: Beneficiarie[];
      maxAcceptedPayout: NaiAsset;
      percentHbd: number;
      rewardOptionsChanged?: boolean;
    }) => {
      const {
        permlink,
        title,
        body,
        tags,
        category,
        summary,
        reputation,
        image,
        editMode,
        beneficiaries,
        maxAcceptedPayout,
        percentHbd
      } = params;
      const username = user.username;

      // For new posts, seed the post data cache so the post page renders immediately
      if (!editMode) {
        // Convert NaiAsset to string format using wax helper (e.g., "1000000.000 HBD")
        const maxPayoutString = maxAcceptedPayout
          ? formatNaiAsset(maxAcceptedPayout)
          : '1000000.000 HBD';

        const optimisticPost = {
          author: username,
          permlink,
          title,
          body,
          category,
          tags,
          json_metadata: {
            tags,
            image: image ? [image] : [],
            description: summary,
            app: 'denser/0.1'
          },
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          active_votes: [],
          children: 0,
          author_reputation: reputation,
          pending_payout_value: '0.000 HBD',
          curator_payout_value: '0.000 HBD',
          author_payout_value: '0.000 HBD',
          payout: 0,
          payout_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_paidout: false,
          net_rshares: 0,
          url: `/${category}/@${username}/${permlink}`,
          // Use actual user-selected values for payout settings
          max_accepted_payout: maxPayoutString,
          beneficiaries: beneficiaries ?? [],
          percent_hbd: percentHbd ?? 10000,
          // Default values for other required fields
          blacklists: [],
          depth: 0,
          promoted: '0.000 HBD',
          replies: [],
          stats: {
            total_votes: 0,
            hide: false,
            gray: false,
            flag_weight: 0
          },
          _optimistic: true
        };

        // Seed the post data cache
        // Observer is username when logged in (required to post)
        queryClient.setQueryData(['postData', username, permlink, username], optimisticPost);

        // Save shadow draft — insurance against tab crash before Hivemind indexes
        setStorageItem(
          `shadow-post-${username}-${permlink}`,
          { title, body, tags, category, summary },
          StorageTTL.SHADOW_DRAFT
        );
      }

      return { username, permlink, editMode };
    },

    mutationFn: async (params: {
      permlink: string;
      title: string;
      body: string;
      tags: string[];
      category: string;
      summary: string;
      altAuthor: string;
      image?: string;
      editMode: boolean;
      beneficiaries: Beneficiarie[];
      maxAcceptedPayout: NaiAsset;
      percentHbd: number;
      rewardOptionsChanged?: boolean;
    }) => {
      const {
        permlink,
        title,
        body,
        beneficiaries,
        maxAcceptedPayout,
        tags,
        category,
        summary,
        altAuthor,
        percentHbd,
        image,
        editMode
      } = params;

      // Use observe: true - wait for block inclusion (~1.5s avg) before resolving.
      // This ensures the draft is not deleted until the transaction is confirmed on-chain.
      if (!editMode && !!maxAcceptedPayout) {
        const broadcastResult = await transactionService.post(
          permlink,
          title,
          body,
          beneficiaries,
          maxAcceptedPayout,
          tags,
          category,
          summary,
          altAuthor,
          percentHbd,
          image,
          { observe: true }
        );
        logger.info('Post broadcast successful: %o', { permlink, broadcastResult });
        return { ...params, broadcastResult };
      }
      if (editMode) {
        const broadcastResult = await transactionService.updatePost(
          permlink,
          title,
          body,
          tags,
          category,
          summary,
          altAuthor,
          image,
          { observe: true }
        );
        logger.info('Post update broadcast successful: %o', { permlink, broadcastResult });

        // If reward options were changed (made more restrictive), broadcast comment_options
        if (maxAcceptedPayout && params.rewardOptionsChanged) {
          const optionsResult = await transactionService.updatePostOptions(
            permlink,
            maxAcceptedPayout,
            percentHbd,
            { observe: true }
          );
          logger.info('Post options update broadcast successful: %o', { permlink, optionsResult });
        }

        return { ...params, broadcastResult };
      } else {
        throw new Error('maxAcceptedPayout is required for new posts');
      }
    },

    onSuccess: (data) => {
      const { permlink } = data;
      const { username } = user;
      toast({
        title: 'Post submitted successfully',
        description: 'Your post has been submitted',
        variant: 'success'
      });
      // Use validated refetch for post data to avoid overwriting optimistic cache
      // with stale Hivemind responses (Hivemind may not have indexed the post yet)
      scheduleValidatedRefetch(
        queryClient,
        ['postData', username, permlink, username],
        () => getPost(username, permlink, username),
        (freshData) => freshData != null && !freshData._optimistic,
        undefined,
        {
          onValidated: () => {
            removeStorageItem(`shadow-post-${username}-${permlink}`);
          }
        }
      );
      // Invalidate feed caches separately (no optimistic data to protect)
      scheduleInvalidations(queryClient, [['entriesInfinite'], ['accountEntriesInfinite']]);
    },

    onError: (error: unknown, variables, context) => {
      // Remove optimistic post data and shadow draft on error
      if (context && !variables.editMode) {
        queryClient.removeQueries({ queryKey: ['postData', context.username, context.permlink, context.username] });
        removeStorageItem(`shadow-post-${context.username}-${context.permlink}`);
      }
      handleError(error, {
        method: 'usePostMutation',
        params: variables
      });
    }
  });

  return postMutation;
}

/**
 * Makes delete comment transaction.
 *
 * @export
 * @return {*}
 */
export function useDeletePostMutation() {
  const { user } = useUserClient();
  const queryClient = useQueryClient();
  const deletePostMutation = useMutation({
    mutationFn: async (params: { permlink: string }) => {
      const { permlink } = params;
      const broadcastResult = await transactionService.deleteComment(permlink, { observe: false });
      const response = { ...params, broadcastResult };
      return response;
    },
    onSuccess: (data) => {
      const { permlink } = data;
      const { username } = user;
      toast({
        title: 'Post deleted successfully',
        description: 'Your post has been deleted',
        variant: 'success'
      });
      // Multiple invalidation attempts to handle slow operations
      scheduleInvalidations(queryClient, [
        ['postData', username, permlink, username],
        ['entriesInfinite']
      ]);
    },
    onError: (error: any, variables) => {
      handleError(error, {
        method: 'useDeletePostMutation',
        params: variables
      });
    }
  });

  return deletePostMutation;
}
