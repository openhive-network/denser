import { getPosts } from "@/lib/utils"
import CommunitiesSidebar from "@/components/communities-sidebar"
import { Layout } from "@/components/layout"
import PostListItem from "@/components/post-list-item"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function PostsPage() {
  const data = getPosts()

  return (
    <Layout>
      <div className="flex mt-20">
        <CommunitiesSidebar />
        <main className="flex w-[920px] flex-col gap-4">
          <div className="flex justify-between">
            <div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                LeoFinance
              </h4>
              <span className="mt-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                Community
              </span>
            </div>
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
          </div>

          <div>
            {data.length === 0 ? (
              <p className="p-4">No posts yet</p>
            ) : (
              <ul>
                {data.map((post) => (
                  <li key={post.id}>
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
