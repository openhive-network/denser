import { useEffect } from "react"
import { useRouter } from "next/router"
import { useGetCommunity } from "@/services/bridgeService"
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer"

import { getPostsRanked } from "@/lib/bridge";
import Feed from "@/components/feed"
import { Icons } from "@/components/icons"
import SelectFilter from "@/components/select-filter"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function FeedProvider({ feedData }) {
  const { ref, inView } = useInView()
  const router = useRouter()
  const sort = router.query?.param
    ? typeof router.query?.param[0] === "string"
      ? router.query.param[0]
      : "hot"
    : "hot"
  const tag = router.query?.param
    ? typeof router.query?.param[1] === "string"
      ? router.query.param[1]
      : ""
    : ""
  const {
    status,
    data,
    error,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch
  } = useInfiniteQuery(
    ["postsInfinite"],
    async ({ pageParam }) => {
      return await getPostsRanked(
          sort,
          tag,
          pageParam?.author,
          pageParam?.permlink
        )
    },
    {
      initialData: feedData,
      getNextPageParam: (lastPage) => {
        return {
          author:
            lastPage && lastPage.length > 0
              ? lastPage[lastPage?.length - 1].author
              : "",
          permlink:
            lastPage && lastPage.length > 0
              ? lastPage[lastPage?.length - 1].permlink
              : "",
        }
      },
    }
  )

  const {
    isLoading: isLoadingCommunity,
    error: errorCommunity,
    data: dataCommunity,
  } = useGetCommunity(tag, "hive.blog", tag)

  function handleChangeFilter(e) {
    router.push(`/${e}`, undefined, { shallow: true })
    refetch()
  }

  useEffect(() => {
    if (inView) {
      fetchNextPage()
    }
  }, [fetchNextPage, inView])

  return (
    <>
      <div className="hidden justify-between md:flex">
        <div>
          {tag === "" ? (
            <h4 className="text-base font-semibold text-slate-900 dark:text-white">
              All
            </h4>
          ) : (
            <>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                {dataCommunity?.title}
              </h4>
              <span className="mt-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                Community
              </span>
            </>
          )}
        </div>
        <div className="flex">
          <SelectFilter filter={sort} handleChangeFilter={handleChangeFilter} />

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

      {status === "loading" ? (
        <p>Loading... ⚡</p>
      ) : (
        <>
          {data.pages.map((page, index) => {
            return page ? <Feed data={page} key={`f-${index}`} /> : null
          })}
          <div>
            <button
              ref={ref}
              onClick={() => fetchNextPage()}
              disabled={!hasNextPage || isFetchingNextPage}
            >
              {isFetchingNextPage
                ? "Loading more..."
                : hasNextPage
                ? "Load Newer"
                : "Nothing more to load"}
            </button>
          </div>
          <div>
            {isFetching && !isFetchingNextPage
              ? "Background Updating..."
              : null}
          </div>
        </>
      )}
    </>
  )
}
