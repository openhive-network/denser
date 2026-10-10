import { useCallback, useMemo, useState } from 'react';
import { TFunction } from 'i18next';
import { Button } from '@ui/components';
import type { HiveOperation } from '@hive/common-hiveio-packages/wax';
import type { GetDynamicGlobalPropertiesResponse } from '@hiveio/wax';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { createWalletOperationsFormatter } from './wallet-operations-formatter';
import HistoryTableRow from './history-table-row';
import AccountHistoryError from '@/wallet/components/account-history-error';

type DynamicData = Pick<GetDynamicGlobalPropertiesResponse, 'total_vesting_fund_hive' | 'total_vesting_shares'>;

// Each row costs a format call and a TimeAgo: rendering the whole history in one commit blocks
// the main thread for seconds on mobile, so rows are rendered a page at a time.
const HISTORY_PAGE_SIZE = 50;

interface HistoryTableProps {
  historyList: HiveOperation[] | undefined;
  t: TFunction<'common_wallet', undefined>;
  username: string;
  dynamicData: DynamicData;
  hasOlder: boolean;
  isFetchingOlder: boolean;
  olderFailed: boolean;
  onLoadOlder: () => void;
  onRetry: () => void;
}

const HistoryTable = ({
  t,
  historyList = [],
  username,
  dynamicData,
  hasOlder,
  isFetchingOlder,
  olderFailed,
  onLoadOlder,
  onRetry
}: HistoryTableProps) => {
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE);
  const { user } = useUserClient();
  const isOwnAccount = user.isLoggedIn && user.username === username;

  const formatOperationDescription = useMemo(
    () => createWalletOperationsFormatter(username, dynamicData, t),
    [username, dynamicData, t]
  );

  // Rows already loaded are shown first; only when they run out is the next page requested.
  const showOlder = useCallback(() => {
    if (historyList.length > visibleCount) {
      setVisibleCount((count) => count + HISTORY_PAGE_SIZE);
      return;
    }
    setVisibleCount(historyList.length + HISTORY_PAGE_SIZE);
    onLoadOlder();
  }, [historyList.length, visibleCount, onLoadOlder]);

  const footer = (() => {
    if (isFetchingOlder) return <div className="p-2 text-center">{t('global.loading')}</div>;
    if (olderFailed) return <AccountHistoryError onRetry={onRetry} t={t} />;
    if (historyList.length <= visibleCount && !hasOlder) return null;
    return (
      <div className="flex justify-center p-2">
        <Button variant="outline" onClick={showOlder} data-testid="wallet-account-history-older">
          {t('profile.older')}
        </Button>
      </div>
    );
  })();

  if (historyList.length === 0)
    return (
      <>
        <div
          className="py-12 text-center text-3xl text-red-300"
          data-testid="wallet-account-history-no-transacions-found"
        >
          {t('profile.no_transactions_found')}
        </div>
        {footer}
      </>
    );

  return (
    <>
      <table className="w-full max-w-6xl p-2">
        <tbody>
          {historyList.slice(0, visibleCount).map(
            (element) =>
              element.op && (
                <HistoryTableRow
                  key={element.operation_id}
                  operation={element}
                  formatOperationDescription={formatOperationDescription}
                  username={username}
                  isOwnAccount={isOwnAccount}
                />
              )
          )}
        </tbody>
      </table>
      {footer}
    </>
  );
};

export default HistoryTable;
