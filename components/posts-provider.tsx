"use client"

import { useQuery } from "@tanstack/react-query"

import { getPostsRanked2 } from "@/lib/bridge"
import Feed from "@/components/feed"

export default function PostsProvider() {
  const { isLoading, error, data } = useQuery({
    queryKey: ["postsData"],
    queryFn: () => getPostsRanked2("hot"),
  })

  if (isLoading) return <p>Loading...</p>

  return <Feed data={data} />
}
