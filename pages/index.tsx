import CommunitiesSidebar from "@/components/communities-sidebar"
import FeedProvider from "@/components/feed-provider"
import { Layout } from "@/components/layout"

export default function IndexPage() {
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
