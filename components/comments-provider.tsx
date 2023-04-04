import { useGetAccountPosts } from "@/services/bridgeService"

import CommentList from "@/components/comment-list"

export default function CommentsProvider() {
  const { isLoading, error, data } = useGetAccountPosts(
    "comments",
    "meesterboom",
    true
  )

  if (isLoading) return <p>Loading...</p>

  return <CommentList data={data} />
}
