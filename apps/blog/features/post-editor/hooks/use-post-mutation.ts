import { NaiAsset } from '@hiveio/wax';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Beneficiarie } from '@transaction/lib/app-types';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/**
 * Makes post transaction.
 *
 * @export
 * @return {*}
 */
export function usePostMutation() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const postMutation = useMutation({
    mutationFn: async (params: {
      permlink: string;
      title: string;
      body: string;
      beneficiaries: Beneficiarie[];
      maxAcceptedPayout: NaiAsset;
      tags: string[];
      category: string;
      summary: string;
      altAuthor: string;
      payoutType: string;
      image?: string;
      editMode: boolean;
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
        payoutType,
        image,
        editMode
      } = params;
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
        payoutType,
        image,
        { observe: true },
        editMode
      );
      const response = { ...params, broadcastResult };
      return response;
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
  const { user } = useUser();
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
    }
  });

  return deletePostMutation;
}
