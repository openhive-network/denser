import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { toast } from '@ui/components/hooks/use-toast';
import { logger } from '@ui/lib/logger';

/**
 * Makes change master password transaction.
 *
 * @export
 * @returns
 */
export function useChangePasswordMutation() {
  const changePasswordMutation = useMutation({
    mutationFn: async (params: { account: string; keys: Record<string, { old: string; new: string }> }) => {
      const broadcastResult = await transactionService.changeMasterPassword(params.account, params.keys, {
        observe: true,
        singleSignKeyType: 'owner'
      });
      const response = { ...params, broadcastResult };
      toast({
        title: 'Master password changed',
        description: 'Your master password has been changed successfully',
        variant: 'success'
      });
      logger.info('Done change master password transaction: %o', response);
    },
    onSuccess: (data: unknown) => {
      logger.info('useChangePasswordMutation onSuccess data: %o', data);
    }
  });

  return changePasswordMutation;
}
