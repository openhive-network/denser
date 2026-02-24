'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getDynamicGlobalProperties,
  getFeedHistory,
  getFollowing
} from '@transaction/lib/hive-api';
import { getAccount } from '@transaction/lib/hive-api';
import { getAccountOperations, getSavingsWithdrawals } from '@/wallet/lib/hive';
import { createListWithSuggestions } from '@/wallet/lib/utils';
import Loading from '@ui/components/loading';
import AccountHistory from '@/wallet/feature/transfers-page/account-history';
import RewardsBanner from '@/wallet/feature/transfers-page/rewards-banner';
import PendingSavingsWithdrawals from '@/wallet/feature/transfers-page/pending-savings-withdrawals';
import WalletBalancesTable from '@/wallet/feature/transfers-page/wallet-balances-table';
import { useTranslation } from '@/wallet/i18n/client';
import WalletMenu from '@/wallet/components/wallet-menu';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import FinancialReport from '@/wallet/components/financial-report';
import env from '@beam-australia/react-env';
import { hiveChainService } from '@transaction/lib/hive-chain-service';

export default function TransfersPage({ username }: { username: string }) {
  const { t } = useTranslation('common_wallet');
  const blogURL = env('BLOG_DOMAIN');
  const { user } = useUserClient();
  const hiveChain = hiveChainService.reuseHiveChain();
  const { data: accountData, isLoading: accountLoading } = useQuery(
    ['accountData', username],
    () => getAccount(username),
    {
      enabled: Boolean(username)
    }
  );
  const { data: dynamicData, isLoading: dynamicLoading } = useQuery(['dynamicGlobalPropertiesData'], () =>
    getDynamicGlobalProperties()
  );

  const { data: followingData } = useQuery(['following', username], () =>
    getFollowing({ account: username })
  );

  const { data: operationHistoryData, isLoading: operationHistoryLoading } = useQuery(
    ['Operations', username],
    () => getAccountOperations(username, undefined, 500, user.username),
    {
      select: (data) => data.operations_result
    }
  );
  const { data: historyFeedData, isLoading: historyFeedLoading } = useQuery(['feedHistory'], () =>
    getFeedHistory()
  );

  const { data: withdrawals } = useQuery(['savingsWithdrawalsFrom', username], () =>
    getSavingsWithdrawals(username)
  );

  const listOfAccounts = createListWithSuggestions(username, t, operationHistoryData, followingData);

  if (
    accountLoading ||
    dynamicLoading ||
    historyFeedLoading ||
    !accountData ||
    !dynamicData ||
    !historyFeedData ||
    !hiveChain
  ) {
    return (
      <Loading
        loading={
          accountLoading ||
          dynamicLoading ||
          historyFeedLoading ||
          !accountData ||
          !dynamicData ||
          !historyFeedData ||
          !hiveChain
        }
      />
    );
  }

  return (
    <div className="flex w-full flex-col items-center ">
      <WalletMenu username={username} />
      <RewardsBanner
        username={username}
        isOwner={user?.username === username}
        rewardBalances={{
          reward_hive_balance: accountData.reward_hive_balance,
          reward_hbd_balance: accountData.reward_hbd_balance,
          reward_vesting_hive: accountData.reward_vesting_hive
        }}
      />
      <WalletBalancesTable
        username={username}
        accountData={accountData}
        dynamicData={dynamicData}
        historyFeedData={historyFeedData}
        hiveChain={hiveChain}
        listOfAccounts={listOfAccounts}
        isOwner={user?.username === username}
        currentUsername={user?.username}
        blogURL={blogURL}
      />
      <div className="w-full max-w-6xl">
        <PendingSavingsWithdrawals username={username} withdrawals={withdrawals} />
        {user.username === username && (
          <FinancialReport username={username} />
        )}
        <AccountHistory
          username={username}
          dynamicData={dynamicData}
          operationHistoryData={operationHistoryData}
          isLoading={operationHistoryLoading}
        />
      </div>
    </div>
  );
}
