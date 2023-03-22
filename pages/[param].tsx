import { useRouter } from "next/router"
import { useGetAccountPosts } from "@/services/bridgeService"
import { QueryClient, dehydrate } from "@tanstack/react-query"

import { getAccountPosts, getPostsRanked } from "@/lib/bridge";
import { Layout } from "@/components/layout"
import LayoutProfile from "@/components/layout-profile"
import PostList from "@/components/post-list"
import CommunitiesSidebar from "@/components/communities-sidebar";
import FeedProvider from "@/components/feed-provider";

export default function Param() {
  const router = useRouter()
  const param =
    typeof router.query?.param === "string" ? router.query.param : ""
  console.log('param.slice(1)', param.slice(1))
  const { isLoading, error, refetch, data } = useGetAccountPosts(
    "blog",
    param.slice(1),
    param.startsWith('@')
  )

  if (isLoading) return <p>Loading... ⚡️</p>


  if (param.startsWith('@')) {
    return (
      <Layout>
        <LayoutProfile>
      <div className="flex flex-col">
        <PostList data={data} />
      </div>
        </LayoutProfile>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex py-8">
        <CommunitiesSidebar />
        <main className="flex w-[920px] flex-col gap-4 px-4 md:px-0">
          <FeedProvider />
        </main>
      </div>
    </Layout>
  )
}

export async function getServerSideProps(context) {
  const param = context.params?.param as string
  const sort = "blog"
  const queryClient = new QueryClient()

  if (param.startsWith('@')) {
    await queryClient.prefetchQuery(["accountPosts", param.slice(1), sort], () =>
      getAccountPosts(sort, param.slice(1), "hive.blog")
    )
  } else {
    await queryClient.prefetchQuery(["postsData", param], () =>
      getPostsRanked(param)
    )
  }

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}
