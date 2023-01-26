import CommunitiesSidebar from '@/components/communities-sidebar';
import { Icons } from '@/components/icons';
import { Layout } from '@/components/layout';
import PostListItem from '@/components/post-list-item';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPostsRanked } from '@/lib/bridge';

export default function PostsPage({ data }) {
  return (
    <Layout>
      <div className="flex mt-4 md:mt-20">
        <CommunitiesSidebar />
        <main className="flex w-[920px] flex-col gap-4 px-4 md:px-0">
          <div className="justify-between hidden md:flex">
            <div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                LeoFinance
              </h4>
              <span className="mt-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                Community
              </span>
            </div>
            <div className="flex">
              <Select defaultValue="hot">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="trending">Trending</SelectItem>
                    <SelectItem value="hot">Hot</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="payout">Payout</SelectItem>
                    <SelectItem value="muted">Muted</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select defaultValue="list">
                <SelectTrigger className="ml-4 w-16 border-0">
                  <SelectValue placeholder="Select a layout" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="list">
                      <Icons.layoutList className="h-5 w-5" />
                    </SelectItem>
                    <SelectItem value="grid">
                      <Icons.layoutGrid className="h-5 w-5" />
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:hidden">
            <Select defaultValue="viewAll">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="viewAll">View all</SelectItem>
                  <SelectItem value="leoFinance">LeoFinance</SelectItem>
                  <SelectItem value="photographyLovers">
                    Photography Lovers
                  </SelectItem>
                  <SelectItem value="pinmapple">Pinmapple</SelectItem>
                  <SelectItem value="splinterlands">Splinterlands</SelectItem>
                  <SelectItem value="more">
                    <Icons.moreHorizontal className="h-5 w-5" />
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select defaultValue="hot">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="trending">Trending</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="payout">Payout</SelectItem>
                  <SelectItem value="muted">Muted</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div>
            {data.length === 0 ? (
              <p className="p-4">No posts yet</p>
            ) : (
              <ul>
                {data.map((post) => (
                  <li key={post.author}>
                    <PostListItem post={post} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    </Layout>
  )
}

export async function getServerSideProps(context) {
  const data = await getPostsRanked()
  return {
    props: { data }, // will be passed to the page component as props
  }
}

