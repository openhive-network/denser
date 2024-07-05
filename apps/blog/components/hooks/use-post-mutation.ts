import { NaiAsset } from '@hiveio/wax';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Beneficiarie } from '@transaction/lib/app-types';
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
