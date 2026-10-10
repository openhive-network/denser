import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { createNaiAsset } from '@ui/lib/asset-constants';
import { formatAsset } from '@ui/lib/asset-format';
import { Button } from '@ui/components/button';
import Loading from '@ui/components/loading';
import { useTranslation } from '@/wallet/i18n/client';
import { getIncomingDelegations } from '@/wallet/lib/hive';
import { toIncomingDelegationRows, type IncomingDelegationChainState } from './lib/incoming-delegations';

dayjs.extend(localizedFormat);

const PAGE_SIZE = 25;

/**
 * HP delegations the account receives, paged; renders nothing when there are none and an inline
 * notice when the API node does not serve balance-api, so the rest of the page is unaffected.
 */
const IncomingDelegationsTable = ({
  account,
  dynamicData
}: {
  account: string;
  dynamicData: IncomingDelegationChainState;
}) => {
  const { t } = useTranslation('common_wallet');
  const [page, setPage] = useState(0);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['incomingDelegations', account],
    queryFn: () => getIncomingDelegations(account),
    // A node without balance-api answers 404 every time; getIncomingDelegations already retries transient failures.
    retry: false
  });
  const rows = useMemo(() => (data ? toIncomingDelegationRows(data, dynamicData) : []), [data, dynamicData]);

  if (isPending) return <Loading loading className="pt-4" />;
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2" data-testid="wallet-incoming-delegations-unavailable">
        <span className="text-sm text-destructive">{t('delegations_page.incoming_delegations_unavailable')}</span>
        <Button variant="outlineRed" size="sm" onClick={() => refetch()}>
          {t('global.retry')}
        </Button>
      </div>
    );
  }
  if (rows.length === 0) return null;

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col items-center gap-2" data-testid="wallet-incoming-delegations">
      <h2 className="text-lg font-bold underline">{t('delegations_page.incoming_delegations')}</h2>
      <table className="w-full">
        <tbody>
          {pageRows.map((row) => (
            <tr
              key={row.delegator}
              className="m-0 p-0 text-sm even:bg-slate-100 dark:even:bg-slate-700"
              data-testid="wallet-incoming-delegation-item"
            >
              <td className="px-1 py-2 sm:px-4">
                {formatAsset(createNaiAsset('HIVE', row.hiveSatoshis), { appendTokenName: false })} HP
              </td>
              <td className="px-1 py-2 sm:px-4">{row.delegator}</td>
              <td className="px-1 py-2 sm:px-4">
                {t('delegations_page.since')}{' '}
                <time dateTime={row.since.toISOString()}>{dayjs(row.since).format('ll')}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 ? (
        <div className="flex w-full items-center justify-between" data-testid="wallet-incoming-delegations-pagination">
          <Button variant="outlineRed" size="sm" onClick={() => setPage(page - 1)} disabled={page === 0}>
            {t('delegations_page.previous_page')}
          </Button>
          <span className="text-sm">{t('delegations_page.page_of', { page: page + 1, total: totalPages })}</span>
          <Button
            variant="outlineRed"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages - 1}
          >
            {t('delegations_page.next_page')}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default IncomingDelegationsTable;
