import { Layout } from "@/components/layout"
import CommunitiesSidebar from '@/components/communities-sidebar';
import FeedProvider from '@/components/feed-provider';
import { getPostsRanked, getPostsRanked2 } from '@/lib/bridge';

export default function IndexPage({ serverData }) {
  return (
    <Layout>
      <div className="flex py-8">
        <CommunitiesSidebar />
        <main className="flex w-[920px] flex-col gap-4 px-4 md:px-0">
          <FeedProvider serverData={serverData} />
        </main>
      </div>
    </Layout>
  )
}


export async function getServerSideProps({ params }) {
  console.log(params);
  const serverData = await getPostsRanked();
  return {
    props: { serverData }
  }
}
