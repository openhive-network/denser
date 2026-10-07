'use client';

import { useMemo } from 'react';
import { useTranslation } from '@/wallet/i18n/client';
import type { GetDynamicGlobalPropertiesResponse } from '@hiveio/wax';
import TransfersHistoryFilter, { TransferFilters } from '@/wallet/components/transfers-history-filter';
import useFilters from '@/wallet/components/hooks/use-filters';
import { getFilter } from '@/wallet/lib/utils';
import { IAccountHistory } from './hooks/use-account-history';
import HistoryTable from './history-table';
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

  const filteredHistoryList = useMemo(
    () => operations?.filter(getFilter({ filter, username })),
    [operations, filter, username]
  );

  const content = (() => {
    if (isLoading) return <div data-testid="wallet-account-history-loading">{t('global.loading')}</div>;
    if (!operations) return <AccountHistoryError onRetry={retry} t={t} />;
    return (
      <HistoryTable
        historyList={filteredHistoryList}
        username={username}
        dynamicData={dynamicData}
        t={t}
        hasOlder={hasOlder}
        isFetchingOlder={isFetchingOlder}
        olderFailed={isError && !isFetchingOlder}
        onLoadOlder={loadOlder}
        onRetry={retry}
      />
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
