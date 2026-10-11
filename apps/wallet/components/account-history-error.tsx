import { TFunction } from 'i18next';
import { Button } from '@ui/components';
import type { AccountHistoryFailure } from '@/wallet/lib/account-history-failure';

const FAILURE_MESSAGE_KEYS = {
  not_served: 'profile.account_history_not_served',
  unavailable: 'profile.account_history_unavailable',
  failed: 'profile.account_history_error'
} as const satisfies Record<AccountHistoryFailure, string>;

interface AccountHistoryErrorProps {
  onRetry: () => void;
  t: TFunction<'common_wallet', undefined>;
  failure?: AccountHistoryFailure;
}

const AccountHistoryError = ({ onRetry, t, failure = 'failed' }: AccountHistoryErrorProps) => {
  // Called without the click event, which a query's refetch would read as its options
  const handleRetry = () => onRetry();

  return (
    <div
      className="flex flex-col items-center gap-2 py-8 text-center"
      data-testid="wallet-account-history-error"
    >
      <span className="text-sm text-destructive">{t(FAILURE_MESSAGE_KEYS[failure])}</span>
      <Button variant="outlineRed" onClick={handleRetry} data-testid="wallet-account-history-retry">
        {t('global.retry')}
      </Button>
    </div>
  );
};

export default AccountHistoryError;
