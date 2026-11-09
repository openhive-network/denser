import { ApiAccount } from '@hiveio/wax';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import { useTranslation } from '@/wallet/i18n/client';
import { ACCOUNT_HISTORY_REFRESH_DELAYS } from '@/wallet/lib/constants';

export function useClaimRewardsMutation() {
  const { username } = useUserClient().user;
  const { t } = useTranslation('common_wallet');
  return useOperationMutation({
    name: 'useClaimRewardsMutation',
    run: ({ account }: { account: ApiAccount }) =>
      transactionService.claimRewards(account, { observe: true, requiredKeyType: 'posting' }),
    successToast: () => ({
      title: t('transfers_page.transaction_success'),
      description: t('transfers_page.redeem_rewards')
    }),
    invalidate: () => [
      ['profileData', username],
      ['accountData', username],
      ['accountHistory', username]
    ],
    invalidateDelays: ACCOUNT_HISTORY_REFRESH_DELAYS,
    reportErrors: false
  });
}
