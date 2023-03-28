import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { useGetAccountPosts } from "@/services/bridgeService"

import CommentList from "@/components/comment-list"
import PostList from "@/components/post-list"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PostActivities() {
  const [sort, setSort] = useState("posts")
  const router = useRouter()
  const username =
    typeof router.query?.param === "object"
      ? router.query.param[0]
      : typeof router.query?.param === "string"
      ? router.query?.param
      : ""
  const { isLoading, error, refetch, data } = useGetAccountPosts(
    sort,
    username.slice(1),
    username.startsWith("@")
  )

  if (isLoading) return <p>Loading... ⚡️</p>

  // function handleLoadMore() {
  //   if (!isLoading) {
  //     setState([...state, ...moreData])
  //     refetch()
  //   }
  // }

  return (
    <Tabs
      defaultValue="posts"
      className="w-full"
      onValueChange={(s) => setSort(s)}
      value={sort}
    >
      <TabsList className="flex">
        <TabsTrigger value="posts">Posts</TabsTrigger>
        <TabsTrigger value="comments">Comments</TabsTrigger>
        <TabsTrigger value="payout">Payouts</TabsTrigger>
      </TabsList>
      <TabsContent value="posts">
        <PostList data={data} />
        {/*<Button*/}
        {/*  variant="outline"*/}
        {/*  className="mt-4 mb-8 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"*/}
        {/*  onClick={handleLoadMore}*/}
        {/*>*/}
        {/*  Load more*/}
        {/*</Button>*/}
      </TabsContent>
      <TabsContent value="comments">
        <CommentList data={data} />
        {/*<Button*/}
        {/*  variant="outline"*/}
        {/*  className="mt-4 mb-8 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"*/}
        {/*  onClick={handleLoadMore}*/}
        {/*>*/}
        {/*  Load more*/}
        {/*</Button>*/}
      </TabsContent>
      <TabsContent value="payout">
        <PostList data={data} />
        {/*<Button*/}
        {/*  variant="outline"*/}
        {/*  className="mt-4 mb-8 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"*/}
        {/*  onClick={handleLoadMore}*/}
        {/*>*/}
        {/*  Load more*/}
        {/*</Button>*/}
      </TabsContent>
    </Tabs>
  )
}
