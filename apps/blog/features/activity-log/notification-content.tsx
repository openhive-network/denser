'use client';

/**
 * Notifications feature component.
 *
 * Note: The Hive API (bridge_api_account_notifications) limits notifications
 * to the last 90 days. Older notifications are not available from the API.
 * See: hivemind/hive/db/sql_scripts/postgrest/bridge_api/bridge_api_account_notifications.sql
 */

import { SyntheticEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IAccountNotification } from '@hive/common-hiveio-packages/wax';
import NotificationList from './list';
import { LoadMoreButton } from './load-more-button';
import { Button } from '@ui/components/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/components/tabs';
import { getRewardsString } from '../../lib/utils';
import { getAccountFull, getFindAccounts } from '@transaction/lib/hive-api';
import { useMarkAllNotificationsAsReadMutation } from './hooks/use-notifications-read-mutation';
import { useClaimRewardsMutation } from './hooks/use-claim-reward-mutation';
import { handleError } from '@ui/lib/handle-error';
import { convertStringToBig } from '@ui/lib/helpers';
import { CircleSpinner } from 'react-spinners-kit';
import { getAccountNotifications, getUnreadNotifications } from '@transaction/lib/bridge-api';
import { useTranslation } from '@/blog/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { Icons } from '@hive/ui/components/icons';

const NOTIFICATIONS_LIMIT = 50;

/** Notice shown when user has reached the end of available notifications */
function EndOfNotificationsNotice({ t }: { t: (key: string) => string }) {
  return (
    <div className="my-6 flex flex-col items-center justify-center gap-2 text-center text-sm text-gray-500">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <Icons.check className="h-4 w-4 text-green-600 dark:text-green-400" />
      </div>
      <span>{t('navigation.profile_notifications_tab_navbar.end_of_notifications')}</span>
      <span className="text-xs">{t('navigation.profile_notifications_tab_navbar.notifications_90_day_limit')}</span>
    </div>
  );
}

