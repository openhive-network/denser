'use client';

import { useTranslation } from '@/wallet/i18n/client';
import { GetDynamicGlobalPropertiesResponse } from '@hiveio/wax';
import { HiveOperation } from '@hive/common-hiveio-packages/wax';
import TransfersHistoryFilter, { TransferFilters } from '@/wallet/components/transfers-history-filter';
import useFilters from '@/wallet/components/hooks/use-filters';
import HistoryTable from './history-table';
import { getFilter } from '@/wallet/lib/utils';

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

  const filteredHistoryList = operationHistoryData?.filter(getFilter({ filter, username }));

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
        <HistoryTable
          isLoading={isLoading}
          historyList={filteredHistoryList}
          username={username}
          dynamicData={dynamicData}
          t={t}
        />
      </div>
    </>
  );
};

export default AccountHistory;
