'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from '@/wallet/i18n/client';
import type { GetDynamicGlobalPropertiesResponse } from '@hiveio/wax';
import type { HiveOperation } from '@hive/common-hiveio-packages/wax';
import TransfersHistoryFilter, { TransferFilters } from '@/wallet/components/transfers-history-filter';
import useFilters from '@/wallet/components/hooks/use-filters';
import { getFilter } from '@/wallet/lib/utils';
import { getHiddenTransferReason, type HiddenTransferReason } from '@/wallet/lib/scam-transfer-filter';
import { IAccountHistory } from './hooks/use-account-history';
import { useHiddenSenders } from './hooks/use-hidden-senders';
import HistoryTable from './history-table';
import HiddenTransfersNotice from './hidden-transfers-notice';
import AccountHistoryError from '@/wallet/components/account-history-error';

const initialFilters: TransferFilters = {
  search: '',
  others: false,
  incoming: false,
  outcoming: false,
  exlude: false
};

type DynamicData = Pick<GetDynamicGlobalPropertiesResponse, 'total_vesting_fund_hive' | 'total_vesting_shares'>;

interface AccountHistoryProps {
  username: string;
  dynamicData: DynamicData;
  history: IAccountHistory;
}

const AccountHistory = ({ username, dynamicData, history }: AccountHistoryProps) => {
  const { t } = useTranslation('common_wallet');
  const [rawFilter, filter, setFilter] = useFilters(initialFilters);
  const { operations, isLoading, isError, hasOlder, isFetchingOlder, loadOlder, retry } = history;

  const hiddenSenders = useHiddenSenders();
  const [hiddenTransfersShown, setHiddenTransfersShown] = useState(false);
  const showHiddenTransfers = useCallback(() => setHiddenTransfersShown(true), []);

  const filteredHistoryList = useMemo(
    () => operations?.filter(getFilter({ filter, username })),
    [operations, filter, username]
  );
  const { hiddenTransfers, hiddenCounts } = useMemo(() => {
    const transfers = new Set<HiveOperation>();
    const counts: Record<HiddenTransferReason, number> = { badActor: 0, muted: 0 };
    filteredHistoryList?.forEach((operation) => {
      const reason = getHiddenTransferReason(operation, username, hiddenSenders);
      if (!reason) return;
      transfers.add(operation);
      counts[reason] += 1;
    });
    return { hiddenTransfers: transfers, hiddenCounts: counts };
  }, [filteredHistoryList, username, hiddenSenders]);
  const isHiding = !hiddenTransfersShown && hiddenTransfers.size > 0;
  const historyList = useMemo(
    () =>
      isHiding
        ? filteredHistoryList?.filter((operation) => !hiddenTransfers.has(operation))
        : filteredHistoryList,
    [filteredHistoryList, hiddenTransfers, isHiding]
  );

  const content = (() => {
    if (isLoading) return <div data-testid="wallet-account-history-loading">{t('global.loading')}</div>;
    if (!operations) return <AccountHistoryError onRetry={retry} t={t} />;
    return (
      <>
        {isHiding && (
          <HiddenTransfersNotice
            badActorCount={hiddenCounts.badActor}
            mutedCount={hiddenCounts.muted}
            onShow={showHiddenTransfers}
            t={t}
          />
        )}
        <HistoryTable
          historyList={historyList}
          username={username}
          dynamicData={dynamicData}
          t={t}
          hasOlder={hasOlder}
          isFetchingOlder={isFetchingOlder}
          olderFailed={isError && !isFetchingOlder}
          onLoadOlder={loadOlder}
          onRetry={retry}
        />
      </>
    );
  })();

  return (
    <>
      <TransfersHistoryFilter
        onFiltersChange={(value) => {
          setFilter((prevFilters) => ({
            ...prevFilters,
            ...value
          }));
        }}
        value={rawFilter}
      />
      <div className="p-2 sm:p-4">
        <div className="font-semibold">{t('profile.account_history_title')}</div>
        <p
          className="text-xs leading-relaxed text-primary/70"
          data-testid="wallet-account-history-description"
        >
          {t('profile.account_history_description')}
        </p>
        {content}
      </div>
    </>
  );
};

export default AccountHistory;
