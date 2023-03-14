import { useRouter } from "next/router"
import { QueryClient, dehydrate, useQuery } from "@tanstack/react-query"

import { getAccountPosts } from "@/lib/bridge"
import { Layout } from "@/components/layout"
import LayoutProfile from "@/components/layout-profile"
import PostActivities from "@/components/post-activities"

export default function UserPosts() {
  return (
    <div className="flex flex-col">
      <PostActivities />
    </div>
  )
}

UserPosts.getLayout = function getLayout(page) {
  return (
    <Layout>
      <LayoutProfile>{page}</LayoutProfile>
    </Layout>
  )
}

export async function getServerSideProps(context) {
  const username = context.params?.username as string
  const sort = "posts"
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery(["accountPosts", username, sort], () =>
    getAccountPosts(sort, username, "hive.blog")
  )

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}
