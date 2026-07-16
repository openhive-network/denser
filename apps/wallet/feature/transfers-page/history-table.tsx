'use client';

import React from 'react';
import { TFunction } from 'i18next';
import { Button } from '@ui/components';
import TimeAgo from '@hive/ui/components/time-ago';
import { HiveOperation } from '@hive/common-hiveio-packages/wax';
import { GetDynamicGlobalPropertiesResponse } from '@hiveio/wax';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import DecodeMemoDialog from '@/wallet/components/decode-memo-dialog';
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
  const { user } = useUserClient();
  const isOwnAccount = user.isLoggedIn && user.username === username;

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

  function renderMemo(memo: string | undefined) {
    if (!memo) return <td></td>;
    const isEncoded = /^#/.test(memo);
    if (!isEncoded) {
      return <td className="hidden break-all px-4 py-2 sm:block">{memo}</td>;
    }
    return (
      <td
        className="hidden break-all px-4 py-2 sm:block"
        data-testid="wallet-account-history-encoded-memo"
      >
        <span className="italic text-primary/50">{t('transfers_page.decode_memo_encrypted_placeholder')}</span>
        {isOwnAccount && (
          <div>
            <DecodeMemoDialog username={username} encodedMemo={memo} />
          </div>
        )}
      </td>
    );
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
                {renderMemo(element.op.value.memo)}
              </tr>
            )
        )}
      </tbody>
    </table>
  );
};

export default HistoryTable;
