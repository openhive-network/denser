import React from 'react';
import { TFunction } from 'i18next';
import { Button } from '@ui/components';
import TimeAgo from '@hive/ui/components/time-ago';
import { HiveOperation } from '@hive/common-hiveio-packages/wax';
import { GetDynamicGlobalPropertiesResponse } from '@hiveio/wax';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { createWalletOperationsFormatter } from './wallet-operations-formatter';

type DynamicData = Pick<GetDynamicGlobalPropertiesResponse, 'total_vesting_fund_hive' | 'total_vesting_shares'>;

interface HistoryTableProps {
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  historyList: HiveOperation[] | undefined;
  t: TFunction<'common_wallet', undefined>;
  username: string;
  dynamicData: DynamicData;
}

const HistoryTable = ({
  t,
  isLoading,
  isError,
  onRetry,
  historyList = [],
  username,
  dynamicData
}: HistoryTableProps) => {
  if (isLoading) return <div>{t('global.loading')}</div>;
  if (isError)
    return (
      <div
        className="flex flex-col items-center gap-4 py-12"
        data-testid="wallet-account-history-error"
      >
        <div className="text-center text-lg text-destructive">{t('profile.account_history_error')}</div>
        <Button variant="outlineRed" onClick={onRetry}>
          {t('global.retry')}
        </Button>
      </div>
    );
  if (historyList.length === 0)
    return (
      <div
        className="py-12 text-center text-3xl text-red-300"
        data-testid="wallet-account-history-no-transacions-found"
      >
        {t('profile.no_transactions_found')}
      </div>
    );

  const hiveChain = hiveChainService.reuseHiveChain();
  if (!hiveChain) return <></>;

  const FormatterClass = createWalletOperationsFormatter(username, dynamicData, t, hiveChain);
  const extendedFormatter = hiveChain.formatter.extend(FormatterClass);

  function formatOperationDescription(operation: HiveOperation): React.ReactNode {
    const formatted = extendedFormatter.format(operation);
    return React.isValidElement(formatted?.op?.value) ? formatted.op.value : <div>error</div>;
  }

  return (
    <table className="w-full max-w-6xl p-2">
      <tbody>
        {[...historyList].map(
          (element) =>
            element.op && (
              <tr
                key={element.operation_id}
                className="m-0 w-full p-0 text-xs even:bg-background-tertiary sm:text-sm"
                data-testid="wallet-account-history-row"
              >
                <td className="px-4 py-2 sm:min-w-[150px]">
                  <TimeAgo date={element.timestamp} />
                </td>
                <td className="px-4 py-2 sm:min-w-[300px]">
                  {formatOperationDescription(element)}
                </td>
                {element.op.value.memo ? (
                  <td className="hidden break-all px-4 py-2 sm:block">{element.op.value.memo}</td>
                ) : (
                  <td></td>
                )}
              </tr>
            )
        )}
      </tbody>
    </table>
  );
};

export default HistoryTable;
