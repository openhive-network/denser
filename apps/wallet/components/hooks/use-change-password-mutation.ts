import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { logger } from '@ui/lib/logger';

/**
 * Makes change master password transaction.
 *
 * @export
 * @returns
 */
export function useChangePasswordMutation() {
  const changePasswordMutation = useMutation({
    mutationFn: async (params: {
      account: string;
      newOwner: string;
      newActive: string;
      newPosting: string;
    }) => {
      const { account, newOwner, newActive, newPosting } = params;
      const broadcastResult = await transactionService.changeMasterPassword(
        account,
        newOwner,
        newActive,
        newPosting,
        { observe: true }
      );
      const response = { ...params, broadcastResult };
      logger.info('Done change master password transaction: %o', response);
    },
    onSuccess: (data) => {
      logger.info('useChangePasswordMutation onSuccess data: %o', data);
    }
  });

  return changePasswordMutation;
}