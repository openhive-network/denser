import { NaiAsset } from '@hiveio/wax';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Beneficiarie } from '@transaction/lib/app-types';
import { JsonMetadata } from '@transaction/lib/extended-hive.chain';
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
      editorType: 'denser' | 'classic';
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
        editMode,
        editorType
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
        editorType,
        image,
        { observe: true },
        editMode
      );
      const response = { ...params, broadcastResult };
      logger.info('Done post transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('usePostMutation onSuccess data: %o', data);
      const { permlink } = data;
      const { username } = user;
      queryClient.invalidateQueries({ queryKey: ['postData', username, permlink] });
      queryClient.invalidateQueries({ queryKey: ['entriesInfinite'] });
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
      logger.info('Done delete post transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { permlink } = data;
      const { username } = user;
      logger.info('useDeletePostMutation onSuccess data: %o', data);
      queryClient.invalidateQueries({ queryKey: ['postData', username, permlink] });
      queryClient.invalidateQueries({ queryKey: ['entriesInfinite'] });
    }
  });

  return deletePostMutation;
}
