import { useEffect, useState } from 'react';
import { useRouter } from "next/router"
import { useQuery } from "@tanstack/react-query"

import { getAccountPosts } from "@/lib/bridge"
import CommentList from "@/components/comment-list"
import PostList from "@/components/post-list"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PostActivities({ data }) {
  const [state, setState] = useState(() => data)
  const [sort, setSort] = useState("posts")
  const router = useRouter()
  const username =
    typeof router.query?.username === "string" ? router.query.username : ""
  const {
    isLoading,
    error,
    refetch,
    data: moreData,
  } = useQuery({
    queryKey: ["accountPostsMoreData", username, sort],
    queryFn: () => getAccountPosts(sort, username, "hive.blog"),
  })

  function handleLoadMore() {
    if (!isLoading) {
      setState([...state, ...moreData])
      refetch()
    }
  }

  function handleChangeSort(s) {
    setSort(s)
  }


  return (
    <Tabs
      defaultValue="posts"
      className="w-full"
      onValueChange={handleChangeSort}
    >
      <TabsList className="flex">
        <TabsTrigger value="posts">Posts</TabsTrigger>
        <TabsTrigger value="comments">Comments</TabsTrigger>
        <TabsTrigger value="payouts">Payouts</TabsTrigger>
      </TabsList>
      <TabsContent value="posts">
        <PostList data={state} />
        <Button
          variant="outline"
          className="mt-4 mb-8 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
          onClick={handleLoadMore}
        >
          Load more
        </Button>
      </TabsContent>
      <TabsContent value="comments">
        <CommentList data={state} />
        <Button
          variant="outline"
          className="mt-4 mb-8 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
          onClick={handleLoadMore}
        >
          Load more
        </Button>
      </TabsContent>
      <TabsContent value="payouts">
        <PostList data={state} />
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
