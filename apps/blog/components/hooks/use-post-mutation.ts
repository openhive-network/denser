import { NaiAsset } from '@hiveio/wax';
import { useMutation } from '@tanstack/react-query';
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
        image
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
        { observe: true }
      );
      const response = { ...params, broadcastResult };
      logger.info('Done post transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('usePostMutation onSuccess data: %o', data);
    }
  });

  return postMutation;
}