const NotificationActivities = ({
  data,
  username
}: {
  data: IAccountNotification[] | null | undefined;
  username: string;
}) => {
  const { t } = useTranslation('common_blog');
  const [state, setState] = useState(data);
  // Track the last ID we want to fetch MORE data after (for pagination)
  const [fetchAfterId, setFetchAfterId] = useState<number | null>(null);
  // Track if we've reached the end of available notifications
  const [hasMoreData, setHasMoreData] = useState(true);
  const { user } = useUserClient();
  const markAllNotificationsAsReadMutation = useMarkAllNotificationsAsReadMutation();
  const claimRewardMutation = useClaimRewardsMutation();

  // After claiming, remember the exact balances that were claimed. If the API
  // returns the same values again (stale cache), we know they're phantom and
  // suppress the rewards display. Resets after 60s when the API has caught up.
  const claimedBalancesRef = useRef<{
    hive: string; hbd: string; vests: string; expiresAt: number;
  } | null>(null);

  const { data: unreadNotifications } = useQuery({
    queryKey: ['unreadNotifications', user?.username],
    queryFn: () => getUnreadNotifications(user?.username || ''),
    enabled: !!user?.username,
    refetchOnMount: true,
    refetchInterval: 20000
  });
  const newDate = new Date(Date.now());
  const lastRead = unreadNotifications?.lastread ? new Date(unreadNotifications.lastread) : newDate;

  const { isFetching, data: moreData } = useQuery({
    queryKey: ['AccountNotificationMoreData', username, fetchAfterId],
    queryFn: () => getAccountNotifications(username, fetchAfterId, NOTIFICATIONS_LIMIT),
    enabled: !!username && fetchAfterId !== null && hasMoreData,
    staleTime: 0
  });

  const { data: profileData } = useQuery({
    queryKey: ['profileData', user.username],
    queryFn: () => getAccountFull(user.username),
    enabled: !!user.username
  });

  const accountOwner = user.username === username;
  const { data: apiAccounts } = useQuery({
    queryKey: ['apiAccount', username],
    queryFn: () => getFindAccounts(username),
    enabled: !!username
  });

  const noNotifications = !state || state.length === 0;
  // Show button if loading OR if we have more data available
  const showButton = isFetching || (hasMoreData && state && state.length > 0);

  // Sync initial data from props
  useEffect(() => {
    if (data && data.length > 0) {
      setState(data);
      // Check if initial data suggests there might be more
      setHasMoreData(data.length >= NOTIFICATIONS_LIMIT);
    }
  }, [data]);

  // Process fetched more data
  useEffect(() => {
    if (moreData !== undefined && fetchAfterId !== null) {
      if (!moreData || moreData.length === 0) {
        // No more data available
        setHasMoreData(false);
      } else {
        // Append new data and check if there might be more
        setState((prev) => [...(prev ?? []), ...moreData]);
        setHasMoreData(moreData.length >= NOTIFICATIONS_LIMIT);
        // Reset fetchAfterId to prevent re-fetching the same data
        setFetchAfterId(null);
      }
    }
  }, [moreData, fetchAfterId]);

  async function handleMarkAllAsRead() {
    if (markAllNotificationsAsReadMutation.isPending) return;
    const myDate = new Date().toISOString();
    const date = myDate.slice(0, myDate.length - 5);
    try {
      await markAllNotificationsAsReadMutation.mutateAsync({ date });
    } catch (error) {
      handleError(error, {
        method: 'markAllNotificationsAsRead',
        params: { date }
      });
    }
  }

  async function handleClaimRewards(e: SyntheticEvent) {
    e.preventDefault();
    if (apiAccounts && profileData) {
      // Snapshot the balances being claimed so we can detect stale API responses
      claimedBalancesRef.current = {
        hive: profileData.reward_hive_balance.amount,
        hbd: profileData.reward_hbd_balance.amount,
        vests: profileData.reward_vesting_hive.amount,
        expiresAt: Date.now() + 60000
      };
      try {
        await claimRewardMutation.mutateAsync({ account: apiAccounts.accounts[0] });
      } catch (error) {
        claimedBalancesRef.current = null;
        handleError(error, { method: 'claimReward', params: { account: apiAccounts.accounts[0] } });
      }
    }
  }

  const handleLoadMore = useCallback(() => {
    if (!isFetching && hasMoreData && state && state.length > 0) {
      const lastId = state[state.length - 1].id;
      if (lastId !== undefined) {
        // Set the ID of the last notification to fetch more after it
        setFetchAfterId(lastId);
      }
    }
  }, [isFetching, hasMoreData, state]);

  return (
    <Tabs defaultValue="all" className="w-full">
      {profileData &&
      accountOwner &&
      (convertStringToBig(profileData.reward_hive_balance).gt(0) ||
        convertStringToBig(profileData.reward_hbd_balance).gt(0) ||
        convertStringToBig(profileData.reward_vesting_hive).gt(0)) &&
      // Suppress stale rewards that match what was just claimed. The API may
      // return cached pre-claim balances for up to a minute after the on-chain
      // claim succeeds. If the API returns different values (new rewards arrived),
      // those are genuine and will be shown.
      !(claimedBalancesRef.current &&
        Date.now() < claimedBalancesRef.current.expiresAt &&
        profileData.reward_hive_balance.amount === claimedBalancesRef.current.hive &&
        profileData.reward_hbd_balance.amount === claimedBalancesRef.current.hbd &&
        profileData.reward_vesting_hive.amount === claimedBalancesRef.current.vests) ? (
        <div className="flex flex-col items-center justify-center px-2 py-4 md:flex-row md:justify-between">
          <span>
            {t('navigation.profile_notifications_tab_navbar.unclaimed_rewards')}
            {getRewardsString(profileData, t)}
          </span>
          <Button
            variant="redHover"
            onClick={handleClaimRewards}
            disabled={claimRewardMutation.isPending}
            className="w-36"
          >
            {claimRewardMutation.isPending ? (
              <CircleSpinner loading={claimRewardMutation.isPending} size={18} color="#dc2626" />
            ) : (
              t('navigation.profile_notifications_tab_navbar.redeem')
            )}
          </Button>
        </div>
      ) : null}

      {accountOwner && unreadNotifications && unreadNotifications.unread !== 0 ? (
        <div className="flex flex-col items-center">
          <button
            disabled={markAllNotificationsAsReadMutation.isPending}
            className="w-100 mb-4 font-bold"
            onClick={handleMarkAllAsRead}
          >
            {markAllNotificationsAsReadMutation.isPending ? (
              <CircleSpinner
                loading={markAllNotificationsAsReadMutation.isPending}
                size={18}
                color="#dc2626"
              />
            ) : (
              t('navigation.profile_notifications_tab_navbar.mark_all')
            )}
          </button>
        </div>
      ) : null}
      <TabsList
        className="flex h-auto flex-wrap bg-background-tertiary"
        data-testid="notifications-local-menu"
      >
        <TabsTrigger value="all">{t('navigation.profile_notifications_tab_navbar.all')}</TabsTrigger>
        <TabsTrigger value="replies" className="gap-1.5">
          <Icons.comment className="h-3 w-3 text-purple-500" />
          {t('navigation.profile_notifications_tab_navbar.replies')}
        </TabsTrigger>
        <TabsTrigger value="mentions" className="gap-1.5">
          <Icons.atSign className="h-3 w-3 text-amber-500" />
          {t('navigation.profile_notifications_tab_navbar.mentions')}
        </TabsTrigger>
        <TabsTrigger value="follows" className="gap-1.5">
          <Icons.userPlus className="h-3 w-3 text-cyan-500" />
          {t('navigation.profile_notifications_tab_navbar.follows')}
        </TabsTrigger>
        <TabsTrigger value="upvotes" className="gap-1.5">
          <Icons.arrowUpCircle className="h-3 w-3 text-green-500" />
          {t('navigation.profile_notifications_tab_navbar.upvotes')}
        </TabsTrigger>
        <TabsTrigger value="reblogs" className="gap-1.5">
          <Icons.forward className="h-3 w-3 text-blue-500" />
          {t('navigation.profile_notifications_tab_navbar.reblogs')}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="all" data-testid="notifications-content-all">
        <NotificationList data={state} lastRead={lastRead} />
        {noNotifications ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <span>{t('navigation.profile_notifications_tab_navbar.no_notifications_yet')}</span>
          </div>
        ) : showButton ? (
          <LoadMoreButton isFetching={isFetching} onClick={handleLoadMore} />
        ) : (
          <EndOfNotificationsNotice t={t} />
        )}
      </TabsContent>
      <TabsContent value="replies" data-testid="notifications-content-replies">
        <NotificationList
          data={state?.filter(
            (row: IAccountNotification) => row.type === 'reply_comment' || row.type === 'reply'
          )}
          lastRead={lastRead}
        />
        {noNotifications ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <span>{t('navigation.profile_notifications_tab_navbar.no_notifications_yet')}</span>
          </div>
        ) : showButton ? (
          <LoadMoreButton isFetching={isFetching} onClick={handleLoadMore} />
        ) : (
          <EndOfNotificationsNotice t={t} />
        )}
      </TabsContent>
      <TabsContent value="mentions" data-testid="notifications-content-mentions">
        <NotificationList
          data={state?.filter((row: IAccountNotification) => row.type === 'mention')}
          lastRead={lastRead}
        />
        {noNotifications ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <span>{t('navigation.profile_notifications_tab_navbar.no_notifications_yet')}</span>
          </div>
        ) : showButton ? (
          <LoadMoreButton isFetching={isFetching} onClick={handleLoadMore} />
        ) : (
          <EndOfNotificationsNotice t={t} />
        )}
      </TabsContent>
      <TabsContent value="follows" data-testid="notifications-content-follows">
        <NotificationList
          data={state?.filter((row: IAccountNotification) => row.type === 'follow')}
          lastRead={lastRead}
        />
        {noNotifications ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <span>{t('navigation.profile_notifications_tab_navbar.no_notifications_yet')}</span>
          </div>
        ) : showButton ? (
          <LoadMoreButton isFetching={isFetching} onClick={handleLoadMore} />
        ) : (
          <EndOfNotificationsNotice t={t} />
        )}
      </TabsContent>
      <TabsContent value="upvotes" data-testid="notifications-content-upvotes">
        <NotificationList
          data={state?.filter((row: IAccountNotification) => row.type === 'vote')}
          lastRead={lastRead}
        />
        {noNotifications ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <span>{t('navigation.profile_notifications_tab_navbar.no_notifications_yet')}</span>
          </div>
        ) : showButton ? (
          <LoadMoreButton isFetching={isFetching} onClick={handleLoadMore} />
        ) : (
          <EndOfNotificationsNotice t={t} />
        )}
      </TabsContent>
      <TabsContent value="reblogs" data-testid="notifications-content-reblogs">
        <NotificationList
          data={state?.filter((row: IAccountNotification) => row.type === 'reblog')}
          lastRead={lastRead}
        />
        {noNotifications ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <span>{t('navigation.profile_notifications_tab_navbar.no_notifications_yet')}</span>
          </div>
        ) : showButton ? (
          <LoadMoreButton isFetching={isFetching} onClick={handleLoadMore} />
        ) : (
          <EndOfNotificationsNotice t={t} />
        )}
      </TabsContent>
    </Tabs>
  );
};

export default NotificationActivities;
