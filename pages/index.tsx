import { QueryClient, dehydrate } from "@tanstack/react-query"

import { getCommunities, getPostsRanked } from "@/lib/bridge"
import CommunitiesSidebar from "@/components/communities-sidebar"
import FeedProvider from "@/components/feed-provider"
import { Layout } from "@/components/layout"

export default function IndexPage({ feedData, sortServer }) {
  return (
    <Layout>
      <div className="flex justify-center py-8">
        <CommunitiesSidebar />
        <main className="flex w-[920px] flex-col gap-4 px-4 md:px-0">
          <FeedProvider feedData={feedData} sort={sortServer} />
        </main>
      </div>
    </Layout>
  )
}

export async function getServerSideProps(context) {
  const queryClient = new QueryClient()
  const sort = "rank"
  const query = null
  const sortServer = "trending"
  await queryClient.prefetchQuery(["communitiesList", sort, query], () =>
    getCommunities(sort, query)
  )

  const data = await getPostsRanked(sortServer, "", "", "")

  const feedData = {
    pages: [{ data }],
    pageParams: [null],
  }

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
      feedData,
      sortServer,
    },
  }
}
