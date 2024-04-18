import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IAccountNotification, getAccountNotifications } from '@transaction/lib/bridge';
import NotificationList from '@/blog/components/notification-list';
import { Button } from '@ui/components/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/components/tabs';
import { useTranslation } from 'next-i18next';
import { transactionService } from '@transaction/index';

const NotificationActivities = ({
  data,
  username
}: {
  data: IAccountNotification[] | null | undefined;
  username: string;
}) => {
  const { t } = useTranslation('common_blog');
  const [state, setState] = useState(data);
  const [lastRead, setLastRead] = useState(new Date(Date.now()).toISOString());
  const [lastStateElementId, setLastStateElementId] = useState(
    state && state.length > 0 ? state[state.length - 1].id : null
  );
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
  const showButton = moreData?.length !== 0;
  useEffect(() => {
    if (state) {
      setLastStateElementId(state[state.length - 1].id);
    }
  }, [state, state?.length]);

  useEffect(() => {
    refetch();
  }, [lastStateElementId, refetch]);

  function handleMarkAllAsRead() {
    const newDate = new Date(Date.now()).toISOString();
    transactionService.markAllNotificationAsRead(newDate);
    setLastRead(newDate);
  }

  function handleLoadMore() {
    if (!isLoading) {
      setState([...(state ?? []), ...(moreData || [])]);
    }
  }

  return (
    <Tabs defaultValue="all" className="w-full">
      <span
        className="text-md block w-full text-center font-bold hover:cursor-pointer"
        onClick={handleMarkAllAsRead}
      >
        {t('navigation.profil_notifications_tab_navbar.mark_all')}
      </span>
      <TabsList className="flex" data-testid="notifications-local-menu">
        <TabsTrigger value="all">{t('navigation.profil_notifications_tab_navbar.all')}</TabsTrigger>
        <TabsTrigger value="replies">{t('navigation.profil_notifications_tab_navbar.replies')}</TabsTrigger>
        <TabsTrigger value="mentions">{t('navigation.profil_notifications_tab_navbar.mentions')}</TabsTrigger>
        <TabsTrigger value="follows">{t('navigation.profil_notifications_tab_navbar.follows')}</TabsTrigger>
        <TabsTrigger value="upvotes">{t('navigation.profil_notifications_tab_navbar.upvotes')}</TabsTrigger>
        <TabsTrigger value="reblogs">{t('navigation.profil_notifications_tab_navbar.reblogs')}</TabsTrigger>
      </TabsList>
      <TabsContent value="all" data-testid="notifications-content-all">
        <NotificationList data={state} lastRead={lastRead} />
        {showButton && (
          <Button
            variant="outline"
            className="mb-8 mt-4 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
            onClick={handleLoadMore}
          >
            Load more
          </Button>
        )}
      </TabsContent>
      <TabsContent value="replies" data-testid="notifications-content-replies">
        <NotificationList
          data={state?.filter(
            (row: IAccountNotification) => row.type === 'reply_comment' || row.type === 'reply'
          )}
          lastRead={lastRead}
        />
        {showButton && (
          <Button
            variant="outline"
            className="mb-8 mt-4 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
            onClick={handleLoadMore}
          >
            Load more
          </Button>
        )}
      </TabsContent>
      <TabsContent value="mentions" data-testid="notifications-content-mentions">
        <NotificationList
          data={state?.filter((row: IAccountNotification) => row.type === 'mention')}
          lastRead={lastRead}
        />
        {showButton && (
          <Button
            variant="outline"
            className="mb-8 mt-4 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
            onClick={handleLoadMore}
          >
            Load more
          </Button>
        )}
      </TabsContent>
      <TabsContent value="follows" data-testid="notifications-content-follows">
        <NotificationList
          data={state?.filter((row: IAccountNotification) => row.type === 'follow')}
          lastRead={lastRead}
        />
        {showButton && (
          <Button
            variant="outline"
            className="mb-8 mt-4 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
            onClick={handleLoadMore}
          >
            Load more
          </Button>
        )}
      </TabsContent>
      <TabsContent value="upvotes" data-testid="notifications-content-upvotes">
        <NotificationList
          data={state?.filter((row: IAccountNotification) => row.type === 'vote')}
          lastRead={lastRead}
        />
        {showButton && (
          <Button
            variant="outline"
            className="mb-8 mt-4 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
            onClick={handleLoadMore}
          >
            Load more
          </Button>
        )}
      </TabsContent>
      <TabsContent value="reblogs" data-testid="notifications-content-reblogs">
        <NotificationList
          data={state?.filter((row: IAccountNotification) => row.type === 'reblog')}
          lastRead={lastRead}
        />
        {showButton && (
          <Button
            variant="outline"
            className="mb-8 mt-4 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
            onClick={handleLoadMore}
          >
            Load more
          </Button>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default NotificationActivities;
