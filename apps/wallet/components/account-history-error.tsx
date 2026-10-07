import { TFunction } from 'i18next';
import { Button } from '@ui/components';

interface AccountHistoryErrorProps {
  onRetry: () => void;
  t: TFunction<'common_wallet', undefined>;
}

const AccountHistoryError = ({ onRetry, t }: AccountHistoryErrorProps) => {
  // Called without the click event, which a query's refetch would read as its options
  const handleRetry = () => onRetry();

  return (
    <div
      className="flex flex-col items-center gap-2 py-8 text-center"
      data-testid="wallet-account-history-error"
    >
      <span className="text-sm text-destructive">{t('profile.account_history_error')}</span>
      <Button variant="outlineRed" onClick={handleRetry} data-testid="wallet-account-history-retry">
        {t('global.retry')}
      </Button>
    </div>
  );
};

export default AccountHistoryError;
