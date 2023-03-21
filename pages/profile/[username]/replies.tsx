import { useRouter } from "next/router"
import { QueryClient, dehydrate } from "@tanstack/react-query"

import { getAccountPosts } from "@/lib/bridge"
import CommentList from "@/components/comment-list"
import { Layout } from "@/components/layout"
import LayoutProfile from "@/components/layout-profile"
import { useGetAccountPosts } from '@/services/bridgeService';

export default function UserReplies() {
  const router = useRouter()
  const username =
    typeof router.query?.username === "string" ? router.query.username : ""
  const { isLoading, error, data } = useGetAccountPosts("replies", username);

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

export async function getServerSideProps(context) {
  const username = context.params?.username as string
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery(["accountReplies", username], () =>
    getAccountPosts("replies", username, "hive.blog")
  )

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}
