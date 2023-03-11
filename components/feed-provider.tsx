"use client"

import { useState } from "react"
import { useRouter } from "next/router"
import { dehydrate, QueryClient, useQuery } from '@tanstack/react-query';

import { getPostsRanked2 } from "@/lib/bridge"
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

export default function FeedProvider() {
  const router = useRouter()
  const sort = typeof router.query?.sort === "string" ? router.query.sort : "hot"
  console.log('sort from router query', sort)
  const [filter, setFilter] = useState(sort)
  const { isLoading, error, data } = useQuery({
    queryKey: ["postsData", filter],
    queryFn: () => getPostsRanked2(filter),
  })

  function handleChangeFilter(e) {
    setFilter(e)
    router.push(`/${e}`, undefined, { shallow: true })
  }

  if (isLoading) return <p>Loading...</p>

  return (
    <>
      <div className="hidden justify-between md:flex">
        <div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-white">
            LeoFinance
          </h4>
          <span className="mt-2 text-xs font-normal text-slate-500 dark:text-slate-400">
            Community
          </span>
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

      <Feed data={data} />
    </>
  )
}

export async function getStaticProps(context) {
  const sort = context.params?.id as string
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery(["postsData", sort], () =>
    getPostsRanked2(sort)
  )

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}
