import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import { useTranslation } from '@/wallet/i18n/client';

export function useUndelegateMutation() {
  const { username } = useUserClient().user;
  const { t } = useTranslation('common_wallet');
  return useOperationMutation({
    name: 'useUndelegateMutation',
    run: (toAccount: string) =>
      transactionService.undelegateRC(username, toAccount, { observe: true, requiredKeyType: 'posting' }),
    successToast: (_data, toAccount) => ({
      description: t('delegations_page.revoke_rc_success', { account: toAccount })
    }),
    invalidate: () => [
      ['resourceCredits', username],
      ['manabar', username]
    ],
    reportErrors: false
  });
}
