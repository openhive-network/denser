import CommunitiesSidebar from "@/components/communities-sidebar"
import FeedProvider from '@/components/feed-provider';
import { getPostsRanked2 } from '@/lib/bridge';

export default async function IndexPage({ params }) {
  const serverData = await getPostsRanked2(params.sort);
  return (
    <div className="flex py-8">
      <CommunitiesSidebar />
      <main className="flex w-[920px] flex-col gap-4 px-4 md:px-0">
        <FeedProvider serverData={serverData} sort={params.sort} />
      </main>
    </div>
  )
}
