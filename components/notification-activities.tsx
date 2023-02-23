"use client"
import { NotificationList } from "@/components/notification-list"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function NotificationActivities({ data }) {
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
        <NotificationList data={data} />
        <Button
          variant="outline"
          className="mt-4 mb-8 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
        >
          Load more
        </Button>
      </TabsContent>
      <TabsContent value="replies">Replies Tab</TabsContent>
      <TabsContent value="mentions">Mentions Tab</TabsContent>
      <TabsContent value="follows">Follows Tab</TabsContent>
      <TabsContent value="upvotes">Upvotes Tab</TabsContent>
      <TabsContent value="reblogs">Reblogs Tab</TabsContent>
    </Tabs>
  )
}
