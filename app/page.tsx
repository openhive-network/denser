import CommunitiesSidebar from "@/components/communities-sidebar"
import FeedProvider from '@/components/feed-provider';

export default async function IndexPage() {
  return (
    <div className="flex py-8">
      <CommunitiesSidebar />
      <main className="flex w-[920px] flex-col gap-4 px-4 md:px-0">
        <FeedProvider />
      </main>
    </div>
  )
}
