import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import { useTranslation } from '@/wallet/i18n/client';
import { rawRcToBillions } from '../lib/rc-amount';
import { formatRcSummary } from '../lib/rc-display';

export function useDelegateRCMutation() {
  const { username } = useUserClient().user;
  const { t, i18n } = useTranslation('common_wallet');
  return useOperationMutation({
    name: 'useDelegateRCMutation',
    run: ({ toAccount, amount }: { toAccount: string; amount: string }) =>
      transactionService.delegateRC(username, amount, toAccount, {
        observe: true,
        requiredKeyType: 'posting'
      }),
    successToast: (_data, { amount, toAccount }) => ({
      description: t('transfers_page.delegate_rc.success', {
        amount: formatRcSummary(rawRcToBillions(amount), i18n.language),
        account: toAccount
      })
    }),
    invalidate: () => [
      ['manabar', username],
      ['rcDirectDelegation', username]
    ],
    reportErrors: false
  });
}
