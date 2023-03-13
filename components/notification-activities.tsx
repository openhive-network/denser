import { useState } from 'react';
import { useRouter } from "next/router"
import { useQuery } from "@tanstack/react-query"

import { getAccountNotifications } from "@/lib/bridge"
import { NotificationList } from "@/components/notification-list"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function NotificationActivities({ data }) {
  const [state, setState] = useState(() => data);
  const lastStateElementId = state[state.length - 1].id
  const router = useRouter()
  const username =
    typeof router.query?.username === "string" ? router.query.username : ""
  const {
    isLoading,
    error,
    refetch,
    data: moreData,
  } = useQuery({
    queryKey: ["accountNotificationMoreData", username],
    queryFn: () => getAccountNotifications(username, lastStateElementId, 50),
  })


  function handleLoadMore () {
    if (!isLoading) {
      setState([...state, ...moreData])
      refetch()
    }
  }

  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="flex">
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="replies">Replies</TabsTrigger>
        <TabsTrigger value="mentions">Mentions</TabsTrigger>
        <TabsTrigger value="follows">Follows</TabsTrigger>
        <TabsTrigger value="upvotes">Upvotes</TabsTrigger>
        <TabsTrigger value="reblogs">Reblogs</TabsTrigger>
      </TabsList>
      <TabsContent value="all">
        <NotificationList data={state} />
        <Button
          variant="outline"
          className="mt-4 mb-8 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
          onClick={handleLoadMore}
        >
          Load more
        </Button>
      </TabsContent>
      <TabsContent value="replies">
        <NotificationList
          data={state.filter(
            (row) => row.type === "reply_comment" || row.type === "reply"
          )}
        />
        <Button
          variant="outline"
          className="mt-4 mb-8 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
          onClick={handleLoadMore}
        >
          Load more
        </Button>
      </TabsContent>
      <TabsContent value="mentions">
        <NotificationList data={state.filter((row) => row.type === "mention")} />
        <Button
          variant="outline"
          className="mt-4 mb-8 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
          onClick={handleLoadMore}
        >
          Load more
        </Button>
      </TabsContent>
      <TabsContent value="follows">
        <NotificationList data={state.filter((row) => row.type === "follow")} />
        <Button
          variant="outline"
          className="mt-4 mb-8 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
          onClick={handleLoadMore}
        >
          Load more
        </Button>
      </TabsContent>
      <TabsContent value="upvotes">
        <NotificationList data={state.filter((row) => row.type === "vote")} />
        <Button
          variant="outline"
          className="mt-4 mb-8 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
          onClick={handleLoadMore}
        >
          Load more
        </Button>
      </TabsContent>
      <TabsContent value="reblogs">
        <NotificationList data={state.filter((row) => row.type === "reblog")} />
        <Button
          variant="outline"
          className="mt-4 mb-8 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
          onClick={handleLoadMore}
        >
          Load more
        </Button>
      </TabsContent>
    </Tabs>
  )
}
