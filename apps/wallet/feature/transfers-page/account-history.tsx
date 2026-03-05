'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/wallet/i18n/client';
import { GetDynamicGlobalPropertiesResponse } from '@hiveio/wax';
import { HiveOperation } from '@hive/common-hiveio-packages/wax';
import TransfersHistoryFilter, { TransferFilters } from '@/wallet/components/transfers-history-filter';
import useFilters from '@/wallet/components/hooks/use-filters';
import HistoryTable from './history-table';
import { getFilter } from '@/wallet/lib/utils';
import {
  getSidechainRewardsConfig,
  isSidechainRewardsConfigured,
  SidechainAccountTransaction
} from '@ui/lib/sidechain-rewards';
import { useSidechainAccountTransactions } from './hooks/use-sidechain-account-transactions';
import SidechainHistoryTable from './sidechain-history-table';

const initialFilters: TransferFilters = {
  search: '',
  others: false,
  incoming: false,
  outcoming: false,
  exlude: false,
  historyView: 'hive'
};

type DynamicData = Pick<GetDynamicGlobalPropertiesResponse, 'total_vesting_fund_hive' | 'total_vesting_shares'>;

interface AccountHistoryProps {
  username: string;
  dynamicData: DynamicData;
  operationHistoryData: HiveOperation[] | undefined;
  isLoading: boolean;
}

const AccountHistory = ({
  username,
  dynamicData,
  operationHistoryData,
  isLoading
}: AccountHistoryProps) => {
  const { t } = useTranslation('common_wallet');
  const [rawFilter, filter, setFilter] = useFilters(initialFilters);
  const [sidechainReady, setSidechainReady] = useState(false);
  const sidechainConfig = getSidechainRewardsConfig();
  const isSidechainConfigured = isSidechainRewardsConfigured(sidechainConfig);
  const showTokenTab = sidechainReady && isSidechainConfigured;
  const isTokenHistoryView = showTokenTab && rawFilter.historyView === 'token';

  useEffect(() => {
    setSidechainReady(true);
  }, []);

  const { data: tokenTransactions = [], isLoading: isTokenTransactionsLoading } =
    useSidechainAccountTransactions(username);

  const filteredHistoryList = operationHistoryData?.filter(getFilter({ filter, username }));

  const filteredTokenTransactions = tokenTransactions.filter((transaction: SidechainAccountTransaction) => {
    const operationName = transaction.operation.toLowerCase();
    return (
      operationName.includes('buy') ||
      operationName.includes('sell') ||
      operationName.includes('stake') ||
      operationName.includes('delegat') ||
      operationName.includes('undeleg') ||
      operationName.includes('transfer') ||
      operationName.includes('distribution') ||
      operationName.includes('claim')
    );
  });

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
        token={showTokenTab ? sidechainConfig.token : undefined}
      />
      <div className="p-2 sm:p-4">
        <div className="font-semibold">{t('profile.account_history_title')}</div>
        <p
          className="text-xs leading-relaxed text-primary/70"
          data-testid="wallet-account-history-description"
        >
          {t('profile.account_history_description')}
        </p>
        {isTokenHistoryView ? (
          <SidechainHistoryTable
            isLoading={isTokenTransactionsLoading}
            transactions={filteredTokenTransactions}
            username={username}
            token={sidechainConfig.token}
            t={t}
          />
        ) : (
          <HistoryTable
            isLoading={isLoading}
            historyList={filteredHistoryList}
            username={username}
            dynamicData={dynamicData}
            t={t}
          />
        )}
      </div>
    </>
  );
};

export default AccountHistory;
