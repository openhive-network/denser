import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AccountNotification, getAccountNotifications } from '@/lib/bridge';
import NotificationList from '@/components/notification-list';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const NotificationActivities = ({
  data,
  username
}: {
  data: AccountNotification[] | null | undefined;
  username: string;
}) => {
  const [state, setState] = useState(data);
  const lastStateElementId = state && state.length > 0 ? state[state.length - 1].id : null;
  const {
    isLoading,
    error,
    refetch,
    data: moreData
  } = useQuery(
    ['accountNotificationMoreData', username],
    () => getAccountNotifications(username, lastStateElementId, 50),
    { enabled: !!username }
  );

  function handleLoadMore() {
    if (!isLoading) {
      setState([...(state ?? []), ...(moreData || [])]);
      refetch();
    }
  }

  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="flex" data-testid="notifications-local-menu">
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="replies">Replies</TabsTrigger>
        <TabsTrigger value="mentions">Mentions</TabsTrigger>
        <TabsTrigger value="follows">Follows</TabsTrigger>
        <TabsTrigger value="upvotes">Upvotes</TabsTrigger>
        <TabsTrigger value="reblogs">Reblogs</TabsTrigger>
      </TabsList>
      <TabsContent value="all" data-testid="notifications-content-all">
        <NotificationList data={state} />
        <Button
          variant="outline"
          className="mb-8 mt-4 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
          onClick={handleLoadMore}
        >
          Load more
        </Button>
      </TabsContent>
      <TabsContent value="replies" data-testid="notifications-content-replies">
        <NotificationList
          data={state?.filter(
            (row: AccountNotification) => row.type === 'reply_comment' || row.type === 'reply'
          )}
        />
        <Button
          variant="outline"
          className="mb-8 mt-4 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
          onClick={handleLoadMore}
        >
          Load more
        </Button>
      </TabsContent>
      <TabsContent value="mentions" data-testid="notifications-content-mentions">
        <NotificationList data={state?.filter((row: AccountNotification) => row.type === 'mention')} />
        <Button
          variant="outline"
          className="mb-8 mt-4 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
          onClick={handleLoadMore}
        >
          Load more
        </Button>
      </TabsContent>
      <TabsContent value="follows" data-testid="notifications-content-follows">
        <NotificationList data={state?.filter((row: AccountNotification) => row.type === 'follow')} />
        <Button
          variant="outline"
          className="mb-8 mt-4 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
          onClick={handleLoadMore}
        >
          Load more
        </Button>
      </TabsContent>
      <TabsContent value="upvotes" data-testid="notifications-content-upvotes">
        <NotificationList data={state?.filter((row: AccountNotification) => row.type === 'vote')} />
        <Button
          variant="outline"
          className="mb-8 mt-4 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
          onClick={handleLoadMore}
        >
          Load more
        </Button>
      </TabsContent>
      <TabsContent value="reblogs" data-testid="notifications-content-reblogs">
        <NotificationList data={state?.filter((row: AccountNotification) => row.type === 'reblog')} />
        <Button
          variant="outline"
          className="mb-8 mt-4 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
          onClick={handleLoadMore}
        >
          Load more
        </Button>
      </TabsContent>
    </Tabs>
  );
};

export default NotificationActivities;
