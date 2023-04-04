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
    typeof router.query?.param === "object"
      ? router.query.param[0]
      : typeof router.query?.param === "string"
        ? router.query?.param
        : ""
  const { isLoading, error, data } = useGetAccountPosts("replies", username.slice(1), true);

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
  const username = String(context.params?.param).slice(1);
  const sort = "replies";
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery(["accountReplies", username], () =>
    getAccountPosts(sort, username, "hive.blog")
  )

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}
