import { useQuery } from "@tanstack/react-query"

import { getAccountPosts } from "@/lib/bridge"
import CommentList from "@/components/comment-list"
import { Layout } from "@/components/layout"
import LayoutProfile from "@/components/layout-profile"

export default function UserReplies() {
  const { isLoading, error, data } = useQuery({
    queryKey: ["postsData"],
    queryFn: () => getAccountPosts("comments", "meesterboom"),
  })

  if (isLoading) return <p>Loading...</p>

  return (
    <div className="flex flex-col">
      <CommentList data={data} />
    </div>
  )
}

UserReplies.getLayout = function getLayout(page) {
  return (
    <Layout>
      <LayoutProfile>{page}</LayoutProfile>
    </Layout>
  )
}
