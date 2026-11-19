import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { KeyAuthorityType } from '@smart-signer/lib/utils';
import { getTabWif, rememberTabWif } from '@smart-signer/lib/signer/tab-credentials';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import type { PasswordChange } from '@/wallet/lib/change-password-keys';
import { needsWalletUpdate, keyChangeFollowUp } from '@/wallet/lib/account-keys';
import { useTranslation } from '@/wallet/i18n/client';
import { keyChangeFollowUpText } from '../key-change-follow-up';

/** Re-imports the new keys of every key type the account keeps in safe storage. */
function replaceStoredKeys({ account, wifs }: PasswordChange) {
  return hbauthService.withOnlineClient(async (client) => {
    const registered: readonly string[] = (await client.getRegisteredUserByUsername(account))?.registeredKeyTypes ?? [];
    for (const [keyType, wif] of Object.entries(wifs)) {
      if (!wif || !registered.includes(keyType)) continue;
      await client.invalidateExistingKey(account, keyType as KeyAuthorityType);
      await client.importKey(account, wif, keyType as KeyAuthorityType);
    }
  });
}

/** Keeps the new key of each role this tab kept the replaced key of, so a WIF session goes on signing. */
function replaceTabKeys({ account, wifs }: PasswordChange) {
  for (const role of ['posting', 'active'] as const) {
    const wif = wifs[role];
    if (wif && getTabWif(account, role) !== null) rememberTabWif(account, [role], wif);
  }
}

/** Makes change master password transaction. */
export const useChangePasswordMutation = () => {
  const { t } = useTranslation('common_wallet');
  const { loginType } = useUserClient().user;
  return useOperationMutation({
    name: 'useChangePasswordMutation',
    run: async (params: PasswordChange) => {
      const broadcastResult = await transactionService.changeMasterPassword(params.account, params.keys, {
        observe: true,
        singleSignKeyType: 'owner'
      });
      replaceTabKeys(params);
      await replaceStoredKeys(params);
      return { account: params.account, broadcastResult };
    },
    successToast: () => ({
      title: t('change_password_page.success.title'),
      description: needsWalletUpdate(keyChangeFollowUp(loginType))
        ? keyChangeFollowUpText(t, loginType)
        : t('change_password_page.success.description'),
      // Long enough to read what is left to do
      duration: needsWalletUpdate(keyChangeFollowUp(loginType)) ? 20_000 : undefined
    }),
    invalidate: (params) => [['authority', params.account], ['signingKeys']],
    reportErrors: false
  });
};
