import { NaiAsset } from '@hiveio/wax';
import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Beneficiarie } from '@transaction/lib/app-types';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/utils';
const logger = getLogger('app');

interface PostParams {
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
}

/**
 * Makes post transaction.
 *
 * @export
 * @return {*}
 */
export function usePostMutation() {
  const postMutation = useMutation({
    mutationFn: async (params: PostParams) => {
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

      await transactionService.post(
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
      );

      logger.info('Post: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('usePostMutation onSuccess data: %o', data);
    }
  });

  const post = async (params: PostParams) => {
    try {
      await postMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'post', ...params });
    }
  };

  return { post, postMutation };
}
