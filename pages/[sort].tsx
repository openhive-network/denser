import { Layout } from "@/components/layout"
import CommunitiesSidebar from '@/components/communities-sidebar';
import FeedProvider from '@/components/feed-provider';

export default function IndexPage() {
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
