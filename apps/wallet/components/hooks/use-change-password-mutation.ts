import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { toast } from '@ui/components/hooks/use-toast';
import { logger } from '@ui/lib/logger';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { KeyAuthorityType } from '@smart-signer/lib/utils';

/**
 * Makes change master password transaction.
 *
 * @export
 * @returns
 */
export function useChangePasswordMutation() {
  const { user } = useUser();
  const changePasswordMutation = useMutation({
    mutationFn: async (params: {
      account: string;
      keys: Record<string, { old: string; new: string }>;
      wifs: Record<string, string>;
    }) => {
      const broadcastResult = await transactionService.changeMasterPassword(params.account, params.keys, {
        observe: true,
        singleSignKeyType: 'owner'
      });
      const response = { ...params, broadcastResult };

      const registeredSafeStorageUser = await (
        await hbauthService.getOnlineClient()
      ).getRegisteredUserByUsername(params.account);

      for (const keyType in params.keys) {
        if (
          registeredSafeStorageUser?.registeredKeyTypes.includes(keyType as KeyAuthorityType) &&
          params.wifs[keyType]
        ) {
          await (
            await hbauthService.getOnlineClient()
          ).invalidateExistingKey(params.account, keyType as KeyAuthorityType);
          await (
            await hbauthService.getOnlineClient()
          ).importKey(params.account, params.wifs[keyType], keyType as KeyAuthorityType);
        }
      }

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
