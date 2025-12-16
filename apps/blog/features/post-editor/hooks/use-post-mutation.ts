import { NaiAsset } from '@hiveio/wax';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Beneficiarie } from '@transaction/lib/app-types';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/handle-error';

const logger = getLogger('app');

/**
 * Makes post transaction.
 *
 * @export
 * @return {*}
 */
export function usePostMutation() {
  const queryClient = useQueryClient();
  const { user } = useUserClient();
  const postMutation = useMutation({
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
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['postData', username, permlink] });
        queryClient.invalidateQueries({ queryKey: ['entriesInfinite'] });
        queryClient.invalidateQueries({ queryKey: ['accountEntriesInfinite'] });
      }, 4000);
    },
    onError: (error: any, variables) => {
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
      const broadcastResult = await transactionService.deleteComment(permlink, { observe: true });
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
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['postData', username, permlink] });
        queryClient.invalidateQueries({ queryKey: ['entriesInfinite'] });
      }, 4000);
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
