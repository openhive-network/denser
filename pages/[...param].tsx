import { useRouter } from "next/router"
import { useGetAccountPosts } from "@/services/bridgeService"
import { QueryClient, dehydrate } from "@tanstack/react-query"

import { getAccountPosts, getCommunities, getPostsRanked } from "@/lib/bridge"
import CommunitiesSidebar from "@/components/communities-sidebar"
import FeedProvider from "@/components/feed-provider"
import { Layout } from "@/components/layout"
import LayoutProfile from "@/components/layout-profile"
import PostList from "@/components/post-list"

export default function Param() {
  const router = useRouter()
  const param = router.query?.param
    ? typeof router.query?.param[0] === "string"
      ? router.query.param[0]
      : ""
    : ""
  const { isLoading, error, refetch, data } = useGetAccountPosts(
    "blog",
    param.slice(1),
    param.startsWith("@")
  )

  if (isLoading && param.startsWith("@")) return <p>Loading... ⚡️</p>

  if (param[0].startsWith("@")) {
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
      <div className="flex justify-center py-8">
        <CommunitiesSidebar />
        <main className="flex w-[920px] flex-col gap-4 px-4 md:px-0">
          <FeedProvider />
        </main>
      </div>
    </Layout>
  )
}

export async function getServerSideProps(context) {
  const param = context.params?.param[0] as string
  const tag = context.params?.param[1] as string
  const sort = "blog"
  const queryClient = new QueryClient()

  if (param.startsWith("@")) {
    await queryClient.prefetchQuery(
      ["accountPosts", param.slice(1), sort],
      () => getAccountPosts(sort, param.slice(1), "hive.blog")
    )
  } else {
    if (tag) {
      await queryClient.prefetchQuery(["postsData", param, tag], () =>
        getPostsRanked(param, tag)
      )
      const sortC = "rank"
      const queryC = null
      await queryClient.prefetchQuery(["communitiesList", sortC, queryC], () =>
        getCommunities(sortC, queryC)
      )
    } else {
      await queryClient.prefetchQuery(["postsData", param], () =>
        getPostsRanked(param, "")
      )
    }
  }

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}
