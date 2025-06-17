import { SyntheticEvent, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getAccountNotifications,
  getUnreadNotifications
} from '@transaction/lib/bridge';
import { IAccountNotification } from '@transaction/lib/extended-hive.chain';
import NotificationList from '@/blog/components/notification-list';
import { Button } from '@ui/components/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/components/tabs';
import { useTranslation } from 'next-i18next';
import { getRewardsString } from '../lib/utils';
import { getAccountFull, getFindAccounts } from '@transaction/lib/hive';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMarkAllNotificationsAsReadMutation } from './hooks/use-notifications-read-mutation';
import { useClaimRewardsMutation } from './hooks/use-claim-reward-mutation';
import { handleError } from '@ui/lib/handle-error';
import { CircleSpinner } from 'react-spinners-kit';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const NotificationActivities = ({
  data,
  username
}: {
  data: IAccountNotification[] | null | undefined;
  username: string;
}) => {
  const { t } = useTranslation('common_blog');
  const [state, setState] = useState(data);
  const [lastStateElementId, setLastStateElementId] = useState(
    state && state.length > 0 ? state[state.length - 1].id : null
  );
  const { user } = useUser();
  const markAllNotificationsAsReadMutation = useMarkAllNotificationsAsReadMutation();
  const claimRewardMutation = useClaimRewardsMutation();

  const { data: unreadNotifications } = useQuery(
    ['unreadNotifications', user?.username],
    () => getUnreadNotifications(user?.username || ''),
    {
      enabled: !!user?.username
    }
  );
  const newDate = new Date(Date.now());
  const lastRead = new Date(unreadNotifications?.lastread || newDate).getTime();

  const {
    isLoading,
    error,
    refetch,
    data: moreData
  } = useQuery(
    ['AccountNotificationMoreData', username],
    () => getAccountNotifications(username, lastStateElementId, 50),
    { enabled: !!username }
  );
  const {
    isLoading: profileDataIsLoading,
    error: errorProfileData,
    data: profileData
  } = useQuery(['profileData', user.username], () => getAccountFull(user.username), {
    enabled: !!user.username
  });
  const accountOwner = user.username === username;
  const {
    isLoading: apiAccountsIsLoading,
    error: errorApiAccounts,
    data: apiAccounts
  } = useQuery(['apiAccount', username], () => getFindAccounts(username), {
    enabled: !!username
  });
  const showButton = moreData?.length !== 0;
  const noNotifications = !state || !state.length ||state.length === 0;
  useEffect(() => {
    if (state) {
      setLastStateElementId(state[state.length - 1].id);
    }
  }, [state, state?.length]);

  useEffect(() => {
    refetch();
  }, [lastStateElementId, refetch]);

  async function handleMarkAllAsRead() {
    if (markAllNotificationsAsReadMutation.isLoading) return;
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
    if (apiAccounts) {
      try {
        await claimRewardMutation.mutateAsync({ account: apiAccounts.accounts[0] });
      } catch (error) {
        handleError(error, { method: 'claimReward', params: { account: apiAccounts.accounts[0] } });
      }
    }
  }

  function handleLoadMore() {
    if (!isLoading) {
      setState([...(state ?? []), ...(moreData || [])]);
    }
  }

  return (
    <Tabs defaultValue="all" className="w-full">
      {profileData &&
      accountOwner &&
      (parseFloat(profileData.reward_hive_balance.split(' ')[0]) > 0 ||
        parseFloat(profileData.reward_hbd_balance.split(' ')[0]) > 0 ||
        parseFloat(profileData.reward_vesting_hive.split(' ')[0]) > 0) ? (
        <div className="flex flex-col items-center justify-center px-2 py-4 md:flex-row md:justify-between">
          <span>
            {t('navigation.profile_notifications_tab_navbar.unclaimed_rewards')}
            {getRewardsString(profileData, t)}
          </span>
          <Button
            variant="redHover"
            onClick={handleClaimRewards}
            disabled={claimRewardMutation.isLoading}
            className="w-36"
          >
            {claimRewardMutation.isLoading ? (
              <CircleSpinner loading={claimRewardMutation.isLoading} size={18} color="#dc2626" />
            ) : (
              t('navigation.profile_notifications_tab_navbar.redeem')
            )}
          </Button>
        </div>
      ) : null}

      {accountOwner && unreadNotifications && unreadNotifications.unread !== 0 ? (
        <div className="flex flex-col items-center">
          <button
            disabled={markAllNotificationsAsReadMutation.isLoading}
            className="w-100 mb-4 font-bold"
            onClick={handleMarkAllAsRead}
          >
            {markAllNotificationsAsReadMutation.isLoading ? (
              <CircleSpinner
                loading={markAllNotificationsAsReadMutation.isLoading}
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
        className="flex h-auto flex-wrap bg-background-tertiary "
        data-testid="notifications-local-menu"
      >
        <TabsTrigger value="all">{t('navigation.profile_notifications_tab_navbar.all')}</TabsTrigger>
        <TabsTrigger value="replies">{t('navigation.profile_notifications_tab_navbar.replies')}</TabsTrigger>
        <TabsTrigger value="mentions">
          {t('navigation.profile_notifications_tab_navbar.mentions')}
        </TabsTrigger>
        <TabsTrigger value="follows">{t('navigation.profile_notifications_tab_navbar.follows')}</TabsTrigger>
        <TabsTrigger value="upvotes">{t('navigation.profile_notifications_tab_navbar.upvotes')}</TabsTrigger>
        <TabsTrigger value="reblogs">{t('navigation.profile_notifications_tab_navbar.reblogs')}</TabsTrigger>
      </TabsList>
      <TabsContent value="all" data-testid="notifications-content-all">
        <NotificationList data={state} lastRead={lastRead} />
        {noNotifications ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <span>{t('navigation.profile_notifications_tab_navbar.no_notifications_yet')}</span>
          </div>
        ) : showButton ? (
          <Button
            variant="outline"
            className="mb-8 mt-4 border-destructive text-base text-destructive hover:bg-destructive hover:text-secondary dark:border-destructive"
            onClick={handleLoadMore}
          >
            Load more
          </Button>
        ) : null}
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
          <Button
            variant="outline"
            className="hover:secondarydark:border-destructive mb-8 mt-4 border-destructive text-base text-destructive hover:bg-destructive"
            onClick={handleLoadMore}
          >
            Load more
          </Button>
        ) : null}
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
          <Button
            variant="outline"
            className="hover:secondarydark:border-destructive mb-8 mt-4 border-destructive text-base text-destructive hover:bg-destructive"
            onClick={handleLoadMore}
          >
            Load more
          </Button>
        ) : null}
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
          <Button
            variant="outline"
            className="hover:secondarydark:border-destructive mb-8 mt-4 border-destructive text-base text-destructive hover:bg-destructive"
            onClick={handleLoadMore}
          >
            Load more
          </Button>
        ) : null}
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
          <Button
            variant="outline"
            className="hover:secondarydark:border-destructive mb-8 mt-4 border-destructive text-base text-destructive hover:bg-destructive"
            onClick={handleLoadMore}
          >
            Load more
          </Button>
        ) : null}
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
          <Button
            variant="outline"
            className="hover:secondarydark:border-destructive mb-8 mt-4 border-destructive text-base text-destructive hover:bg-destructive"
            onClick={handleLoadMore}
          >
            Load more
          </Button>
        ) : null}
      </TabsContent>
    </Tabs>
  );
};

export default NotificationActivities;
