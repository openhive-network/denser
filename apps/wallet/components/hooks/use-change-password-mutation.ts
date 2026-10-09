import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { KeyAuthorityType } from '@smart-signer/lib/utils';

type ChangePasswordParams = {
  account: string;
  keys: Record<string, { old: string; new: string }>;
  wifs: Record<string, string>;
};

/** Re-imports the new keys of every key type the account keeps in safe storage. */
async function replaceStoredKeys({ account, keys, wifs }: ChangePasswordParams) {
  const registeredSafeStorageUser = await (
    await hbauthService.getOnlineClient()
  ).getRegisteredUserByUsername(account);
  for (const keyType in keys) {
    if (
      registeredSafeStorageUser?.registeredKeyTypes.includes(keyType as KeyAuthorityType) &&
      wifs[keyType]
    ) {
      await (
        await hbauthService.getOnlineClient()
      ).invalidateExistingKey(account, keyType as KeyAuthorityType);
      await (
        await hbauthService.getOnlineClient()
      ).importKey(account, wifs[keyType], keyType as KeyAuthorityType);
    }
  }
}

/** Makes change master password transaction. */
export const useChangePasswordMutation = () =>
  useOperationMutation({
    name: 'useChangePasswordMutation',
    run: async (params: ChangePasswordParams) => {
      const broadcastResult = await transactionService.changeMasterPassword(params.account, params.keys, {
        observe: true,
        singleSignKeyType: 'owner'
      });
      await replaceStoredKeys(params);
      return { account: params.account, broadcastResult };
    },
    successToast: () => ({
      title: 'Master password changed',
      description: 'Your master password has been changed successfully'
    }),
    reportErrors: false
  });
