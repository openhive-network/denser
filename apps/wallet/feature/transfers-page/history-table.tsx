import React, { useCallback, useMemo, useState } from 'react';
import { TFunction } from 'i18next';
import { Button } from '@ui/components';
import { HiveOperation } from '@hive/common-hiveio-packages/wax';
import { GetDynamicGlobalPropertiesResponse } from '@hiveio/wax';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { createWalletOperationsFormatter } from './wallet-operations-formatter';
import HistoryTableRow from './history-table-row';

type DynamicData = Pick<GetDynamicGlobalPropertiesResponse, 'total_vesting_fund_hive' | 'total_vesting_shares'>;

// Each row costs a wax format call and a TimeAgo: rendering the whole history in one commit blocks
// the main thread for seconds on mobile, so rows are rendered a page at a time.
const HISTORY_PAGE_SIZE = 50;

interface HistoryTableProps {
  isLoading: boolean;
  historyList: HiveOperation[] | undefined;
  t: TFunction<'common_wallet', undefined>;
  username: string;
  dynamicData: DynamicData;
}

const HistoryTable = ({
  t,
  isLoading,
  historyList = [],
  username,
  dynamicData
}: HistoryTableProps) => {
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE);
  const hiveChain = hiveChainService.reuseHiveChain();

  const formatOperationDescription = useMemo(() => {
    if (!hiveChain) return null;
    const FormatterClass = createWalletOperationsFormatter(username, dynamicData, t, hiveChain);
    const extendedFormatter = hiveChain.formatter.extend(FormatterClass);

    return (operation: HiveOperation): React.ReactNode => {
      const formatted = extendedFormatter.format(operation);
      return React.isValidElement(formatted?.op?.value) ? formatted.op.value : <div>error</div>;
    };
  }, [hiveChain, username, dynamicData, t]);

  const showMore = useCallback(() => setVisibleCount((count) => count + HISTORY_PAGE_SIZE), []);

  if (isLoading) return <div>{t('global.loading')}</div>;
  if (historyList.length === 0)
    return (
      <div
        className="py-12 text-center text-3xl text-red-300"
        data-testid="wallet-account-history-no-transacions-found"
      >
        {t('profile.no_transactions_found')}
      </div>
    );

  if (!formatOperationDescription) return <></>;

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
                />
              )
          )}
        </tbody>
      </table>
      {historyList.length > visibleCount && (
        <div className="flex justify-center p-2">
          <Button variant="outline" onClick={showMore} data-testid="wallet-account-history-show-more">
            {t('profile.show_more_transactions')}
          </Button>
        </div>
      )}
    </>
  );
};

export default HistoryTable;
