import { Layout } from "@/components/layout";
import CommunitiesSidebar from "@/components/communities-sidebar";
import CommunitiesProvider from "@/components/communities-provider";
import { getCommunities } from "@/lib/bridge";
import { dehydrate, QueryClient } from "@tanstack/react-query";

export default function CommunitiesPage() {
  return (
    <Layout>
      <div className="flex justify-center py-8">
        <CommunitiesSidebar />
        <main className="flex w-[920px] flex-col gap-4 px-4 md:px-0">
          <CommunitiesProvider />
        </main>
      </div>
    </Layout>
  )
}

export async function getServerSideProps(context) {
  const queryClient = new QueryClient()
  const sort = "rank"
  const query = null
  await queryClient.prefetchQuery(["communitiesList", sort, query], () =>
    getCommunities(sort, query)
  )
  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}
