import { TFunction } from 'i18next';
import TimeAgo from '@hive/ui/components/time-ago';
import { HiveOperation } from '@transaction/lib/extended-hive.chain';

interface HistoryTableProps {
  isLoading: boolean;
  historyList: HiveOperation[] | undefined;
  historyItemDescription: (operation: HiveOperation) => JSX.Element;
  t: TFunction<'common_wallet', undefined>;
}

const HistoryTable = ({ t, isLoading, historyList = [], historyItemDescription }: HistoryTableProps) => {
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
                <td className="px-4 py-2 sm:min-w-[300px]">{historyItemDescription(element)}</td>
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
